/**
 * Latency probe for the answer path: creates a throwaway Anthill room, starts
 * it, then times state reads and answer submissions against BASE_URL.
 */
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const rounds = Number(process.env.ROUNDS ?? 6);

type Jar = { cookie: string };
async function call(jar: Jar, path: string, init: RequestInit = {}) {
  const startedAt = performance.now();
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) jar.cookie = setCookie.split(";")[0];
  const text = await res.text();
  const ms = Math.round(performance.now() - startedAt);
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body, ms, timing: res.headers.get("server-timing") };
}

const host: Jar = { cookie: "" };
const other: Jar = { cookie: "" };

const created = await call(host, "/api/rooms", {
  method: "POST",
  body: JSON.stringify({
    nickname: "Probe",
    settings: { mode: "anthill", rounds: 1, packs: ["all"] },
  }),
});
if (created.status !== 201) throw new Error(`create failed ${created.status} ${JSON.stringify(created.body)}`);
const code = created.body.roomCode as string;

const joined = await call(other, `/api/rooms/${code}/join`, {
  method: "POST",
  body: JSON.stringify({ code, nickname: "Second" }),
});
if (joined.status !== 200) throw new Error(`join failed ${joined.status} ${JSON.stringify(joined.body)}`);
await call(other, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({ requestId: `ready-${Date.now()}`, intent: { type: "room:ready", ready: true } }),
});

const start = await call(host, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({ requestId: `start-${Date.now()}`, intent: { type: "match:start" } }),
});
if (start.status !== 200) throw new Error(`start failed ${start.status} ${JSON.stringify(start.body)}`);

let snapshot: any = null;
const stateTimes: number[] = [];
const startedAt = Date.now();
while (Date.now() - startedAt < 15000) {
  const state = await call(host, `/api/rooms/${code}/state`);
  stateTimes.push(state.ms);
  snapshot = state.body?.snapshot;
  if (snapshot?.round?.phase === "active") break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
if (snapshot?.round?.phase !== "active") throw new Error(`round did not activate: ${JSON.stringify(snapshot?.round)}`);

const prompt = String(snapshot.round.prompt.text ?? "");
const answers = [
  "zzzz not an answer",
  "Leyte Gulf",
  "Barack Obama",
  "a made up thing entirely",
  "Battle of Jutland",
  "William Shakespeare",
];

const submitTimes: Array<{
  text: string;
  ms: number;
  status: number;
  verdict: string;
  snapshot: boolean;
  timing: string | null;
}> = [];
for (let i = 0; i < rounds; i += 1) {
  const text = answers[i % answers.length];
  const res = await call(host, `/api/rooms/${code}/intent`, {
    method: "POST",
    body: JSON.stringify({
      requestId: `perf-${i}-${Date.now()}`,
      intent: { type: "answer:submit", text, roundId: snapshot.round.id },
    }),
  });
  submitTimes.push({
    text,
    ms: res.ms,
    status: res.status,
    verdict: String(res.body?.result?.code ?? res.body?.error?.code ?? "?"),
    snapshot: Boolean(res.body?.snapshot),
    timing: res.timing,
  });
}

const times = submitTimes.map((entry) => entry.ms).sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)];
console.log(
  JSON.stringify(
    {
      base,
      code,
      prompt,
      stateMs: stateTimes.map((ms) => ms),
      submitMs: submitTimes,
      medianSubmitMs: median,
      maxSubmitMs: times[times.length - 1],
    },
    null,
    2,
  ),
);
