/**
 * Focused production proof for the launch flow:
 * health -> create -> second player joins -> both ready -> host starts ->
 * both answer -> round results -> final results.
 *
 * Usage: npx tsx scripts/live-flow-proof.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { Client as PgClient } from "pg";

const BASE = process.env.COLONY_LIVE_URL ?? "https://colony-csw.vercel.app";
const ORIGIN = BASE;
const DIR = "evidence/live-flow";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Jar = Map<string, string>;
type Json = Record<string, any>;

const requestLog: Array<Record<string, unknown>> = [];

class Client {
  jar: Jar = new Map();
  label: string;

  constructor(label: string) {
    this.label = label;
  }

  async call(path: string, options: { method?: string; body?: unknown; label?: string } = {}) {
    const { method = "GET", body, label = "request" } = options;
    const headers: Record<string, string> = { origin: ORIGIN, "user-agent": "colony-live-flow" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.jar.size) {
      headers.cookie = [...this.jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    }
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    for (const value of response.headers.getSetCookie?.() ?? []) {
      const pair = value.split(";")[0];
      const index = pair.indexOf("=");
      if (index > 0) this.jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep text */
    }
    const row = {
      label: `${this.label}-${label}`,
      method,
      path,
      status: response.status,
      vercelId: response.headers.get("x-vercel-id"),
      body: parsed,
    };
    requestLog.push(row);
    console.log(`${String(response.status).padEnd(4)} ${method.padEnd(4)} ${path} (${row.label})`);
    if (!response.ok) throw new Error(`${row.label} failed HTTP ${response.status}: ${text.slice(0, 800)}`);
    return parsed as Json;
  }

  state(code: string) {
    return this.call(`/api/rooms/${code}/state`, { label: "state" });
  }

  intent(code: string, intent: Record<string, unknown>, label = "intent") {
    return this.call(`/api/rooms/${code}/intent`, {
      method: "POST",
      label,
      body: {
        requestId: `live_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        intent,
      },
    });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`live flow failed: ${message}`);
}

async function waitFor<T>(
  label: string,
  fn: () => Promise<T | null>,
  timeoutMs = 45_000,
  intervalMs = 800,
): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

const health = await new Client("public").call("/api/health", { label: "health" });
assert(health.ok === true, "health is okay");
assert(health.persistence === "writable", "health reports writable persistence");
assert(health.database === "postgres", "health uses managed Postgres");

const host = new Client("host");
const guest = new Client("guest");

const created = await host.call("/api/rooms", {
  method: "POST",
  label: "create-room",
  body: {
    nickname: "Ada",
    settings: {
      mode: "anthill",
      rounds: 1,
      maxPlayers: 4,
      familyFriendly: true,
      packs: ["core"],
    },
  },
});
const code = String(created.roomCode ?? "");
assert(/^[A-Z0-9]{6}$/.test(code), "created room returned a six-character code");

const joined = await guest.call(`/api/rooms/${code}/join`, {
  method: "POST",
  label: "join-room",
  body: { code, nickname: "Bo" },
});
assert(joined.roomCode === code, "second player joined the same room");

const hostReady = await host.intent(code, { type: "room:ready", ready: true }, "ready-host");
const guestReady = await guest.intent(code, { type: "room:ready", ready: true }, "ready-guest");
assert(hostReady.result?.ok === true, "host ready");
assert(guestReady.result?.ok === true, "guest ready");

const lobby = await host.state(code);
assert(lobby.snapshot?.members?.length === 2, "lobby lists two connected players");
assert(
  lobby.snapshot.members.some((member: Json) => member.nickname === "Bo"),
  "second player appears in the lobby",
);

const started = await host.intent(code, { type: "match:start" }, "start-match");
assert(started.result?.ok === true, `host started the match: ${started.result?.message}`);

const active = await waitFor(
  "Anthill to start",
  async () => {
    const snapshot = (await host.state(code)).snapshot as Json;
    return snapshot.round?.phase === "active" ? snapshot : null;
  },
  20_000,
);

const promptText = String(active.round.prompt.text ?? "");
assert(promptText, "active round has a prompt");

const databaseUrl = JSON.parse(
  await (await import("node:fs/promises")).readFile("/tmp/colony-prisma-db.json", "utf8"),
).connectionString as string;
const pg = new PgClient({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await pg.connect();
let promptId = "";
let answers: string[] = [];
try {
  const prompt = await pg.query(
    "select id from prompt where text = $1 and kind = 'anthill' order by id limit 1",
    [promptText],
  );
  promptId = String(prompt.rows[0]?.id ?? "");
  assert(promptId, `prompt is in the database: ${promptText}`);
  const result = await pg.query(
    `select e.canonical_name
       from prompt_answer pa
       join entity e on e.id = pa.entity_id
      where pa.prompt_id = $1
      order by e.canonical_name
      limit 2`,
    [promptId],
  );
  answers = result.rows.map((row) => String(row.canonical_name));
} finally {
  await pg.end().catch(() => undefined);
}
assert(answers.length === 2, `found two accepted answers for ${promptId}`);

const hostAnswer = await host.intent(
  code,
  { type: "answer:submit", text: answers[0], roundId: active.round.id },
  "answer-host",
);
const guestAnswer = await guest.intent(
  code,
  { type: "answer:submit", text: answers[1], roundId: active.round.id },
  "answer-guest",
);
assert(hostAnswer.result?.ok === true, `host answer accepted: ${hostAnswer.result?.message}`);
assert(guestAnswer.result?.ok === true, `guest answer accepted: ${guestAnswer.result?.message}`);

const results = await waitFor(
  "round results",
  async () => {
    const snapshot = (await guest.state(code)).snapshot as Json;
    return snapshot.round?.phase === "results" ? snapshot : null;
  },
  45_000,
);

const final = await waitFor(
  "final results",
  async () => {
    const snapshot = (await guest.state(code)).snapshot as Json;
    return snapshot.match?.status === "ended" ? snapshot : null;
  },
  30_000,
);

await mkdir(DIR, { recursive: true });
const summary = {
  base: BASE,
  roomCode: code,
  prompt: { id: promptId, text: promptText },
  answers,
  requests: requestLog.map(({ body, ...row }) => row),
  lobby: {
    roomCode: code,
    members: lobby.snapshot.members.map((member: Json) => ({
      nickname: member.nickname,
      connected: member.connected,
      ready: member.ready,
      isHost: member.isHost,
    })),
  },
  roundResults: {
    phase: results.round.phase,
    podium: results.round.results?.podium,
    points: results.match?.points,
  },
  finalResults: {
    status: final.match?.status,
    points: final.match?.points,
    rounds: final.match?.roundSummaries,
  },
  finishedAt: new Date().toISOString(),
};
await writeFile(`${DIR}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nLIVE FLOW PASSED: room ${code}, prompt ${promptText}, answers ${answers.join(" / ")}`);
console.log(`Round results phase=${results.round.phase}; final status=${final.match?.status}`);
