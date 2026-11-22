import "server-only";
import { z } from "zod";
import { LIMITS, RARITIES, TIMERS, type ModeId, type RoomSettings } from "../config";
import type { Db, QueryFn, Row } from "../db";
import { newId } from "../ids";
import { cleanAnswer, displayAnswer } from "../normalize";
import { isAcceptedAnswer, validateAnswer } from "../validation";
import {
  GameError,
  activeRound,
  bumpVersion,
  createRound,
  currentMatch,
  loadMembers,
  loadPromptForRound,
  loadRoomForUpdate,
  matchRounds,
  startMatchTx,
  rematchTx,
  tickRoom,
  updateSettingsTx,
  advanceBeehiveSeat,
  type MatchRow,
  type MemberRow,
  type RoomRow,
  type RoundRow,
  type RoundState,
} from "./engine";
import { loadGraph, loadHopperQuestion, pickPrompt } from "./content";
import { findDirectEdge, validateRoute } from "./spider";
import type { IntentResult } from "./types";

export type Intent =
  | { type: "room:ready"; ready: boolean }
  | { type: "room:updateSettings"; settings: Partial<RoomSettings> }
  | { type: "room:leave" }
  | { type: "room:kick"; memberId: string }
  | { type: "match:start" }
  | { type: "match:again" }
  | { type: "match:advance" }
  | { type: "answer:submit"; text: string; turnId?: string; roundId?: string }
  | { type: "spider:draft"; nodes: string[] }
  | { type: "party:voteFavorite"; mode: ModeId };

export const intentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room:ready"), ready: z.boolean() }),
  z.object({ type: z.literal("room:updateSettings"), settings: z.record(z.unknown()) }),
  z.object({ type: z.literal("room:leave") }),
  z.object({ type: z.literal("room:kick"), memberId: z.string().max(80) }),
  z.object({ type: z.literal("match:start") }),
  z.object({ type: z.literal("match:again") }),
  z.object({ type: z.literal("match:advance") }),
  z.object({
    type: z.literal("answer:submit"),
    text: z.string().max(400),
    turnId: z.string().max(80).optional(),
    roundId: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("spider:draft"),
    nodes: z.array(z.string().max(80)).max(LIMITS.spiderMaxDraftNodes),
  }),
  z.object({
    type: z.literal("party:voteFavorite"),
    mode: z.enum(["party", "anthill", "beehive", "spider", "hopper"]),
  }),
]);

function toneFor(code: string): IntentResult["tone"] {
  if (code.startsWith("ACCEPTED") || code === "SAVED" || code === "OK") return "ok";
  if (code === "AMBIGUOUS" || code === "ALREADY_SUBMITTED_BY_YOU" || code === "ALREADY_USED_THIS_ROUND") {
    return "warn";
  }
  return "error";
}

function feedback(code: string, message: string): IntentResult {
  return { ok: code.startsWith("ACCEPTED") || code === "SAVED" || code === "OK", code, message, tone: toneFor(code) };
}

async function findMember(q: QueryFn, roomId: string, guestId: string): Promise<MemberRow | null> {
  const rows = await q<Row>(
    `select * from room_member
      where room_id = $1 and guest_id = $2 and left_at is null
      order by joined_at desc limit 1`,
    [roomId, guestId],
  );
  return (rows[0] as unknown as MemberRow) ?? null;
}

export async function resolveMember(db: Db, roomId: string, guestId: string): Promise<MemberRow | null> {
  return db.transaction((q) => findMember(q, roomId, guestId));
}

/**
 * Apply one intention. Runs in a single transaction that locks the room row, so
 * conflicting intents serialize per room. Request IDs make retries idempotent.
 */
export async function applyIntent(
  db: Db,
  code: string,
  guestId: string | null,
  intent: Intent,
  requestId: string,
  now = Date.now(),
): Promise<IntentResult> {
  const cached = await db.one<Row>("select result from intent_receipt where request_id = $1", [requestId]);
  if (cached?.result) return cached.result as IntentResult;

  if (!guestId) throw new GameError("NOT_IN_ROOM", "Join this room first.", 403);

  if (intent.type === "room:leave") {
    const roomRow = await db.one<Row>("select * from room where code = $1", [code]);
    if (!roomRow) throw new GameError("ROOM_NOT_FOUND", "That room has closed.", 404);
    const member = await resolveMember(db, String(roomRow.id), guestId);
    const outcome = feedback("OK", "You left the room.");
    if (member) {
      await db.transaction(async (q) => {
        await leaveWithinTx(q, roomRow as unknown as RoomRow, member, now);
      });
    }
    return writeReceipt(db, requestId, String(roomRow.id), member?.id ?? null, intent.type, outcome, now);
  }

  const result = await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    const member = await findMember(q, room.id, guestId);
    if (!member) throw new GameError("NOT_IN_ROOM", "Your seat in this room has ended. Join again.", 403);

    await q("update room_member set last_seen_at = $2 where id = $1", [member.id, now]);
    await tickRoom(q, room, now);

    const handler = handlers[intent.type] as (ctx: unknown) => Promise<IntentResult>;
    const outcome = await handler({ q, room, member, intent, now, requestId });

    await q("update room set last_activity_at = $2 where id = $1", [room.id, now]);
    if (outcome.ok) await bumpVersion(q, room.id, now);
    return { outcome, roomId: room.id, memberId: member.id };
  });

  return writeReceipt(db, requestId, result.roomId, result.memberId, intent.type, result.outcome, now);
}

async function writeReceipt(
  db: Db,
  requestId: string,
  roomId: string,
  memberId: string | null,
  type: string,
  outcome: IntentResult,
  now: number,
): Promise<IntentResult> {
  try {
    await db.transaction(async (q) => {
      await q(
        `insert into intent_receipt (request_id, room_id, member_id, type, result, created_at)
         values ($1,$2,$3,$4,$5::jsonb,$6) on conflict (request_id) do nothing`,
        [requestId, roomId, memberId, type, JSON.stringify(outcome), now],
      );
    });
  } catch (error) {
    console.error("[colony] receipt write failed", (error as Error).message);
  }
  return outcome;
}

type Ctx<T> = {
  q: QueryFn;
  room: RoomRow;
  member: MemberRow;
  intent: T;
  now: number;
  requestId: string;
};

const handlers: { [K in Intent["type"]]: (ctx: Ctx<Extract<Intent, { type: K }>>) => Promise<IntentResult> } = {
  "room:ready": async ({ q, room, member, intent }) => {
    if (room.status === "playing") throw new GameError("MATCH_RUNNING", "The match is already running.");
    if (member.spectator) throw new GameError("SPECTATOR", "You're watching this match. You'll join the next one.");
    await q("update room_member set ready = $2 where id = $1", [member.id, intent.ready]);
    return feedback("OK", intent.ready ? "You're ready." : "Ready cleared.");
  },

  "room:updateSettings": async ({ q, room, member, intent, now }) => {
    await updateSettingsTx(q, room, member.id, intent.settings, now);
    return feedback("OK", "Settings updated. Ready states were reset.");
  },

  "room:kick": async ({ q, room, member, intent, now }) => {
    if (room.host_member_id !== member.id) throw new GameError("NOT_HOST", "Only the host can remove players.", 403);
    if (room.status === "playing") throw new GameError("MATCH_RUNNING", "Players can't be removed during a match.");
    if (intent.memberId === member.id) throw new GameError("INVALID_TARGET", "You can't remove yourself.");
    const target = await q<Row>(
      "select id from room_member where room_id = $1 and id = $2 and left_at is null",
      [room.id, intent.memberId],
    );
    if (!target.length) throw new GameError("NOT_FOUND", "That player is no longer in the room.");
    await q("update room_member set left_at = $2, ready = false where id = $1", [intent.memberId, now]);
    return feedback("OK", "Player removed.");
  },

  "match:start": async ({ q, room, member, now }) => {
    const match = await startMatchTx(q, room, member.id, now);
    return feedback("OK", `Match started — ${match.round_count} round${match.round_count === 1 ? "" : "s"}.`);
  },

  "match:again": async ({ q, room, member, now }) => {
    await rematchTx(q, room, member.id, now);
    return feedback("OK", "Back to the lobby. Ready up for a rematch.");
  },

  "match:advance": async ({ q, room, member, now }) => {
    if (room.host_member_id !== member.id) throw new GameError("NOT_HOST", "Only the host can skip results.", 403);
    const match = await currentMatch(q, room.id);
    if (!match) throw new GameError("NO_MATCH", "There's no match to advance.");
    const rounds = await matchRounds(q, match.id);
    const target = rounds.find((round) => round.phase === "results" && round.finalized_at);
    if (!target) throw new GameError("NOT_IN_RESULTS", "Results aren't showing right now.");
    if (now - (target.finalized_at ?? 0) < TIMERS.resultsHostMinimumMs) {
      throw new GameError("TOO_SOON", "Give everyone a moment to read the results.");
    }
    await q("update round set results_at = $2 where id = $1", [target.id, now]);
    await tickRoom(q, { ...room, state_version: room.state_version }, now);
    return feedback("OK", "Moving on.");
  },

  "answer:submit": async ({ q, room, member, intent, now, requestId }) =>
    submitAnswer(q, room, member, intent, requestId, now),

  "spider:draft": async ({ q, room, member, intent, now }) => submitSpiderDraft(q, room, member, intent, now),

  "room:leave": async () => {
    throw new GameError("INVALID_INTENT", "Use the leave action to exit a room.");
  },

  "party:voteFavorite": async ({ q, room, member, intent, now }) => {
    const match = await currentMatch(q, room.id);
    if (!match || match.status !== "voting" || !match.vote_ends_at) {
      throw new GameError("VOTE_CLOSED", "Voting isn't open.");
    }
    if (now >= match.vote_ends_at) throw new GameError("VOTE_CLOSED", "The favorite-mode vote has closed.");
    if (!match.playlist.includes(intent.mode as never)) {
      throw new GameError("INVALID_VOTE", "That mode wasn't played in this match.");
    }
    if (!match.config.participants.includes(member.id)) {
      throw new GameError("NOT_ELIGIBLE", "Only players in this match can vote.");
    }
    await q(
      `insert into favorite_vote (match_id, member_id, mode, updated_at) values ($1,$2,$3,$4)
       on conflict (match_id, member_id) do update set mode = excluded.mode, updated_at = excluded.updated_at`,
      [match.id, member.id, intent.mode, now],
    );
    return feedback("OK", "Vote saved. You can change it until the timer ends.");
  },
};

async function leaveWithinTx(q: QueryFn, room: RoomRow, member: MemberRow, now: number) {
  const members = await loadMembers(q, room.id);
  await q("update room_member set left_at = $2, ready = false where id = $1", [member.id, now]);

  const match = await currentMatch(q, room.id);
  if (match && match.status === "active") {
    const rounds = await matchRounds(q, match.id);
    const round = rounds.find((r) => r.phase === "active" && !r.finalized_at);
    if (round?.mode === "beehive") {
      const state: RoundState = round.state ?? {};
      const beehive = state.beehive;
      if (beehive && beehive.living.includes(member.id)) {
        await q("update room_member set forfeited = true where id = $1", [member.id]);
        beehive.eliminations.push({ memberId: member.id, place: beehive.living.length });
        beehive.living = beehive.living.filter((id) => id !== member.id);
        if (beehive.activeMemberId === member.id) advanceBeehiveSeat(beehive, now);
        state.beehive = beehive;
        await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);
        if (beehive.living.length <= 1) {
          await q("update round set phase = 'active' where id = $1", [round.id]);
        }
      }
    }
  }

  if (room.host_member_id === member.id) {
    const next = members
      .filter((m) => m.id !== member.id && !m.left_at && !m.spectator)
      .sort((a, b) => a.joined_at - b.joined_at)[0];
    if (next) await q("update room set host_member_id = $2 where id = $1", [room.id, next.id]);
  }
  await bumpVersion(q, room.id, now);
}

// ---------------------------------------------------------------------------
// Answer submission
// ---------------------------------------------------------------------------

async function rateLimited(q: QueryFn, memberId: string, now: number): Promise<boolean> {
  const rows = await q<Row>(
    "select count(*) as n from answer_attempt where member_id = $1 and admitted_at > $2",
    [memberId, now - 2500],
  );
  return Number(rows[0]?.n ?? 0) >= LIMITS.answerBurst;
}

async function recordAttempt(
  q: QueryFn,
  args: {
    requestId: string;
    roomId: string;
    roundId: string;
    turnId?: string | null;
    memberId: string;
    text: string;
    canonicalId?: string | null;
    code: string;
    message: string;
    now: number;
  },
) {
  await q(
    `insert into answer_attempt
       (id, request_id, room_id, round_id, turn_id, member_id, submitted_text, canonical_id, result_code, message, admitted_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (request_id) do nothing`,
    [
      newId("att"),
      args.requestId,
      args.roomId,
      args.roundId,
      args.turnId ?? null,
      args.memberId,
      displayAnswer(args.text),
      args.canonicalId ?? null,
      args.code,
      args.message,
      args.now,
    ],
  );
}

async function submitAnswer(
  q: QueryFn,
  room: RoomRow,
  member: MemberRow,
  intent: Extract<Intent, { type: "answer:submit" }>,
  requestId: string,
  now: number,
): Promise<IntentResult> {
  const raw = cleanAnswer(intent.text ?? "");
  if (!raw) return feedback("INVALID_PAYLOAD", "Enter an answer.");
  if (raw.length > LIMITS.answerMaxChars || Buffer.byteLength(raw, "utf8") > LIMITS.answerMaxBytes) {
    return feedback("INVALID_PAYLOAD", "That answer is too long.");
  }
  if (member.spectator) throw new GameError("SPECTATOR", "Spectators can't submit answers.");

  const match = await currentMatch(q, room.id);
  if (!match || match.status !== "active") return feedback("ROUND_CLOSED", "There is no active round.");
  if (!match.config.participants.includes(member.id)) return feedback("ROUND_CLOSED", "You're spectating this match.");
  if (await rateLimited(q, member.id, now)) {
    return feedback("RATE_LIMITED", "Slow down for a moment — your next answer will go through.");
  }

  const round = await activeRound(q, match.id);
  if (!round) return feedback("ROUND_CLOSED", "This round has ended.");
  if (intent.roundId && intent.roundId !== round.id) return feedback("ROUND_CLOSED", "That round has ended.");
  if (round.phase === "countdown") return feedback("ROUND_CLOSED", "The round hasn't started yet.");
  if (round.phase !== "active") return feedback("ROUND_CLOSED", "This round has ended.");
  if (now >= round.ends_at) return feedback("ROUND_CLOSED", "Too late — this round has ended.");

  if (round.mode === "anthill") return submitAnthill(q, room.id, round, member, intent, raw, requestId, now);
  if (round.mode === "beehive") return submitBeehive(q, room.id, round, member, intent, raw, requestId, now);
  if (round.mode === "hopper") return submitHopper(q, room.id, round, member, raw, requestId, now);
  return feedback("INVALID_PAYLOAD", "That mode doesn't accept text answers.");
}

async function submitAnthill(
  q: QueryFn,
  roomId: string,
  round: RoundRow,
  member: MemberRow,
  intent: Extract<Intent, { type: "answer:submit" }>,
  raw: string,
  requestId: string,
  now: number,
): Promise<IntentResult> {
  const bundle = await loadPromptForRound(q, round);
  if (!bundle) return feedback("VALIDATION_UNAVAILABLE", "This prompt's answer list isn't available.");

  const result = validateAnswer(bundle.index, bundle.spec, raw);
  const record = (code: string, message: string, canonicalId?: string) =>
    recordAttempt(q, { requestId, roomId, roundId: round.id, memberId: member.id, text: raw, canonicalId, code, message, now });

  if (result.code === "AMBIGUOUS") {
    await record(result.code, result.message);
    return feedback(result.code, result.message);
  }
  if (!isAcceptedAnswer(result)) {
    await record(result.code, result.message);
    return feedback(result.code, result.message);
  }

  const existing = await q<Row>(
    "select 1 from anthill_answer where round_id = $1 and member_id = $2 and entity_id = $3",
    [round.id, member.id, result.entityId],
  );
  if (existing.length) {
    const message = `You already submitted ${result.name}.`;
    await record("ALREADY_SUBMITTED_BY_YOU", message, result.entityId);
    return feedback("ALREADY_SUBMITTED_BY_YOU", message);
  }

  const base = RARITIES[result.rarity].value;
  await q(
    `insert into anthill_answer (round_id, member_id, entity_id, base_value, rarity, created_at)
     values ($1,$2,$3,$4,$5,$6)`,
    [round.id, member.id, result.entityId, base, result.rarity, now],
  );
  await q(
    `insert into answer_stats (prompt_id, entity_id, selections, exposures, updated_at)
     values ($1,$2,1,0,$3)
     on conflict (prompt_id, entity_id) do update
       set selections = answer_stats.selections + 1, updated_at = excluded.updated_at`,
    [round.prompt.promptId, result.entityId, now],
  );

  const sharers = await q<Row>(
    "select count(distinct member_id) as n from anthill_answer where round_id = $1 and entity_id = $2",
    [round.id, result.entityId],
  );
  const sharerCount = Number(sharers[0]?.n ?? 1);
  const contribution = sharerCount >= 2 ? base / 2 : base;
  const shareNote =
    sharerCount >= 2 ? ` Shared answer: ${contribution} instead of ${base}. Fixed 50% reduction.` : "";
  const message = `${result.message}${shareNote}`;

  await record(result.code, message, result.entityId);
  void intent;
  return { ok: true, code: result.code, message, tone: "ok" };
}

async function submitBeehive(
  q: QueryFn,
  roomId: string,
  round: RoundRow,
  member: MemberRow,
  intent: Extract<Intent, { type: "answer:submit" }>,
  raw: string,
  requestId: string,
  now: number,
): Promise<IntentResult> {
  const state: RoundState = round.state ?? {};
  const beehive = state.beehive;
  if (!beehive) return feedback("ROUND_CLOSED", "This round has ended.");

  if (beehive.activeMemberId !== member.id) {
    const active = await q<Row>("select nickname from room_member where id = $1", [beehive.activeMemberId]);
    const name = active[0]?.nickname ? String(active[0].nickname) : "another player";
    return feedback("NOT_YOUR_TURN", `It isn't your turn. It's ${name}'s turn.`);
  }
  if (intent.turnId && beehive.turnId && intent.turnId !== beehive.turnId) {
    return feedback("NOT_YOUR_TURN", "That turn has already passed.");
  }
  if (!beehive.turnEndsAt || now >= beehive.turnEndsAt) {
    return feedback("ROUND_CLOSED", "Too late — your turn has ended.");
  }

  const bundle = await loadPromptForRound(q, round);
  if (!bundle) return feedback("VALIDATION_UNAVAILABLE", "This category's answer list isn't available.");
  const result = validateAnswer(bundle.index, bundle.spec, raw);
  const record = (code: string, message: string, canonicalId?: string) =>
    recordAttempt(q, {
      requestId,
      roomId,
      roundId: round.id,
      turnId: beehive.turnId,
      memberId: member.id,
      text: raw,
      canonicalId,
      code,
      message,
      now,
    });

  if (result.code === "AMBIGUOUS") {
    await record(result.code, result.message);
    return feedback(result.code, result.message);
  }
  if (!isAcceptedAnswer(result)) {
    await record(result.code, result.message);
    return feedback(result.code, result.message);
  }
  if (beehive.used.some((used) => used.entityId === result.entityId)) {
    const message = `${result.name} was already used this round.`;
    await record("ALREADY_USED_THIS_ROUND", message, result.entityId);
    return feedback("ALREADY_USED_THIS_ROUND", message);
  }

  beehive.used.push({ entityId: result.entityId, name: result.name, memberId: member.id });
  await q(
    `update beehive_turn set outcome = 'accepted', accepted_answer_id = $2
      where round_id = $1 and active_member_id = $3 and outcome = 'pending'`,
    [round.id, result.entityId, member.id],
  );

  // Safety valve: if the remaining pool can no longer cover the living players,
  // swap in a fresh category between turns instead of forcing an impossible turn.
  if (beehive.used.length >= bundle.answerCount - beehive.living.length) {
    const replacement = await pickPrompt(q, {
      kind: "beehive",
      packs: ["core"],
      familyFriendly: true,
      excludeIds: [beehive.promptId],
      minAnswers: 80,
    });
    if (replacement) {
      beehive.used = [];
      beehive.swaps += 1;
      beehive.promptId = replacement.prompt.id;
      beehive.promptText = replacement.prompt.text;
      round.prompt = {
        ...round.prompt,
        promptId: replacement.prompt.id,
        text: replacement.prompt.text,
        scope: replacement.prompt.scope,
        meta: replacement.prompt.meta,
        version: replacement.prompt.version,
      };
      await q("update round set prompt = $2::jsonb where id = $1", [round.id, JSON.stringify(round.prompt)]);
    }
  }

  advanceBeehiveSeat(beehive, now);
  state.beehive = beehive;
  await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);

  if (beehive.activeMemberId) {
    await q(
      `insert into beehive_turn (id, round_id, idx, active_member_id, started_at, deadline_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        beehive.turnId as string,
        round.id,
        beehive.used.length + beehive.eliminations.length,
        beehive.activeMemberId,
        now,
        beehive.turnEndsAt as number,
      ],
    );
  }

  await record(result.code, `Accepted: ${result.name}. Passed to the next player.`, result.entityId);
  return feedback(result.code, `Accepted: ${result.name}.`);
}

async function submitHopper(
  q: QueryFn,
  roomId: string,
  round: RoundRow,
  member: MemberRow,
  raw: string,
  requestId: string,
  now: number,
): Promise<IntentResult> {
  const hopper = await loadHopperQuestion(q, String(round.prompt.promptId));
  if (!hopper) return feedback("VALIDATION_UNAVAILABLE", "This question isn't available.");

  const result = validateAnswer(
    hopper.index,
    {
      id: hopper.question.id,
      text: hopper.question.text,
      scope: hopper.question.scope,
      scopeNoun: "answer to this question",
      expectedTypes: ["answer"],
    },
    raw,
  );
  const record = (code: string, message: string, canonicalId?: string) =>
    recordAttempt(q, {
      requestId,
      roomId,
      roundId: round.id,
      memberId: member.id,
      text: raw,
      canonicalId,
      code,
      message,
      now,
    });

  if (result.code === "AMBIGUOUS") {
    await record(result.code, result.message);
    return feedback(result.code, result.message);
  }

  if (!isAcceptedAnswer(result)) {
    const saved = await q<Row>(
      `select hb.canonical from hopper_answer ha join hopper_bucket hb on hb.id = ha.bucket_id
        where ha.round_id = $1 and ha.member_id = $2`,
      [round.id, member.id],
    );
    const suffix = saved[0]?.canonical ? ` Your saved answer is still ${String(saved[0].canonical)}.` : "";
    const message = `${result.message}${suffix}`;
    await record(result.code, message);
    return feedback(result.code, message);
  }

  await q(
    `insert into hopper_answer (round_id, member_id, bucket_id, accepted_at) values ($1,$2,$3,$4)
     on conflict (round_id, member_id) do update
       set bucket_id = excluded.bucket_id, accepted_at = excluded.accepted_at`,
    [round.id, member.id, result.entityId, now],
  );
  const message = `Saved: ${result.name}. You can change it before time runs out.`;
  await record(result.code, message, result.entityId);
  return feedback(result.code, message);
}

// ---------------------------------------------------------------------------
// Spider Web
// ---------------------------------------------------------------------------

async function submitSpiderDraft(
  q: QueryFn,
  room: RoomRow,
  member: MemberRow,
  intent: Extract<Intent, { type: "spider:draft" }>,
  now: number,
): Promise<IntentResult> {
  const match = await currentMatch(q, room.id);
  if (!match || match.status !== "active") return feedback("ROUND_CLOSED", "There is no active round.");
  const round = await activeRound(q, match.id);
  if (!round || round.mode !== "spider") return feedback("ROUND_CLOSED", "There's no Spider Web round running.");
  if (round.phase !== "active" || now >= round.ends_at) return feedback("ROUND_CLOSED", "This round has ended.");
  if (!match.config.participants.includes(member.id)) return feedback("ROUND_CLOSED", "You're spectating this match.");

  const start = String(round.prompt.meta?.startEntity ?? "");
  const target = String(round.prompt.meta?.targetEntity ?? "");
  const nodes = [...new Set(intent.nodes.slice(0, LIMITS.spiderMaxDraftNodes).filter(Boolean))];
  const graph = await loadGraph(q);

  // Every stored strand is re-derived from the approved graph. Clients never
  // send edge IDs, labels or strand counts.
  const chosen = [];
  let firstUnknown = -1;
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const edge = findDirectEdge(graph, nodes[i], nodes[i + 1]);
    if (!edge) {
      if (firstUnknown < 0) firstUnknown = i;
      break;
    }
    chosen.push(edge);
  }

  const state: RoundState = round.state ?? {};
  state.drafts = {
    ...(state.drafts ?? {}),
    [member.id]: { nodes, edges: chosen.map((edge) => edge.id) },
  };
  const owners = Object.keys(state.drafts);
  if (owners.length > 40) {
    for (const owner of owners.slice(0, owners.length - 40)) delete state.drafts[owner];
  }
  await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);

  if (firstUnknown >= 0) {
    const a = graph.entities.get(nodes[firstUnknown])?.name ?? nodes[firstUnknown];
    const b = graph.entities.get(nodes[firstUnknown + 1])?.name ?? nodes[firstUnknown + 1];
    return feedback(
      "UNKNOWN_OR_UNVERIFIED",
      `We don't have a verified direct connection between ${a} and ${b} in this round's dataset.`,
    );
  }

  if (nodes.length < 2) return feedback("SAVED", "Draft saved. Connect the start to the target to score it.");
  if (nodes[0] !== start) {
    const name = graph.entities.get(start)?.name ?? "the start entity";
    return feedback("SAVED", `Draft saved. Start from ${name}.`);
  }
  if (nodes.length - 1 > LIMITS.spiderMaxPathStrands) {
    return feedback("TOO_BROAD", "A scored path can use at most ten strands.");
  }
  const route = validateRoute(graph, nodes, start, target, LIMITS.spiderMaxPathStrands);
  if (!route.ok) {
    if (route.reason === "repeat") {
      return feedback("SAVED", "A scored path can't repeat an entity. Remove the loop.");
    }
    return feedback("SAVED", "This route doesn't reach the target yet. Keep building.");
  }

  const existing = await q<Row>(
    "select strand_count from spider_path where round_id = $1 and member_id = $2",
    [round.id, member.id],
  );
  const previousStrands = existing.length ? Number(existing[0].strand_count) : null;
  if (previousStrands !== null && previousStrands <= route.edges.length) {
    return feedback(
      "SAVED",
      `Path validated — ${route.edges.length} strands. Your saved best is still ${previousStrands}.`,
    );
  }

  await q(
    `insert into spider_path (round_id, member_id, entity_ids, edge_ids, strand_count, accepted_at)
     values ($1,$2,$3::jsonb,$4::jsonb,$5,$6)
     on conflict (round_id, member_id) do update
       set entity_ids = excluded.entity_ids, edge_ids = excluded.edge_ids,
           strand_count = excluded.strand_count, accepted_at = excluded.accepted_at`,
    [
      round.id,
      member.id,
      JSON.stringify(nodes),
      JSON.stringify(route.edges.map((edge) => edge.id)),
      route.edges.length,
      now,
    ],
  );

  return feedback("ACCEPTED_EXACT", `Best path saved — ${route.edges.length} strands.`);
}

export { createRound };
