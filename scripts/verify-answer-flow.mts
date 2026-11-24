/**
 * Verifies the fast answer path end to end: verdicts, shared-answer halving,
 * duplicate handling, the SSE snapshot cadence and the server-rendered room.
 */
import { HISTORY_GROUPS, HISTORY_PROMPTS } from "../content/catalog/history";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

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
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body, ms: Math.round(performance.now() - startedAt), text };
}

function answersFor(promptText: string): string[] {
  const prompt = HISTORY_PROMPTS.find((entry) => entry.text === promptText);
  if (!prompt) return [];
  const group = (HISTORY_GROUPS as Record<string, { answers: string[] }>)[prompt.group];
  return (group?.answers ?? []).slice(0, 3).map((raw) => raw.split("|")[0]);
}

const host: Jar = { cookie: "" };
const second: Jar = { cookie: "" };

const created = await call(host, "/api/rooms", {
  method: "POST",
  body: JSON.stringify({ nickname: "Flow", settings: { mode: "anthill", rounds: 1, packs: ["world_history"] } }),
});
if (created.status !== 201) throw new Error(`create failed ${created.status} ${JSON.stringify(created.body)}`);
const code = created.body.roomCode as string;

await call(second, `/api/rooms/${code}/join`, {
  method: "POST",
  body: JSON.stringify({ code, nickname: "Second" }),
});
await call(second, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({ requestId: `ready-${Date.now()}`, intent: { type: "room:ready", ready: true } }),
});
const start = await call(host, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({ requestId: `start-${Date.now()}`, intent: { type: "match:start" } }),
});
if (start.status !== 200) throw new Error(`start failed ${JSON.stringify(start.body)}`);

let snapshot: any = null;
const startedAt = Date.now();
while (Date.now() - startedAt < 15000) {
  const state = await call(host, `/api/rooms/${code}/state`);
  snapshot = state.body?.snapshot;
  if (snapshot?.round?.phase === "active") break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (snapshot?.round?.phase !== "active") throw new Error(`round inactive: ${JSON.stringify(snapshot?.round)}`);

const promptText = String(snapshot.round.prompt.text);
const [answer, spare] = answersFor(promptText);
if (!answer || !spare) throw new Error(`no catalog answers for prompt: ${promptText}`);

const submit = (jar: Jar, text: string, tag: string) =>
  call(jar, `/api/rooms/${code}/intent`, {
    method: "POST",
    body: JSON.stringify({
      requestId: `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      intent: { type: "answer:submit", text, roundId: snapshot.round.id },
    }),
  });

const firstAck = await submit(host, answer, "first");
const secondAck = await submit(second, answer, "second");
const duplicate = await submit(host, answer, "dupe");
const wrong = await submit(host, "definitely not a real answer", "wrong");

// Server-rendered room: the HTML must already contain the room, not a spinner.
const page = await fetch(`${base}/room/${code}`, { headers: { cookie: host.cookie } });
const html = await page.text();

// The stream must stay quiet while nothing changes, then push after an answer.
const streamRes = await fetch(`${base}/api/rooms/${code}/stream`, {
  headers: { cookie: host.cookie, accept: "text/event-stream" },
});
const reader = streamRes.body!.getReader();
const decoder = new TextDecoder();
const frames: Array<{ at: number; event: string; data: string }> = [];
let buffer = "";
let stop = false;
const collector = (async () => {
  while (!stop) {
    const chunk = await reader.read().catch(() => ({ value: undefined, done: true as const }));
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let index = buffer.indexOf("\n\n");
    while (index >= 0) {
      const raw = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      frames.push({
        at: Date.now(),
        event: /^event: (.+)$/m.exec(raw)?.[1] ?? "message",
        data: /^data: (.*)$/m.exec(raw)?.[1] ?? "",
      });
      index = buffer.indexOf("\n\n");
    }
  }
})();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(2500);
const idleSnapshots = frames.filter((frame) => frame.event === "snapshot").length;
const idleFrames = frames.length;
const pushAt = Date.now();
const pushAck = await submit(host, spare, "stream");
await sleep(2600);
const pushed = frames.filter((frame) => frame.at >= pushAt && frame.event === "snapshot");
let pushedAnswers = 0;
for (const frame of pushed) {
  try {
    pushedAnswers = JSON.parse(frame.data).snapshot?.round?.prompt?.myAnswers?.length ?? 0;
  } catch {
    /* ignore */
  }
}
stop = true;
await reader.cancel().catch(() => undefined);
await collector.catch(() => undefined);

console.log(
  JSON.stringify(
    {
      code,
      prompt: promptText,
      answer,
      first: { code: firstAck.body?.result?.code, details: firstAck.body?.result?.details, ms: firstAck.ms },
      second: { code: secondAck.body?.result?.code, details: secondAck.body?.result?.details, ms: secondAck.ms },
      duplicate: { code: duplicate.body?.result?.code, message: duplicate.body?.result?.message },
      wrong: { code: wrong.body?.result?.code, message: wrong.body?.result?.message },
      ackHasSnapshot: {
        first: firstAck.body?.snapshot !== null,
        wrong: wrong.body?.snapshot !== null,
      },
      ssrRoom: {
        status: page.status,
        hasRoomCode: html.includes(code),
        hasConnecting: html.includes("Connecting…"),
        hasLobbyWord: /Anthill|Get ready|players?|Take a seat/.test(html),
      },
      stream: {
        idleSnapshots,
        idleFrames,
        pushVerdict: pushAck.body?.result?.code,
        events: frames.map((frame) => frame.event),
        pushedSnapshots: pushed.length,
        pushedAnswers,
      },
    },
    null,
    2,
  ),
);
