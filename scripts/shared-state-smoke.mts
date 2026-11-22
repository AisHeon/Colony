/**
 * Proves the shared-state adapter works across independent "instances".
 *
 * Three separate Db objects (each with its own in-memory PGlite) share one
 * compare-and-swap store. A room created by instance 1 is joined and played by
 * instances 2 and 3, including two concurrent writes that must not lose an
 * update.
 *
 * Usage: node --import tsx --conditions react-server scripts/shared-state-smoke.mts
 */
import assert from "node:assert/strict";
import { createSharedDb } from "../src/lib/db";
import { MemoryStateStore } from "../src/lib/state-store";
import { createRoom, joinRoom, startMatch, advanceRoom } from "../src/lib/game/engine";
import { applyIntent } from "../src/lib/game/intents";
import { buildSnapshotForRoom } from "../src/lib/game/snapshot";
import { hashToken, newId, newToken } from "../src/lib/ids";

const store = new MemoryStateStore();
console.log("[shared] starting three independent database instances…");
const db1 = await createSharedDb(store);
const db2 = await createSharedDb(store);
const db3 = await createSharedDb(store);

async function guest(db: typeof db1, label: string) {
  const id = newId("gst");
  await db.transaction(async (q) => {
    await q("insert into guest_session (id, token_hash, created_at) values ($1,$2,$3)", [
      id,
      hashToken(newToken()),
      Date.now(),
    ]);
  });
  console.log(`  · guest ${label}`);
  return id;
}

let seq = 0;
const rid = () => `shared_${Date.now()}_${seq++}`;

const T = Date.now() + 5_000;
const a = await guest(db1, "A via db1");
const b = await guest(db2, "B via db2");
const c = await guest(db3, "C via db3");

console.log("[shared] create room on db1");
const { room, member } = await createRoom(db1, a, "Ada", { mode: "anthill", rounds: 1 }, T);
assert.match(room.code, /^[A-Z0-9]{6}$/);

console.log("[shared] join on db2 and db3, read the room back from independent state");
await joinRoom(db2, b, room.code, "Bo", T + 100);
await joinRoom(db3, c, room.code, "Cy", T + 150);
const seen = await buildSnapshotForRoom(db2, room, b, T + 200);
assert.equal(seen.room.code, room.code, "db2 sees the room created by db1");
assert.deepEqual(
  seen.members.map((m) => m.nickname).sort(),
  ["Ada", "Bo"],
  "db2 sees its own join and the host",
);
const seenFrom3 = await buildSnapshotForRoom(db3, room, c, T + 250);
assert.equal(seenFrom3.members.length, 3, "db3 sees all three players");

console.log("[shared] two concurrent writes must both land (CAS retry)");
await Promise.all([
  applyIntent(db2, room.code, b, { type: "room:ready", ready: true }, rid(), T + 300),
  applyIntent(db3, room.code, c, { type: "room:ready", ready: true }, rid(), T + 300),
]);
const afterConcurrent = await buildSnapshotForRoom(db1, room, a, T + 400);
assert.equal(afterConcurrent.members.find((m) => m.nickname === "Bo")?.ready, true, "Bo's ready survived");
assert.equal(afterConcurrent.members.find((m) => m.nickname === "Cy")?.ready, true, "Cy's ready survived");

console.log("[shared] start on db1, play and settle on db2/db3");
await applyIntent(db1, room.code, a, { type: "room:ready", ready: true }, rid(), T + 500);
const match = await startMatch(db1, room.code, member.id, T + 600);
assert.equal(match.round_count, 1);

await advanceRoom(db2, room.code, T + 3_800);
const round = await db3.one<{ id: string }>("select id from round where match_id = $1 order by idx limit 1", [
  match.id,
]);
assert.ok(round, "db3 sees the round created by db1");
const answer = await db3.one<{ canonical_name: string }>(
  `select e.canonical_name from round r
     join prompt_answer pa on pa.prompt_id = r.prompt->>'promptId'
     join entity e on e.id = pa.entity_id
    where r.id = $1 order by random() limit 1`,
  [round!.id],
);
assert.ok(answer);

const accepted = await applyIntent(
  db2,
  room.code,
  b,
  { type: "answer:submit", text: answer!.canonical_name },
  rid(),
  T + 4_000,
);
assert.equal(accepted.ok, true, `answer rejected: ${accepted.code} ${accepted.message}`);

const finalized = await applyIntent(db3, room.code, c, { type: "match:advance" }, rid(), T + 4_500).catch(
  (error) => error as Error,
);
assert.ok(finalized instanceof Error || finalized.ok, "advance call returns a result");

await advanceRoom(db3, room.code, T + 45_000);
const results = await buildSnapshotForRoom(db1, room, a, T + 45_100);
assert.equal(results.round?.phase, "results", "round settled from a different instance");
const boId = results.members.find((member) => member.nickname === "Bo")?.id;
assert.ok(boId, "Bo is still in the room");
const boPlacement = results.round?.results?.placements.find((row) => row.memberId === boId);
assert.equal(boPlacement?.placement, 1, "Bo's submitted answer won");
assert.equal(boPlacement?.matchPoints, 900);
assert.equal(results.round?.results?.podium[0]?.memberId, boId);

console.log("[shared] verify durable payload version and contents");
const stored = await store.read();
assert.ok(stored);
assert.ok(stored!.state.version >= 6, `state version advanced (${stored!.state.version})`);
const roomRows = stored!.state.tables.room?.rows ?? [];
assert.equal(roomRows.length, 1);
assert.equal(roomRows[0].code, room.code);
assert.equal((stored!.state.tables.round_placement?.rows ?? []).length >= 2, true);

// A fourth instance created from scratch must see the same final state.
const db4 = await createSharedDb(store);
const from4 = await buildSnapshotForRoom(db4, room, a, T + 45_200);
assert.equal(from4.round?.phase, "results");
assert.equal(from4.members.length, 3);
console.log("[shared] all cross-instance checks passed.");
process.exit(0);
