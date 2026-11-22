/**
 * Records production evidence that one shared room is created, fetched, joined
 * and advanced by independent HTTPS requests.
 *
 * Usage: node --import tsx --conditions react-server scripts/live-proof.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { HOPPER_QUESTIONS } from "../content/catalog/hopper";

const BASE = process.env.COLONY_LIVE_URL ?? "https://colony-csw.vercel.app";
const ORIGIN = BASE;
const EVIDENCE = "evidence";

type Jar = Map<string, string>;
type CallResult = {
  label: string;
  status: number;
  vercelId: string | null;
  body: unknown;
};

await mkdir(EVIDENCE, { recursive: true });
const cookieHeader = (jar: Jar) => [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(
  label: string,
  path: string,
  options: { method?: string; body?: unknown; jar?: Jar } = {},
): Promise<CallResult> {
  const { method = "GET", body, jar } = options;
  const headers: Record<string, string> = { origin: ORIGIN, "user-agent": "colony-live-proof" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (jar && jar.size) headers.cookie = cookieHeader(jar);

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const value of setCookies) {
    const pair = value.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0 && jar) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  const result: CallResult = {
    label,
    status: response.status,
    vercelId: response.headers.get("x-vercel-id"),
    body: parsed,
  };
  await writeFile(`${EVIDENCE}/${label}.json`, JSON.stringify(result, null, 2));
  console.log(`${label.padEnd(24)} HTTP ${result.status}  instance ${result.vercelId ?? "?"}`);
  return result;
}

const bodyOf = (result: CallResult) => result.body as Record<string, any>;
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(`live proof failed: ${message}\n${JSON.stringify(result, null, 2)}`);
};
let result: CallResult;

const hostJar: Jar = new Map();
const guestJar: Jar = new Map();

console.log(`\nLive proof against ${BASE}\n`);

result = await call("01-create", "/api/rooms", {
  method: "POST",
  jar: hostJar,
  body: { nickname: "Ada", settings: { mode: "hopper", rounds: 1, hopperSeconds: 20 } },
});
assert(result.status === 200, "create returns 200");
const code = bodyOf(result).roomCode as string;
assert(/^[A-Z0-9]{6}$/.test(code), "six-character room code");
console.log(`room code: ${code}`);

result = await call("02-state-host", `/api/rooms/${code}/state`, { jar: hostJar });
assert(result.status === 200, "host can fetch the new room");
assert(bodyOf(result).snapshot?.members?.length === 1, "one member after create");

result = await call("03-join-guest", `/api/rooms/${code}/join`, {
  method: "POST",
  jar: guestJar,
  body: { code, nickname: "Bo" },
});
assert(result.status === 200, "second player joins");
assert(bodyOf(result).snapshot?.members?.length === 2, "two members after join");

result = await call("04-state-guest", `/api/rooms/${code}/state`, { jar: guestJar });
assert(result.status === 200, "guest fetches the same room");
assert(bodyOf(result).snapshot?.members?.length === 2, "guest sees both players");

const requestId = (suffix: string) => `proof_${Date.now()}_${suffix}`;
result = await call("05-ready-host", `/api/rooms/${code}/intent`, {
  method: "POST",
  jar: hostJar,
  body: { requestId: requestId("host_ready"), intent: { type: "room:ready", ready: true } },
});
assert(bodyOf(result).result?.ok === true, "host ready accepted");

result = await call("06-ready-guest", `/api/rooms/${code}/intent`, {
  method: "POST",
  jar: guestJar,
  body: { requestId: requestId("guest_ready"), intent: { type: "room:ready", ready: true } },
});
assert(bodyOf(result).result?.ok === true, "guest ready accepted");

result = await call("07-start", `/api/rooms/${code}/intent`, {
  method: "POST",
  jar: hostJar,
  body: { requestId: requestId("start"), intent: { type: "match:start" } },
});
assert(bodyOf(result).result?.ok === true, "host starts the match");

await sleep(4_200);
result = await call("08-active", `/api/rooms/${code}/state`, { jar: hostJar });
assert(result.status === 200, "active state fetched");
const round = bodyOf(result).snapshot?.round;
assert(round?.phase === "active", `round is active (saw ${round?.phase})`);
const promptText = round.prompt?.text as string;
const question = HOPPER_QUESTIONS.find((entry) => entry.text === promptText);
assert(question, `Hopper question "${promptText}" is in the audited catalog`);
const topAnswer = question.buckets[0].canonical;
console.log(`question: ${promptText}\nanswer:   ${topAnswer}`);

result = await call("09-answer-host", `/api/rooms/${code}/intent`, {
  method: "POST",
  jar: hostJar,
  body: { requestId: requestId("host_answer"), intent: { type: "answer:submit", text: topAnswer } },
});
assert(bodyOf(result).result?.ok === true, `host answer accepted (${bodyOf(result).result?.message})`);

result = await call("10-answer-guest", `/api/rooms/${code}/intent`, {
  method: "POST",
  jar: guestJar,
  body: { requestId: requestId("guest_answer"), intent: { type: "answer:submit", text: topAnswer } },
});
assert(bodyOf(result).result?.ok === true, `guest answer accepted (${bodyOf(result).result?.message})`);

await sleep(22_000);
result = await call("11-results", `/api/rooms/${code}/state`, { jar: guestJar });
assert(result.status === 200, "results state fetched");
const finished = bodyOf(result).snapshot?.round;
assert(finished?.phase === "results", `round settled (saw ${finished?.phase})`);
const placements = finished.results?.placements ?? [];
const points = placements.map((row: { memberId: string; matchPoints: number }) => row.matchPoints).sort((a: number, b: number) => b - a);
assert(points.length === 2 && points[0] === 900 && points[1] === 900, `both tied first with 900 (saw ${points.join(", ")})`);

const instances = new Set(
  (
    await Promise.all(
      ["01-create", "02-state-host", "03-join-guest", "04-state-guest", "08-active", "11-results"].map(async (name) => {
        const text = await import("node:fs/promises").then((fs) => fs.readFile(`${EVIDENCE}/${name}.json`, "utf8"));
        return JSON.parse(text).vercelId as string | null;
      }),
    )
  ).filter(Boolean),
);
console.log(`\nDistinct x-vercel-id values: ${instances.size} (${[...instances].join(", ")})`);
console.log(`Room ${code} created, joined, played and settled across independent requests.`);
process.exit(0);
