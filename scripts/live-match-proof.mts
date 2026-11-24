/**
 * Plays real matches against the deployed site. Two independent guest cookie
 * jars create, join, ready, start, answer, reveal and finish a 4-round Party
 * match (all four modes) plus a guaranteed niche Anthill match.
 *
 * Usage: npx tsx scripts/live-match-proof.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { PROMPTS } from "../content/catalog/prompts";
import { ENTITY_SEEDS } from "../content/catalog/entities";
import { COUNTRIES } from "../content/catalog/countries";
import { HOPPER_QUESTIONS } from "../content/catalog/hopper";
import { GRAPH_ENTITIES, GRAPH_EDGES, PUZZLES } from "../content/catalog/graph";

const BASE = process.env.COLONY_LIVE_URL ?? "https://colony-csw.vercel.app";
const ORIGIN = BASE;
const DIR = "evidence/live-match";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

await mkdir(DIR, { recursive: true });
let sequence = 0;
const evidence: Array<Record<string, unknown>> = [];

type Jar = Map<string, string>;
type Json = Record<string, any>;

class Client {
  jar: Jar = new Map();
  label: string;

  constructor(label: string) {
    this.label = label;
  }

  async call(path: string, options: { method?: string; body?: unknown; label?: string } = {}) {
    const { method = "GET", body, label = "request" } = options;
    const headers: Record<string, string> = { origin: ORIGIN, "user-agent": "colony-live-match" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.jar.size) headers.cookie = [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
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
      label: `${String(++sequence).padStart(2, "0")}-${this.label}-${label}`,
      status: response.status,
      vercelId: response.headers.get("x-vercel-id"),
      body: parsed,
    };
    await writeFile(`${DIR}/${row.label}.json`, JSON.stringify(row, null, 2));
    evidence.push(row);
    if (!response.ok) throw new Error(`${row.label} failed HTTP ${response.status}: ${text.slice(0, 500)}`);
    return parsed as Json;
  }

  state(code: string) {
    return this.call(`/api/rooms/${code}/state`, { label: "state" });
  }

  intent(code: string, intent: Record<string, unknown>, label = "intent") {
    return this.call(`/api/rooms/${code}/intent`, {
      method: "POST",
      label,
      body: { requestId: `live_${Date.now()}_${Math.random().toString(36).slice(2)}`, intent },
    });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`live match failed: ${message}`);
}

const countryEntities = COUNTRIES.map(([name, capital, continent, landlocked]) => ({
  name,
  capital,
  continent,
  landlocked,
}));

function promptPool(prompt: (typeof PROMPTS)[number]) {
  let values: string[] = [];
  if (prompt.type === "country") {
    values = countryEntities
      .filter((country) => !prompt.attrs?.continent || country.continent === prompt.attrs.continent)
      .filter((country) => prompt.attrs?.landlocked === undefined || String(country.landlocked) === prompt.attrs.landlocked)
      .map((country) => country.name);
  } else if (prompt.type === "capital") {
    values = countryEntities
      .filter((country) => !prompt.attrs?.continent || country.continent === prompt.attrs.continent)
      .filter((country) => prompt.attrs?.landlocked === undefined || String(country.landlocked) === prompt.attrs.landlocked)
      .map((country) => country.capital);
  } else {
    values = ENTITY_SEEDS.filter(
      (entity) =>
        entity.type === prompt.type &&
        (!prompt.initial || entity.name.startsWith(prompt.initial)) &&
        Object.entries(prompt.attrs ?? {}).every(([key, value]) => entity.attrs[key] === value),
    ).map((entity) => entity.name);
  }
  return [...new Set(values)];
}

function promptByText(text: string) {
  return PROMPTS.find((prompt) => prompt.text === text) ?? null;
}

function hopperByText(text: string) {
  return HOPPER_QUESTIONS.find((question) => question.text === text) ?? null;
}

const nameById = new Map<string, string>();
for (const entity of GRAPH_ENTITIES) nameById.set(entity.id, entity.name);
for (const entity of ENTITY_SEEDS) nameById.set(entity.id, entity.name);
for (const [name, capital] of COUNTRIES) {
  nameById.set(`country_${slug(name)}`, name);
  nameById.set(`capital_${slug(capital)}`, capital);
}

const adjacency = new Map<string, string[]>();
for (const edge of GRAPH_EDGES) {
  adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  if (edge.inverse) adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
}

function pathFor(start: string, target: string): string[] | null {
  const queue: string[][] = [[start]];
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === target) return path;
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

const spiderPaths = new Map<string, { nodes: string[]; names: string[] }>();
for (const puzzle of PUZZLES) {
  const start = nameById.get(puzzle.start);
  const target = nameById.get(puzzle.target);
  const path = pathFor(puzzle.start, puzzle.target);
  if (start && target && path) {
    spiderPaths.set(`${start}|${target}`, {
      nodes: path,
      names: path.map((id) => nameById.get(id) ?? id),
    });
  }
}

function nichePromptTexts() {
  const ids = new Set(
    PROMPTS.filter((prompt) =>
      /^(anthill\.(country_|capital_|dinosaur|greek_figure|flower|tree|gemstone|game_console|shakespeare_play|bone|moon|volcano|river|mountain|sea|currency))/.test(
        prompt.id,
      ),
    ).map((prompt) => prompt.id),
  );
  return new Set(PROMPTS.filter((prompt) => ids.has(prompt.id)).map((prompt) => prompt.text));
}

async function waitFor<T>(
  label: string,
  fn: () => Promise<T | null>,
  timeoutMs = 45_000,
  intervalMs = 700,
): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function createJoinReady(mode: "party" | "anthill", rounds: number, suffix: string) {
  const host = new Client(`host-${suffix}`);
  const guest = new Client(`guest-${suffix}`);
  const created = await host.call("/api/rooms", {
    method: "POST",
    label: "create",
    body: {
      nickname: "Ada",
      settings: {
        mode,
        rounds,
        maxPlayers: 4,
        familyFriendly: true,
        packs: ["core"],
        hopperSeconds: 15,
        spiderSeconds: 60,
      },
    },
  });
  const code = created.roomCode as string;
  assert(/^[A-Z0-9]{6}$/.test(code), "six-character room code");
  await guest.call(`/api/rooms/${code}/join`, {
    method: "POST",
    label: "join",
    body: { code, nickname: "Bo" },
  });
  const hostReady = await host.intent(code, { type: "room:ready", ready: true }, "ready-host");
  const guestReady = await guest.intent(code, { type: "room:ready", ready: true }, "ready-guest");
  assert(hostReady.result?.ok === true && guestReady.result?.ok === true, "both players ready");
  const started = await host.intent(code, { type: "match:start" }, "start");
  assert(started.result?.ok === true, "match started");
  return { host, guest, code };
}

async function currentSnapshot(client: Client, code: string) {
  const body = await client.state(code);
  return body.snapshot as Json;
}

async function advanceResults(host: Client, code: string, roundId: string, label: string) {
  await sleep(3300);
  const ack = await host.intent(code, { type: "match:advance" }, label);
  assert(ack.result?.ok === true, `advance results (${ack.result?.message})`);
}

const summary: Record<string, unknown> = {
  base: BASE,
  startedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Full Party match: four rounds, all four modes.
// ---------------------------------------------------------------------------
console.log(`\nParty match against ${BASE}`);
const party = await createJoinReady("party", 4, "party");
summary.partyRoom = party.code;
const partyRounds: Array<Record<string, unknown>> = [];
const partySubmissions: Array<Record<string, unknown>> = [];
let partyPromptIds: string[] = [];
let partyHopperId: string | null = null;
let handledRound = "";
let beehiveSubmissionRound = "";
let voted = false;
let finalParty: Json | null = null;

const partyStarted = Date.now();
while (Date.now() - partyStarted < 240_000) {
  const snapshot = await currentSnapshot(party.host, party.code);
  if (snapshot.match?.status === "ended") {
    finalParty = snapshot;
    break;
  }
  if (snapshot.match?.status === "voting") {
    if (!voted && snapshot.match.vote?.open) {
      await party.host.intent(party.code, { type: "party:voteFavorite", mode: "hopper" }, "vote-host");
      await party.guest.intent(party.code, { type: "party:voteFavorite", mode: "hopper" }, "vote-guest");
      voted = true;
    }
    await sleep(1000);
    continue;
  }
  const round = snapshot.round as Json | null;
  if (!round) {
    await sleep(700);
    continue;
  }
  if (round.phase === "countdown") {
    await sleep(700);
    continue;
  }
  if (round.phase === "results") {
    if (!partyRounds.some((entry) => entry.roundId === round.id)) {
      partyRounds.push({
        roundId: round.id,
        index: round.index,
        mode: round.mode,
        prompt: round.prompt?.text,
        message: round.results?.podium,
        points: snapshot.match?.points,
      });
    }
    if (round.id !== handledRound) {
      handledRound = round.id;
      await advanceResults(party.host, party.code, round.id, "advance-party");
    }
    await sleep(700);
    continue;
  }
  if (round.phase !== "active" || round.id === handledRound) {
    await sleep(700);
    continue;
  }

  const promptText = String(round.prompt?.text ?? "");
  const prompt = promptByText(promptText);
  if (round.mode === "anthill") {
    handledRound = round.id;
    const pool = prompt ? promptPool(prompt) : [];
    if (prompt) partyPromptIds.push(prompt.id);
    assert(pool.length >= 8, `Anthill pool for ${promptText} is deep enough (${pool.length})`);
    const picks: string[] = [];
    for (const answer of pool) {
      if (picks.length >= 7) break;
      const ack = await party.host.intent(
        party.code,
        { type: "answer:submit", text: answer, roundId: round.id },
        "anthill-host",
      );
      partySubmissions.push({ round: round.index, mode: round.mode, who: "host", answer, result: ack.result });
      if (ack.result?.ok === true) picks.push(answer);
      if (ack.result?.code === "RATE_LIMITED") await sleep(3_000);
      else await sleep(130);
    }
    assert(picks.length >= 7, `found seven accepted Anthill answers for ${promptText} (${picks.length})`);
    for (const answer of picks) {
      const ack = await party.guest.intent(
        party.code,
        { type: "answer:submit", text: answer, roundId: round.id },
        "anthill-guest",
      );
      partySubmissions.push({ round: round.index, mode: round.mode, who: "guest", answer, result: ack.result });
      assert(ack.result?.ok === true, `Anthill accepted ${answer} from guest: ${ack.result?.message}`);
      await sleep(130);
    }
    console.log(`  Anthill: ${promptText} (${prompt?.id ?? "unknown"}), ${pool.length} answers available`);
  } else if (round.mode === "beehive") {
    const active = round.beehive?.activeMemberId as string | null;
    const myMember = (snapshot.you as Json).memberId as string;
    if (active && beehiveSubmissionRound !== round.id) {
      beehiveSubmissionRound = round.id;
      const activeClient = active === myMember ? party.host : party.guest;
      const who = active === myMember ? "host" : "guest";
      const pool = prompt ? promptPool(prompt) : [];
      const answer = pool[0];
      assert(answer, `Beehive has an answer for ${promptText}`);
      const ack = await activeClient.intent(
        party.code,
        { type: "answer:submit", text: answer, roundId: round.id, turnId: round.beehive?.turnId },
        `beehive-${who}`,
      );
      partySubmissions.push({ round: round.index, mode: round.mode, who, answer, result: ack.result });
      assert(ack.result?.ok === true, `Beehive accepted ${answer}: ${ack.result?.message}`);
      console.log(`  Beehive: ${promptText}; ${who} answered ${answer}; waiting for the other turn to time out`);
    }
    await sleep(900);
  } else if (round.mode === "hopper") {
    handledRound = round.id;
    const question = hopperByText(promptText);
    assert(question, `Hopper question is in the expanded catalog: ${promptText}`);
    partyHopperId = question.id;
    const top = question.buckets[0].canonical;
    for (const [who, client] of [
      ["host", party.host],
      ["guest", party.guest],
    ] as const) {
      const ack = await client.intent(
        party.code,
        { type: "answer:submit", text: top, roundId: round.id },
        `hopper-${who}`,
      );
      partySubmissions.push({ round: round.index, mode: round.mode, who, answer: top, result: ack.result });
      assert(ack.result?.ok === true, `Hopper accepted ${top} from ${who}: ${ack.result?.message}`);
    }
    console.log(`  Hopper: ${promptText} (${question.id}), top answer ${top}`);
    await sleep(1000);
  } else if (round.mode === "spider") {
    handledRound = round.id;
    const start = round.spider?.start?.name as string;
    const target = round.spider?.target?.name as string;
    const path = spiderPaths.get(`${start}|${target}`);
    assert(path, `known Spider route for ${start} -> ${target}`);
    for (const [who, client] of [
      ["host", party.host],
      ["guest", party.guest],
    ] as const) {
      const ack = await client.intent(party.code, { type: "spider:draft", nodes: path.nodes }, `spider-${who}`);
      partySubmissions.push({ round: round.index, mode: round.mode, who, path: path.names, result: ack.result });
      assert(ack.result?.ok === true, `Spider path accepted for ${who}: ${ack.result?.message}`);
    }
    console.log(`  Spider: ${start} -> ${target} via ${path.names.join(" -> ")}`);
    await sleep(1000);
  }
}

assert(finalParty, "Party match reached final results");
assert(finalParty.match?.status === "ended", "Party match status is ended");
assert((finalParty.match?.roundSummaries?.length ?? 0) === 4, "four Party rounds were finalized");
assert((finalParty.match?.points && Object.keys(finalParty.match.points).length) >= 2, "both players scored");
const partyPoints = Object.values(finalParty.match!.points as Record<string, number>).sort((a, b) => b - a);
assert(partyPoints[0]! > 0, "Party match produced positive scores");
summary.party = {
  room: party.code,
  rounds: partyRounds,
  promptIds: partyPromptIds,
  hopperId: partyHopperId,
  submissions: partySubmissions,
  final: {
    status: finalParty.match?.status,
    points: finalParty.match?.points,
    roundSummaries: finalParty.match?.roundSummaries,
    vote: finalParty.match?.vote,
  },
  instances: [...new Set(evidence.map((row) => row.vercelId).filter(Boolean))],
};
await writeFile(`${DIR}/party-summary.json`, JSON.stringify(summary.party, null, 2));
console.log(`\nParty room ${party.code} finished with points ${partyPoints.join(" / ")}`);

// ---------------------------------------------------------------------------
// Guaranteed niche Anthill match: create rooms until the live prompt is new.
// ---------------------------------------------------------------------------
console.log(`\nNiche Anthill match against ${BASE}`);
const nicheTexts = nichePromptTexts();
let niche: Json | null = null;
for (let attempt = 1; attempt <= 12 && !niche; attempt += 1) {
  const run = await createJoinReady("anthill", 1, `niche-${attempt}`);
  const snapshot = await waitFor(
    "niche Anthill round",
    async () => {
      const current = await currentSnapshot(run.host, run.code);
      return current.round?.phase === "active" ? current : null;
    },
    10_000,
  );
  const text = String(snapshot.round.prompt.text ?? "");
  const prompt = promptByText(text);
  console.log(`  attempt ${attempt}: ${text} (${prompt?.id ?? "unknown"})`);
  if (!prompt || !nicheTexts.has(text)) {
    continue;
  }
  const pool = promptPool(prompt);
  assert(pool.length >= 8, `${prompt.id} has a deep pool (${pool.length})`);
  const picks: string[] = [];
  for (const answer of pool) {
    if (picks.length >= 8) break;
    const ack = await run.host.intent(
      run.code,
      { type: "answer:submit", text: answer, roundId: snapshot.round.id },
      "niche-host",
    );
    if (ack.result?.ok === true) picks.push(answer);
    if (ack.result?.code === "RATE_LIMITED") await sleep(3_000);
    else await sleep(130);
  }
  assert(picks.length >= 8, `found eight accepted niche answers for ${prompt.id} (${picks.length})`);
  for (const answer of picks) {
    const ack = await run.guest.intent(
      run.code,
      { type: "answer:submit", text: answer, roundId: snapshot.round.id },
      "niche-guest",
    );
    assert(ack.result?.ok === true, `niche Anthill accepted ${answer}: ${ack.result?.message}`);
    await sleep(130);
  }
  const final = await waitFor(
    "niche Anthill final",
    async () => {
      const current = await currentSnapshot(run.host, run.code);
      return current.match?.status === "ended" ? current : null;
    },
    45_000,
  );
  niche = {
    attempt,
    room: run.code,
    prompt: prompt.id,
    text,
    poolSize: pool.length,
    accepted: final.round?.anthill?.revealed?.flatMap((entry: Json) => entry.answers?.map((answer: Json) => answer.name) ?? []) ?? [],
    points: final.match?.points,
    summary: final.match?.roundSummaries,
  };
  console.log(`  niche match ${run.code}: ${text}, pool ${pool.length}, points ${Object.values(final.match.points).join(" / ")}`);
}

assert(niche, "a new niche Anthill prompt was played on the live site");
summary.niche = niche;
summary.finishedAt = new Date().toISOString();
await writeFile(`${DIR}/live-match-summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nLive proof complete. Evidence in ${DIR}/`);
