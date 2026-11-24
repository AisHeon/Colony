/** Local production-server proof: room create, join, start, correct + wrong verdict. */
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

type Jar = { cookie: string };
async function call(jar: Jar, path: string, init: RequestInit = {}) {
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
    body = text.slice(0, 300);
  }
  return { status: res.status, body };
}

const answers: Record<string, string> = {
  "Name a World War II battle.": "Leyte Gulf",
  "Name a World War II battle in Europe.": "Operation Market Garden",
  "Name a World War II battle in the Pacific.": "Kohima",
  "Name an ancient civilization.": "Mycenaean Greece",
  "Name a famous inventor.": "Cyrus McCormick",
  "Name a country whose borders changed in the 1900s.": "Finland",
  "Name a medieval kingdom.": "Genoa",
  "Name a revolution.": "Velvet Revolution",
  "Name a World War II leader.": "Harry S. Truman",
  "Name a Roman emperor.": "Theodosius",
  "Name an ancient Egyptian pharaoh.": "Nefertiti",
  "Name a US president.": "Barack Obama",
  "Name an event from the Cold War.": "Iran hostage crisis",
  "Name a famous treaty.": "Treaty of Rome",
  "Name a famous explorer.": "Vasco Núñez de Balboa",
  "Name a famous scientist.": "Chien-Shiung Wu",
  "Name a famous philosopher.": "John Stuart Mill",
  "Name a famous painter or artist.": "Sandro Botticelli",
  "Name a famous composer.": "John Williams",
  "Name a famous writer.": "J. R. R. Tolkien",
  "Name a famous battle before 1900.": "Battle of Jutland",
  "Name a famous military general.": "Bernard Montgomery",
  "Name a famous figure from ancient Greece.": "Ptolemy",
  "Name an ancient Greek city.": "Olympia",
  "Name a famous medieval figure.": "Suleiman the Magnificent",
  "Name a figure from the Renaissance or Reformation.": "William Shakespeare",
  "Name a figure from the French Revolution.": "Paul Barras",
  "Name a figure from the American Revolution.": "Abigail Adams",
  "Name a civil rights leader.": "Cesar Chavez",
  "Name a leader of an independence movement.": "Robert Mugabe",
  "Name a historical empire.": "Inca Empire",
  "Name a Chinese dynasty.": "Jin Dynasty",
  "Name a historical African kingdom or empire.": "Fatimid Caliphate",
  "Name a Mesoamerican civilization.": "Purépecha",
  "Name a South American independence leader.": "Manuela Sáenz",
  "Name a British monarch.": "Elizabeth II",
  "Name a famous woman ruler.": "Theodora",
  "Name a Russian or Soviet leader.": "Alexander Kerensky",
  "Name an Ottoman sultan.": "Abdul Hamid II",
  "Name a Byzantine emperor.": "Constantine XI",
  "Name a Mongol leader.": "Altan Khan",
  "Name a Japanese shogun.": "Tokugawa Yoshinobu",
  "Name a Korean dynasty or kingdom.": "Buyeo",
  "Name a historical Indian empire or kingdom.": "Ahom Kingdom",
  "Name a famous Norse or Viking figure.": "Freydis Eriksdottir",
  "Name a famous archaeologist.": "Gertrude Bell",
  "Name a famous historical disaster.": "Bhopal disaster",
  "Name an event from the Space Race.": "Launch of Laika",
  "Name a famous pandemic or epidemic.": "Ebola outbreak",
  "Name a famous historical document.": "Treaty of Westphalia",
};

const host: Jar = { cookie: "" };
const other: Jar = { cookie: "" };

const created = await call(host, "/api/rooms", {
  method: "POST",
  body: JSON.stringify({
    nickname: "Pip",
    settings: { mode: "anthill", rounds: 1, packs: ["world_history"] },
  }),
});
if (created.status !== 201) throw new Error(`create failed ${created.status} ${JSON.stringify(created.body)}`);
const code = created.body.roomCode;

const joined = await call(other, `/api/rooms/${code}/join`, {
  method: "POST",
  body: JSON.stringify({ code, nickname: "Bo" }),
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
const startedAt = Date.now();
while (Date.now() - startedAt < 15000) {
  const state = await call(host, `/api/rooms/${code}/state`);
  snapshot = state.body?.snapshot;
  if (snapshot?.round?.phase === "active") break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
if (snapshot?.round?.phase !== "active") throw new Error(`round did not activate: ${JSON.stringify(snapshot?.round)}`);

const prompt = snapshot.round.prompt.text as string;
const correct = answers[prompt];
const correctAck = await call(host, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({
    requestId: `answer-ok-${Date.now()}`,
    intent: { type: "answer:submit", text: correct ?? "zzzz", roundId: snapshot.round.id },
  }),
});
const wrongAck = await call(host, `/api/rooms/${code}/intent`, {
  method: "POST",
  body: JSON.stringify({
    requestId: `answer-bad-${Date.now()}`,
    intent: { type: "answer:submit", text: "definitely not a real answer", roundId: snapshot.round.id },
  }),
});
const finalState = await call(host, `/api/rooms/${code}/state`);
const mine = finalState.body?.snapshot?.round?.prompt?.myAnswers ?? [];

console.log(JSON.stringify({
  code,
  prompt,
  correct,
  correctAck: correctAck.body?.result,
  wrongAck: wrongAck.body?.result,
  myAnswers: mine,
  stream: "covered separately",
}, null, 2));
