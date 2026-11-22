/**
 * End-to-end engine smoke test.
 *
 * Runs the real game engine against the real database with a simulated clock:
 * room creation, joining, readiness, match start, answers, sharing, settlement,
 * idempotent retries, Hopper buckets and Beehive elimination.
 *
 * Usage: node --import tsx --conditions react-server scripts/engine-smoke.ts
 */
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db";
import { createRoom, joinRoom, startMatch } from "../src/lib/game/engine";
import { advanceRoom } from "../src/lib/game/engine";
import { applyIntent } from "../src/lib/game/intents";
import { buildSnapshotForRoom } from "../src/lib/game/snapshot";
import { hashToken, newId, newToken } from "../src/lib/ids";
import { anthillLedger, anthillTotals, awardPlacements, competitionRanking } from "../src/lib/scoring";

const db = await getDb();

async function guest(label: string): Promise<string> {
  const id = newId("gst");
  const token = newToken();
  await db.query("insert into guest_session (id, token_hash, created_at) values ($1,$2,$3)", [
    id,
    hashToken(token),
    Date.now(),
  ]);
  console.log(`  · guest ${label}`);
  return id;
}

let requestSeq = 0;
const rid = () => `smoke_${Date.now()}_${requestSeq++}`;

async function answer(code: string, guestId: string, text: string, now: number) {
  return applyIntent(db, code, guestId, { type: "answer:submit", text }, rid(), now);
}

async function placementsFor(code: string) {
  const room = await db.one<{ id: string }>("select id from room where code = $1", [code]);
  const match = await db.one<{ id: string }>("select id from match where room_id = $1 order by started_at desc limit 1", [
    room?.id,
  ]);
  const round = await db.one<{ id: string }>("select id from round where match_id = $1 order by idx desc limit 1", [
    match?.id,
  ]);
  return db.query<{ member_id: string; placement: number | null; match_points: number }>(
    "select member_id, placement, match_points from round_placement where round_id = $1 order by placement nulls last",
    [round?.id],
  );
}

async function nicknameMap(code: string) {
  const room = await db.one<{ id: string }>("select id from room where code = $1", [code]);
  const rows = await db.query<{ id: string; nickname: string }>(
    "select id, nickname from room_member where room_id = $1",
    [room?.id],
  );
  return new Map(rows.map((row) => [row.id, row.nickname]));
}

async function firstValidAnswer(roundId: string): Promise<string> {
  const row = await db.one<{ canonical_name: string }>(
    `select e.canonical_name from round r
       join prompt_answer pa on pa.prompt_id = r.prompt->>'promptId'
       join entity e on e.id = pa.entity_id
      where r.id = $1
      order by random() limit 1`,
    [roundId],
  );
  assert.ok(row, "expected a seeded answer for the round prompt");
  return row!.canonical_name;
}

// ---------------------------------------------------------------------------
console.log("\n[1] Anthill: sharing, settlement and idempotency");
{
  const T = Date.now();
  const a = await guest("A");
  const b = await guest("B");
  const c = await guest("C");
  const { room, member } = await createRoom(db, a, "Ada", { mode: "anthill", rounds: 1 }, T);
  await joinRoom(db, b, room.code, "Bo", T);
  await joinRoom(db, c, room.code, "Cy", T);
  const members = await nicknameMap(room.code);

  const readyB = await applyIntent(db, room.code, b, { type: "room:ready", ready: true }, rid(), T);
  const readyC = await applyIntent(db, room.code, c, { type: "room:ready", ready: true }, rid(), T);
  assert.equal(readyB.ok, true);
  assert.equal(readyC.ok, true);

  const match = await startMatch(db, room.code, member.id, T);
  assert.equal(match.round_count, 1);

  await advanceRoom(db, room.code, T + 3_100);
  const active = T + 4_000;

  // The prompt is selected at random per round, so read the frozen prompt and
  // its accepted answers instead of assuming a named prompt.
  const round = await db.one<{ id: string }>(
    "select id from round where match_id = $1 order by idx limit 1",
    [match.id],
  );
  const choices = await db.query<{ name: string; base: number }>(
    `select e.canonical_name as name,
            case pa.rarity when 'apex' then 1000 when 'queen' then 500
                 when 'royal' then 300 when 'soldier' then 200 else 100 end as base
       from round r
       join prompt_answer pa on pa.prompt_id = r.prompt->>'promptId'
       join entity e on e.id = pa.entity_id
      where r.id = $1
      order by base desc, e.canonical_name`,
    [round!.id],
  );
  assert.ok(choices.length >= 3, "anthill prompts have at least three answers");
  const ACCEPTED = new Set(["ACCEPTED_EXACT", "ACCEPTED_ALIAS", "ACCEPTED_CORRECTED"]);
  type Accepted = { ok: boolean; code: string; message: string };
  const chosen: Array<{ name: string; base: number }> = [];

  // A few seeds contain a canonical name that collides with another entity in
  // the global index, so take the first choice the engine actually accepts.
  async function takeAccepted(guestId: string, who: string) {
    for (const choice of choices) {
      if (chosen.some((entry) => entry.name === choice.name)) continue;
      const result = (await answer(room.code, guestId, choice.name, active)) as Accepted;
      if (ACCEPTED.has(result.code)) {
        const entry = { name: choice.name, base: Number(choice.base) };
        chosen.push(entry);
        return entry;
      }
    }
    throw new Error(`no accepted anthill choice for ${who}`);
  }

  const topChoice = await takeAccepted(c, "Cy");
  const uniqueChoice = await takeAccepted(a, "Ada");
  const sharedChoice = await takeAccepted(a, "Ada");
  const sharedRes = (await answer(room.code, b, sharedChoice.name.toUpperCase(), active)) as Accepted;
  assert.ok(ACCEPTED.has(sharedRes.code), `shared answer rejected: ${sharedRes.code} ${sharedRes.message}`);
  const duplicate = await answer(room.code, a, sharedChoice.name.toLowerCase(), active + 100);
  assert.equal(duplicate.code, "ALREADY_SUBMITTED_BY_YOU");

  // Same request ID twice: one effect only.
  const once = rid();
  const first = await applyIntent(db, room.code, c, { type: "answer:submit", text: uniqueChoice.name }, once, active + 200);
  const again = await applyIntent(db, room.code, c, { type: "answer:submit", text: uniqueChoice.name }, once, active + 300);
  assert.deepEqual(first, again);

  const late = await answer(room.code, a, topChoice.name, T + 40_000);
  assert.equal(late.code, "ROUND_CLOSED");

  await advanceRoom(db, room.code, T + 41_000);
  const rows = await placementsFor(room.code);
  const byName = new Map(rows.map((row) => [members.get(row.member_id), row]));
  console.log(
    "    placements:",
    [...byName.entries()].map(([name, row]) => `${name}:${row.placement}/${row.match_points}`).join(" "),
  );

  // Recompute expectations from the settled ledger using the same published
  // helper rules, then compare against the stored placement rows.
  const ledgerRows = await db.query<{ member_id: string; entity_id: string; base_value: number; canonical_name: string }>(
    `select aa.member_id, aa.entity_id, aa.base_value, e.canonical_name
       from anthill_answer aa
       join entity e on e.id = aa.entity_id
       join round r on r.id = aa.round_id
      where r.match_id = $1`,
    [match.id],
  );
  const ledger = anthillLedger(
    ledgerRows.map((row) => ({ memberId: row.member_id, entityId: row.entity_id, base: Number(row.base_value) })),
  );
  const totals = anthillTotals(ledger);
  const byId = new Map([...members.entries()].map(([id, name]) => [name, id]));
  const expected = competitionRanking(
    [...members.values()].map((name) => ({ memberId: byId.get(name)!, score: totals.get(byId.get(name)!) ?? 0 })),
  );
  const expectedPoints = awardPlacements(expected, new Set(members.keys()));
  for (const name of ["Ada", "Bo", "Cy"]) {
    assert.equal(byName.get(name)?.placement, expected.get(byId.get(name)!), `${name} placement`);
    assert.equal(byName.get(name)?.match_points, expectedPoints.get(byId.get(name)!), `${name} points`);
  }

  // Duplicate submission never created a second sharing user, and the shared
  // answer is worth exactly half per distinct sharer.
  const sharedRows = ledgerRows.filter((row) => row.canonical_name === sharedChoice.name);
  assert.equal(sharedRows.length, 2);
  assert.equal(new Set(sharedRows.map((row) => row.member_id)).size, 2);
  for (const row of ledger.filter((entry) => entry.entityId === sharedRows[0].entity_id)) {
    assert.equal(row.contribution, Number(sharedChoice.base) / 2);
    assert.equal(row.sharers, 2);
  }

  const snapshot = await buildSnapshotForRoom(db, room, a, T + 41_000);
  assert.equal(snapshot.round?.phase, "results");
  assert.equal(snapshot.round?.results?.podium.length, 3);
  assert.ok(snapshot.match?.roundSummaries.length === 1);
  console.log("    ✓ Anthill settlement, fixed sharing, idempotency, late rejection");
}

// ---------------------------------------------------------------------------
console.log("\n[2] Hopper: alias buckets, ties and no matching penalty");
{
  const T = Date.now() + 1_000_000;
  const a = await guest("A");
  const b = await guest("B");
  const c = await guest("C");
  const { room, member } = await createRoom(db, a, "Ada", { mode: "hopper", rounds: 1, hopperSeconds: 20 }, T);
  await joinRoom(db, b, room.code, "Bo", T);
  await joinRoom(db, c, room.code, "Cy", T);
  const members = await nicknameMap(room.code);
  await applyIntent(db, room.code, b, { type: "room:ready", ready: true }, rid(), T);
  await applyIntent(db, room.code, c, { type: "room:ready", ready: true }, rid(), T);
  await startMatch(db, room.code, member.id, T);
  await advanceRoom(db, room.code, T + 3_100);
  const active = T + 4_000;

  // Discover the chosen question and its top buckets so this test is honest
  // regardless of random selection.
  const prompt = await db.one<{ promptId: string }>(
    `select r.prompt->>'promptId' as "promptId" from round r
       join match m on m.id = r.match_id where m.id = (
         select id from match where room_id = (select id from room where code = $1) order by started_at desc limit 1
       ) limit 1`,
    [room.code],
  );
  const buckets = await db.query<{ canonical: string; aliases: unknown }>(
    "select canonical, aliases from hopper_bucket where question_id = $1 order by rank",
    [prompt?.promptId],
  );
  const top = buckets[0];
  const second = buckets[1];
  assert.ok(top && second);

  const aResult = await answer(room.code, a, top.canonical, active);
  const bResult = await answer(room.code, b, top.canonical.toUpperCase(), active);
  const cResult = await answer(room.code, c, second.canonical, active);
  assert.ok(aResult.ok && bResult.ok && cResult.ok);

  await advanceRoom(db, room.code, T + 30_000);
  const rows = await placementsFor(room.code);
  const byName = new Map(rows.map((row) => [members.get(row.member_id), row]));
  console.log(
    "    placements:",
    [...byName.entries()].map(([name, row]) => `${name}:${row.placement}/${row.match_points}`).join(" "),
  );
  assert.equal(byName.get("Ada")?.placement, 1);
  assert.equal(byName.get("Bo")?.placement, 1, "matching the top answer is a shared first");
  assert.equal(byName.get("Ada")?.match_points, 900);
  assert.equal(byName.get("Bo")?.match_points, 900);
  assert.equal(byName.get("Cy")?.placement, 3);
  assert.equal(byName.get("Cy")?.match_points, 600);
  console.log("    ✓ Hopper canonical buckets, shared first, correct match points");
}

// ---------------------------------------------------------------------------
console.log("\n[3] Beehive: timed turns, elimination order and survivor");
{
  const T = Date.now() + 2_000_000;
  const a = await guest("A");
  const b = await guest("B");
  const c = await guest("C");
  const { room, member } = await createRoom(db, a, "Ada", { mode: "beehive", rounds: 1 }, T);
  await joinRoom(db, b, room.code, "Bo", T);
  await joinRoom(db, c, room.code, "Cy", T);
  const members = await nicknameMap(room.code);
  await applyIntent(db, room.code, b, { type: "room:ready", ready: true }, rid(), T);
  await applyIntent(db, room.code, c, { type: "room:ready", ready: true }, rid(), T);
  const match = await startMatch(db, room.code, member.id, T);

  const round = await db.one<{ id: string; prompt: { promptId: string } }>(
    "select id, prompt from round where match_id = $1 order by idx limit 1",
    [match.id],
  );
  assert.ok(round);

  await advanceRoom(db, room.code, T + 3_100);
  let snapshot = await buildSnapshotForRoom(db, room, a, T + 3_200);
  const activeId = snapshot.round?.beehive?.activeMemberId;
  assert.ok(activeId);
  const guestByNickname = new Map([
    ["Ada", a],
    ["Bo", b],
    ["Cy", c],
  ]);
  const firstGuest = guestByNickname.get(members.get(activeId!) ?? "");
  assert.ok(firstGuest, "active seat should map to a guest");
  const valid = await firstValidAnswer(round!.id);
  const accepted = await applyIntent(
    db,
    room.code,
    firstGuest!,
    { type: "answer:submit", text: valid, turnId: snapshot.round?.beehive?.turnId ?? undefined },
    rid(),
    T + 3_500,
  );
  assert.ok(accepted.ok, `expected accepted answer, got ${accepted.code}: ${accepted.message}`);

  // Let the next two turns time out. Each poll settles the passed deadline and
  // opens the next turn, so step the clock the way a polling client would.
  for (let step = 1; step <= 8; step += 1) {
    await advanceRoom(db, room.code, T + 3_000 + step * 10_000);
    snapshot = await buildSnapshotForRoom(db, room, a, T + 3_000 + step * 10_000);
    if (snapshot.round?.phase === "results") break;
  }
  const hive = snapshot.round?.beehive;
  assert.equal(snapshot.round?.phase, "results", "beehive should settle after both remaining turns time out");
  assert.equal(hive?.living.length, 1, "one survivor remains");
  assert.equal(hive?.eliminated.length, 2, "two players were eliminated");

  const rows = await placementsFor(room.code);
  const survivor = rows.find((row) => row.placement === 1);
  assert.ok(survivor);
  assert.equal(survivor!.match_points, 900);
  assert.equal(rows.filter((row) => row.placement === 2).length, 1);
  assert.equal(rows.find((row) => row.placement === 2)!.match_points, 750);
  assert.equal(rows.find((row) => row.placement === 3)!.match_points, 600);
  console.log("    ✓ Beehive turns, timeouts, elimination places 3/2/1 and match points");
}

// ---------------------------------------------------------------------------
console.log("\n[4] Host migration and rematch reset");
{
  const T = Date.now() + 3_000_000;
  const a = await guest("A");
  const b = await guest("B");
  const { room, member } = await createRoom(db, a, "Ada", { mode: "anthill", rounds: 1 }, T);
  await joinRoom(db, b, room.code, "Bo", T);
  await applyIntent(db, room.code, b, { type: "room:ready", ready: true }, rid(), T);
  await applyIntent(db, room.code, a, { type: "room:ready", ready: true }, rid(), T);

  // The host has been gone for a minute; Bo is present and takes over.
  const memberB = await db.one<{ id: string }>(
    "select id from room_member where nickname = 'Bo' and room_id = (select id from room where code = $1)",
    [room.code],
  );
  await db.query("update room_member set last_seen_at = $2 where id = $1", [member.id, T - 60_000]);
  await db.query("update room_member set last_seen_at = $2 where id = $1", [memberB!.id, T + 11_000]);
  await advanceRoom(db, room.code, T + 12_000);
  const updated = await db.one<{ host_member_id: string }>("select host_member_id from room where code = $1", [
    room.code,
  ]);
  assert.equal(updated?.host_member_id, memberB!.id, "host transferred to the longest-present connected member");

  // The old host comes back online, so the room has two connected players again.
  await db.query("update room_member set last_seen_at = $2 where id = $1", [member.id, T + 12_000]);
  await startMatch(db, room.code, memberB!.id, T + 12_000);
  await advanceRoom(db, room.code, T + 50_000);
  const rematch = await applyIntent(db, room.code, b, { type: "match:again" }, rid(), T + 55_000);
  assert.equal(rematch.ok, true);
  const back = await buildSnapshotForRoom(db, room, b, T + 55_000);
  assert.equal(back.room.status, "lobby");
  assert.equal(back.match?.points[memberB!.id] ?? 0, 0);
  console.log("    ✓ host migration kept the match; rematch returns to a clean lobby");
}

console.log("\nAll engine smoke checks passed.");
process.exit(0);
