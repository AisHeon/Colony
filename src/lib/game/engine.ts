import "server-only";
import { randomInt } from "node:crypto";
import {
  CONTENT_VERSION,
  DEFAULT_SETTINGS,
  LIMITS,
  MODES,
  PLAYABLE_MODES,
  TIMERS,
  TOPIC_PACKS,
  type ModeId,
  type PlayableMode,
  type RoomSettings,
} from "../config";
import type { Db, QueryFn, Row } from "../db";
import { generateRoomCode, isValidRoomCode, newId } from "../ids";
import { buildPlaylist } from "../party";
import { cleanAnswer, displayAnswer, isSafeText, normalizeNickname } from "../normalize";
import {
  anthillLedger,
  anthillTotals,
  awardPlacements,
  competitionRanking,
  hopperRankScoreSafe,
  spiderPathScore,
} from "../scoring";
import {
  loadPromptBundle,
  pickHopperQuestion,
  pickPrompt,
  pickPuzzle,
  type PromptBundle,
} from "./content";

export class GameError extends Error {
  code: string;
  status: number;
  detail?: unknown;
  constructor(code: string, message: string, status = 400, detail?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type RoomRow = {
  id: string;
  code: string;
  host_member_id: string | null;
  status: string;
  settings: RoomSettings;
  settings_version: number;
  state_version: number;
  created_at: number;
  last_activity_at: number;
  closed_at: number | null;
};

export type MemberRow = {
  id: string;
  room_id: string;
  guest_id: string;
  nickname: string;
  nickname_norm: string;
  avatar: number;
  joined_at: number;
  last_seen_at: number;
  ready: boolean;
  spectator: boolean;
  left_at: number | null;
  forfeited: boolean;
};

export type MatchConfig = RoomSettings & {
  participants: string[];
  runtime: {
    usedPrompts: string[];
    usedPuzzles: string[];
    usedHopper: string[];
    lowPlayersSince?: number;
    endReason?: string;
  };
};

export type MatchRow = {
  id: string;
  room_id: string;
  mode: ModeId;
  config: MatchConfig;
  content_version: string;
  status: string;
  playlist: PlayableMode[];
  round_count: number;
  started_at: number;
  ended_at: number | null;
  vote_ends_at: number | null;
  vote_result: { winners: ModeId[]; counts: Record<string, number>; totalVotes: number } | null;
};

export type BeehiveState = {
  seatOrder: string[];
  living: string[];
  activeMemberId: string | null;
  turnId: string | null;
  turnStartedAt: number | null;
  turnEndsAt: number | null;
  used: Array<{ entityId: string; name: string; memberId: string }>;
  eliminations: Array<{ memberId: string; place: number }>;
  promptId: string;
  promptText: string;
  swaps: number;
};

export type RoundState = {
  beehive?: BeehiveState;
  drafts?: Record<string, { nodes: string[]; edges: string[] }>;
  note?: string;
};

export type RoundRow = {
  id: string;
  match_id: string;
  idx: number;
  mode: ModeId;
  phase: "countdown" | "active" | "results";
  prompt: RoundPrompt;
  participants: string[];
  state: RoundState;
  starts_at: number;
  ends_at: number;
  results_at: number | null;
  finalized_at: number | null;
};

export type RoundPrompt = {
  kind: ModeId;
  promptId?: string;
  text?: string;
  scope?: string;
  meta?: Record<string, unknown>;
  version?: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function normalizeSettings(input: Partial<RoomSettings> | undefined): RoomSettings {
  const mode: ModeId =
    input?.mode && (input.mode === "party" || PLAYABLE_MODES.includes(input.mode as PlayableMode))
      ? input.mode
      : DEFAULT_SETTINGS.mode;

  const defaultRounds = MODES[mode].defaultRounds;
  const rounds = clampInt(input?.rounds, LIMITS.minRounds, LIMITS.maxRounds, defaultRounds);
  const maxPlayers = clampInt(input?.maxPlayers, LIMITS.minPlayers, LIMITS.maxPlayers, 20);
  const spiderSeconds = [60, 90, 120].includes(Number(input?.spiderSeconds))
    ? (Number(input?.spiderSeconds) as 60 | 90 | 120)
    : 90;
  const hopperSeconds = [15, 20, 30].includes(Number(input?.hopperSeconds))
    ? (Number(input?.hopperSeconds) as 15 | 20 | 30)
    : 20;

  return {
    mode,
    rounds,
    maxPlayers,
    familyFriendly: input?.familyFriendly !== false,
    packs: normalizePacks(input?.packs),
    spiderSeconds,
    hopperSeconds,
    partyModes: normalizePartyModes(input?.partyModes),
  };
}

function normalizePartyModes(input: unknown): PlayableMode[] {
  if (!Array.isArray(input)) return [...PLAYABLE_MODES];
  const picked = [
    ...new Set(
      input
        .map(String)
        .filter((id): id is PlayableMode => (PLAYABLE_MODES as string[]).includes(id)),
    ),
  ];
  return picked.length ? picked : [...PLAYABLE_MODES];
}

function normalizePacks(input: unknown): string[] {
  const known = new Set(TOPIC_PACKS.map((pack) => pack.id as string));
  if (!Array.isArray(input)) return ["all"];
  const packs = [...new Set(input.map(String).filter((id) => known.has(id)))].slice(0, 4);
  if (!packs.length) return ["all"];
  return packs.includes("all") ? ["all"] : packs;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? Math.floor(value) : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// ---------------------------------------------------------------------------
// Clock helpers
// ---------------------------------------------------------------------------

export function isConnected(member: { last_seen_at: number; left_at: number | null }, now: number): boolean {
  return !member.left_at && now - member.last_seen_at <= TIMERS.connectedWindowMs;
}

export function roundCountdownEndsAt(round: RoundRow): number {
  return round.starts_at + TIMERS.countdownMs;
}

export function roundTotalMs(match: MatchRow, mode: ModeId): number {
  switch (mode) {
    case "anthill":
      return TIMERS.anthillRoundMs;
    case "spider":
      return (match.config.spiderSeconds ?? 90) * 1000;
    case "hopper":
      return (match.config.hopperSeconds ?? 20) * 1000;
    case "beehive":
      return TIMERS.countdownMs + 20 * (TIMERS.beehiveTurnMs + 1000);
    default:
      return TIMERS.anthillRoundMs;
  }
}

// ---------------------------------------------------------------------------
// Room access
// ---------------------------------------------------------------------------

export async function findRoom(q: QueryFn, code: string): Promise<RoomRow | null> {
  if (!isValidRoomCode(code)) return null;
  const rows = await q<Row>("select * from room where code = $1", [code]);
  return (rows[0] as unknown as RoomRow) ?? null;
}

export async function loadRoomForUpdate(q: QueryFn, code: string): Promise<RoomRow> {
  if (!isValidRoomCode(code)) throw new GameError("INVALID_CODE", "That code isn't in the expected format.");
  const rows = await q<Row>("select * from room where code = $1 for update", [code]);
  const room = rows[0] as unknown as RoomRow | undefined;
  if (!room) throw new GameError("ROOM_NOT_FOUND", "We couldn't find an active room with that code.", 404);
  if (room.status === "closed") {
    throw new GameError("ROOM_NOT_FOUND", "That room has closed. Create a new one.", 404);
  }
  return room;
}

export async function loadMembers(q: QueryFn, roomId: string): Promise<MemberRow[]> {
  const rows = await q<Row>(
    "select * from room_member where room_id = $1 order by joined_at asc",
    [roomId],
  );
  return rows as unknown as MemberRow[];
}

export async function currentMatch(q: QueryFn, roomId: string): Promise<MatchRow | null> {
  const rows = await q<Row>(
    "select * from match where room_id = $1 order by started_at desc limit 1",
    [roomId],
  );
  return (rows[0] as unknown as MatchRow) ?? null;
}

export async function matchRounds(q: QueryFn, matchId: string): Promise<RoundRow[]> {
  const rows = await q<Row>("select * from round where match_id = $1 order by idx asc", [matchId]);
  return rows as unknown as RoundRow[];
}

export async function bumpVersion(q: QueryFn, roomId: string, now: number) {
  await q(
    "update room set state_version = state_version + 1, last_activity_at = $2 where id = $1",
    [roomId, now],
  );
}

// ---------------------------------------------------------------------------
// Create / join
// ---------------------------------------------------------------------------

export function validateNickname(raw: string): string {
  if (!isSafeText(raw)) throw new GameError("INVALID_NICKNAME", "That nickname contains characters we can't display.");
  const nickname = cleanAnswer(raw).replace(/\s+/g, " ");
  if (!nickname) throw new GameError("INVALID_NICKNAME", "Choose a nickname.");
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const length = [...segmenter.segment(nickname)].length;
  if (length < LIMITS.nicknameMin) throw new GameError("INVALID_NICKNAME", "Nicknames need at least 2 characters.");
  if (length > LIMITS.nicknameMax) throw new GameError("INVALID_NICKNAME", "Nicknames can be at most 16 characters.");
  return nickname;
}

export async function createRoom(
  db: Db,
  guestId: string,
  nicknameRaw: string,
  settingsInput: Partial<RoomSettings> | undefined,
  now = Date.now(),
  avatar?: number,
): Promise<{ room: RoomRow; member: MemberRow }> {
  const nickname = validateNickname(nicknameRaw);
  const settings = normalizeSettings(settingsInput);

  return db.transaction(async (q) => {
    let code = "";
    for (let attempt = 0; attempt < 25; attempt += 1) {
      code = generateRoomCode();
      const existing = await q("select 1 from room where code = $1", [code]);
      if (!existing.length) break;
      code = "";
    }
    if (!code) throw new GameError("ROOM_CREATE_FAILED", "Couldn't allocate a room code. Try again.", 503);

    const roomId = newId("room");
    const memberId = newId("mem");
    await q(
      `insert into room (id, code, host_member_id, status, settings, settings_version, state_version, created_at, last_activity_at)
       values ($1,$2,$3,'lobby',$4::jsonb,1,1,$5,$5)`,
      [roomId, code, memberId, JSON.stringify(settings), now],
    );
    await q(
      `insert into room_member (id, room_id, guest_id, nickname, nickname_norm, avatar, joined_at, last_seen_at, ready, spectator)
       values ($1,$2,$3,$4,$5,$6,$7,$7,true,false)`,
      [memberId, roomId, guestId, nickname, normalizeNickname(nickname), avatar ?? randomInt(0, 8), now],
    );

    const roomRows = await q<Row>("select * from room where id = $1", [roomId]);
    const memberRows = await q<Row>("select * from room_member where id = $1", [memberId]);
    return {
      room: roomRows[0] as unknown as RoomRow,
      member: memberRows[0] as unknown as MemberRow,
    };
  });
}

export type JoinOutcome = {
  room: RoomRow;
  member: MemberRow;
  spectator: boolean;
  message?: string;
};

export async function joinRoom(
  db: Db,
  guestId: string,
  rawCode: string,
  nicknameRaw: string | null,
  now = Date.now(),
  avatar?: number,
): Promise<JoinOutcome> {
  const code = rawCode.trim().toUpperCase();
  return db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    const members = await loadMembers(q, room.id);
    const match = await currentMatch(q, room.id);
    const matchActive = !!match && (match.status === "active" || match.status === "voting");

    const existing = members.find((m) => m.guest_id === guestId && !m.left_at);
    if (existing) {
      const nickname = nicknameRaw ? validateNickname(nicknameRaw) : existing.nickname;
      const clash = members.some(
        (m) => !m.left_at && m.id !== existing.id && m.nickname_norm === normalizeNickname(nickname),
      );
      if (clash) throw new GameError("NICKNAME_TAKEN", "That nickname is already taken in this room.");
      await q(
        "update room_member set nickname = $2, nickname_norm = $3, last_seen_at = $4 where id = $1",
        [existing.id, nickname, normalizeNickname(nickname), now],
      );
      await q("update room set last_activity_at = $2 where id = $1", [room.id, now]);
      const refreshed = members.map((m) =>
        m.id === existing.id ? { ...m, nickname, nickname_norm: normalizeNickname(nickname), last_seen_at: now } : m,
      );
      return {
        room,
        member: refreshed.find((m) => m.id === existing.id) as MemberRow,
        spectator: existing.spectator || (matchActive && !match?.config.participants.includes(existing.id)),
        message: matchActive ? "You're back in the room. This match is still running." : undefined,
      };
    }

    const nickname = validateNickname(nicknameRaw ?? "");
    const nicknameNorm = normalizeNickname(nickname);
    if (members.some((m) => !m.left_at && m.nickname_norm === nicknameNorm)) {
      throw new GameError("NICKNAME_TAKEN", "That nickname is already taken in this room.");
    }

    const activePlayers = members.filter((m) => !m.left_at && !m.spectator);
    const playerCount = activePlayers.length;
    const mustSpectate = matchActive;
    if (!mustSpectate && playerCount >= room.settings.maxPlayers) {
      throw new GameError("ROOM_FULL", "This room is full.");
    }
    const spectators = members.filter((m) => !m.left_at && m.spectator);
    if (mustSpectate && spectators.length >= 60) {
      throw new GameError("ROOM_FULL", "This room has reached its spectator limit.");
    }

    // Reuse a previous seat in this room if the guest left earlier.
    const previous = members.find((m) => m.guest_id === guestId && m.left_at);
    if (previous && !mustSpectate && playerCount < room.settings.maxPlayers) {
      await q(
        `update room_member set left_at = null, nickname = $2, nickname_norm = $3, last_seen_at = $4,
                spectator = false, ready = false, forfeited = false where id = $1`,
        [previous.id, nickname, nicknameNorm, now],
      );
      await q("update room set last_activity_at = $2 where id = $1", [room.id, now]);
      return {
        room,
        member: { ...previous, left_at: null, nickname, nickname_norm: nicknameNorm, last_seen_at: now, ready: false, spectator: false, forfeited: false },
        spectator: false,
      };
    }

    const memberId = newId("mem");
    await q(
      `insert into room_member (id, room_id, guest_id, nickname, nickname_norm, avatar, joined_at, last_seen_at, ready, spectator)
       values ($1,$2,$3,$4,$5,$6,$7,$7,false,$8)`,
      [memberId, room.id, guestId, nickname, nicknameNorm, avatar ?? randomInt(0, 8), now, mustSpectate],
    );
    await q("update room set last_activity_at = $2 where id = $1", [room.id, now]);
    const rows = await q<Row>("select * from room_member where id = $1", [memberId]);
    return {
      room,
      member: rows[0] as unknown as MemberRow,
      spectator: mustSpectate,
      message: mustSpectate ? "The match has started. You can watch and join the next match." : undefined,
    };
  });
}

export async function touchMember(q: QueryFn, memberId: string, now: number) {
  await q("update room_member set last_seen_at = $2 where id = $1", [memberId, now]);
}

/** A state poll is a presence heartbeat, throttled so reads do not churn state. */
export async function touchPresence(db: Db, code: string, guestId: string, now = Date.now()) {
  // Must be a transaction: the serverless Blob adapter only commits writes made
  // inside a transaction, so a bare query would update only that instance.
  await db.transaction(async (q) => {
    await q(
      `update room_member set last_seen_at = $2::double precision
        where room_id = (select id from room where code = $1)
          and guest_id = $3 and left_at is null and last_seen_at < $2::double precision - 4000`,
      [code, now, guestId],
    );
  });
}

// ---------------------------------------------------------------------------
// Match lifecycle
// ---------------------------------------------------------------------------

function activeParticipants(members: MemberRow[]): string[] {
  return members.filter((m) => !m.left_at && !m.spectator).map((m) => m.id);
}

export function canStart(members: MemberRow[], hostMemberId: string, now: number) {
  const players = members.filter((m) => !m.left_at && !m.spectator);
  const connected = players.filter((m) => isConnected(m, now));
  const pending = connected.filter((m) => m.id !== hostMemberId && !m.ready);
  return {
    players,
    connected,
    pending,
    ok: connected.length >= LIMITS.minPlayers && pending.length === 0,
    reason:
      connected.length < LIMITS.minPlayers
        ? "At least two connected players are needed to start."
        : pending.length > 0
          ? `Waiting for ${pending.map((m) => m.nickname).join(", ")} to get ready.`
          : null,
  };
}

export async function startMatchTx(
  q: QueryFn,
  room: RoomRow,
  memberId: string,
  now: number,
): Promise<MatchRow> {
  if (room.host_member_id !== memberId) throw new GameError("NOT_HOST", "Only the host can start the match.", 403);
  if (room.status === "playing") throw new GameError("ALREADY_STARTED", "This match is already running.");
  const members = await loadMembers(q, room.id);
  const status = canStart(members, memberId, now);
  if (!status.ok) throw new GameError("NOT_READY", status.reason ?? "Can't start yet.");

  const participants = activeParticipants(members);
  if (participants.length < LIMITS.minPlayers) {
    throw new GameError("NOT_READY", "At least two players are needed to start.");
  }

  const settings = room.settings;
  const playlist = settings.mode === "party" ? buildPlaylist(settings.rounds, () => Math.random(), settings.partyModes) : [];
  const roundCount = settings.mode === "party" ? playlist.length : settings.rounds;
  const config: MatchConfig = {
    ...settings,
    participants,
    runtime: { usedPrompts: [], usedPuzzles: [], usedHopper: [] },
  };

  const matchId = newId("mtc");
  await q(
    `insert into match (id, room_id, mode, config, content_version, status, playlist, round_count, started_at)
     values ($1,$2,$3,$4::jsonb,$5,'active',$6::jsonb,$7,$8)`,
    [matchId, room.id, settings.mode, JSON.stringify(config), CONTENT_VERSION, JSON.stringify(playlist), roundCount, now],
  );
  await q("update room set status = 'playing', state_version = state_version + 1, last_activity_at = $2 where id = $1", [
    room.id,
    now,
  ]);
  await q("update room_member set ready = false where room_id = $1", [room.id]);

  const rows = await q<Row>("select * from match where id = $1", [matchId]);
  const match = rows[0] as unknown as MatchRow;

  await createRound(q, match, 0, now);
  return match;
}

export async function startMatch(
  db: Db,
  code: string,
  memberId: string,
  now = Date.now(),
): Promise<MatchRow> {
  return db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    return startMatchTx(q, room, memberId, now);
  });
}

export function roundMode(match: MatchRow, index: number): PlayableMode {
  if (match.mode === "party") {
    const mode = match.playlist[index];
    return (mode ?? match.playlist[index % Math.max(1, match.playlist.length)] ?? "anthill") as PlayableMode;
  }
  return match.mode as PlayableMode;
}

export async function createRound(q: QueryFn, match: MatchRow, index: number, now: number) {
  const mode = roundMode(match, index);
  const runtime = match.config.runtime;
  let prompt: RoundPrompt = { kind: mode };
  let extraState: RoundState = {};

  if (mode === "anthill" || mode === "beehive") {
    const selected = match.config.packs?.length ? match.config.packs : ["all"];
    let bundle = await pickPrompt(q, {
      kind: mode,
      packs: selected,
      familyFriendly: match.config.familyFriendly,
      excludeIds: runtime.usedPrompts,
      minAnswers: mode === "beehive" ? 80 : 8,
    });
    // A narrow topic may not cover every mode. Never strand a room at start:
    // fall back to the full verified bank instead of showing a dead screen.
    if (!bundle && !selected.includes("all")) {
      bundle = await pickPrompt(q, {
        kind: mode,
        packs: ["all"],
        familyFriendly: match.config.familyFriendly,
        excludeIds: runtime.usedPrompts,
        minAnswers: mode === "beehive" ? 80 : 8,
      });
    }
    if (!bundle) throw new GameError("CONTENT_MISSING", "No prompts are available for that mode.", 503);
    runtime.usedPrompts = [...runtime.usedPrompts, bundle.prompt.id];
    prompt = {
      kind: mode,
      promptId: bundle.prompt.id,
      text: bundle.prompt.text,
      scope: bundle.prompt.scope,
      meta: bundle.prompt.meta,
      version: bundle.prompt.version,
    };
    if (mode === "beehive") {
      const seatOrder = shuffleWithCrypto([...match.config.participants]);
      const state: BeehiveState = {
        seatOrder,
        living: [...seatOrder],
        activeMemberId: null,
        turnId: null,
        turnStartedAt: null,
        turnEndsAt: null,
        used: [],
        eliminations: [],
        promptId: bundle.prompt.id,
        promptText: bundle.prompt.text,
        swaps: 0,
      };
      extraState = { beehive: state };
    }
  } else if (mode === "hopper") {
    const picked = await pickHopperQuestion(q, runtime.usedHopper);
    if (!picked) throw new GameError("CONTENT_MISSING", "No Hopper questions are available.", 503);
    runtime.usedHopper = [...runtime.usedHopper, picked.question.id];
    prompt = {
      kind: mode,
      promptId: picked.question.id,
      text: picked.question.text,
      scope: picked.question.scope,
      meta: {
        sourceKind: picked.question.source_kind,
        sourceMeta: picked.question.source_meta,
        version: picked.question.version,
        bucketCount: picked.buckets.length,
      },
      version: picked.question.version,
    };
  } else if (mode === "spider") {
    const puzzle = await pickPuzzle(q, runtime.usedPuzzles);
    if (!puzzle) throw new GameError("CONTENT_MISSING", "No Spider Web puzzles are available.", 503);
    runtime.usedPuzzles = [...runtime.usedPuzzles, puzzle.id];
    prompt = {
      kind: mode,
      promptId: puzzle.id,
      text: "Connect the start entity to the target entity.",
      scope: "Approved relationships from this round's verified dataset.",
      meta: {
        startEntity: puzzle.start_entity,
        targetEntity: puzzle.target_entity,
        allowedPredicates: puzzle.allowed_predicates,
        shortest: puzzle.shortest_distance,
        source: puzzle.source,
        version: puzzle.version,
      },
      version: puzzle.version,
    };
  }

  const duration = roundTotalMs(match, mode);
  const endsAt = now + TIMERS.countdownMs + duration;

  await q(
    `insert into round (id, match_id, idx, mode, phase, prompt, participants, state, starts_at, ends_at)
     values ($1,$2,$3,$4,'countdown',$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)`,
    [
      newId("rnd"),
      match.id,
      index,
      mode,
      JSON.stringify(prompt),
      JSON.stringify(match.config.participants),
      JSON.stringify(extraState),
      now,
      endsAt,
    ],
  );
  await q("update match set config = $2::jsonb where id = $1", [match.id, JSON.stringify(match.config)]);
}

function shuffleWithCrypto<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tick: advance phases, settle rounds, migrate host, expire rooms
// ---------------------------------------------------------------------------

/**
 * Advances the room clock in one transaction and returns the room's state
 * version. Callers use the version to skip rebuilding a snapshot when nothing
 * changed, and can refresh presence in the same round trip.
 */
export async function advanceRoom(
  db: Db,
  code: string,
  now = Date.now(),
  touchGuestId?: string,
): Promise<number | null> {
  return db.transaction(async (q) => {
    const found = await q<Row>("select * from room where code = $1 for update", [code]);
    const room = found[0] as unknown as RoomRow | undefined;
    if (!room) return null;
    if (room.status !== "closed" && touchGuestId) {
      await q(
        `update room_member set last_seen_at = $3::double precision
          where room_id = $1 and guest_id = $2 and left_at is null
            and last_seen_at < $3::double precision - 4000`,
        [room.id, touchGuestId, now],
      );
    }
    if (room.status !== "closed") await tickRoom(q, room, now);
    const rows = await q<Row>("select state_version from room where id = $1", [room.id]);
    return Number(rows[0]?.state_version ?? room.state_version);
  });
}

export async function tickRoom(q: QueryFn, room: RoomRow, now: number): Promise<void> {
  // One member read serves both host migration and idle expiry. The tick runs on
  // every poll and every intent, so a duplicate load is pure latency on a
  // remote database.
  const members = await loadMembers(q, room.id);
  await migrateHostIfNeeded(q, room, now, members);
  await expireIfIdle(q, room, now, members);

  const match = await currentMatch(q, room.id);
  if (!match) {
    await maybeExpireLobby(q, room, now);
    return;
  }

  if (match.status === "voting") {
    if (match.vote_ends_at && now >= match.vote_ends_at) {
      await finishVoting(q, match, now);
    }
    return;
  }

  if (match.status !== "active") return;

  let rounds = await matchRounds(q, match.id);
  let roundsDone = rounds.filter((r) => r.finalized_at).length;
  let guard = 0;

  while (guard < 40) {
    guard += 1;
    const round = rounds.find((r) => !r.finalized_at);
    if (!round) {
      // A finalized round stays in `results` until its results window has
      // elapsed. That round is intentionally excluded from `activeRound`, so
      // advancing has to look at the latest finalized round explicitly.
      const latest = rounds[rounds.length - 1];
      if (!latest || latest.phase !== "results") return;
      const resultsAt = latest.results_at ?? (latest.finalized_at ?? now) + TIMERS.resultsMs;
      if (now < resultsAt) return;
      const nextIndex = latest.idx + 1;
      if (nextIndex < match.round_count) {
        await createRound(q, match, nextIndex, now);
        rounds = await matchRounds(q, match.id);
        continue;
      }
      await finishMatch(q, match, now);
      return;
    }
    roundsDone = rounds.filter((r) => r.finalized_at).length;

    if (round.phase === "countdown") {
      if (now >= roundCountdownEndsAt(round)) {
        await activateRound(q, round, match, now);
        rounds = await matchRounds(q, match.id);
        continue;
      }
      return;
    }

    if (round.phase === "active") {
      if (round.mode === "beehive") {
        const finalized = await resolveBeehiveTimeouts(q, round, now);
        if (finalized) {
          rounds = await matchRounds(q, match.id);
          continue;
        }
      }
      if (now >= round.ends_at) {
        await finalizeRound(q, round, match, now);
        rounds = await matchRounds(q, match.id);
        continue;
      }
      return;
    }

    if (round.phase === "results") {
      if (round.results_at && now >= round.results_at) {
        const nextIndex = round.idx + 1;
        if (nextIndex < match.round_count) {
          await createRound(q, match, nextIndex, now);
        } else {
          const updated = await matchForRound(q, round);
          if (updated) await finishMatch(q, updated, now);
          return;
        }
        rounds = await matchRounds(q, match.id);
        continue;
      }
      return;
    }
    return;
  }
  console.error("[colony] tick guard exhausted", { room: room.code, roundsDone });
}

async function activateRound(q: QueryFn, round: RoundRow, match: MatchRow, now: number) {
  const state: RoundState = round.state ?? {};
  if (round.mode === "beehive" && state.beehive) {
    const living = state.beehive.living;
    const activeMemberId = living[0] ?? null;
    const turnId = activeMemberId ? newId("turn") : null;
    state.beehive.activeMemberId = activeMemberId;
    state.beehive.turnId = turnId;
    state.beehive.turnStartedAt = now;
    state.beehive.turnEndsAt = activeMemberId ? now + TIMERS.beehiveTurnMs : null;
    if (activeMemberId && turnId) {
      await q(
        `insert into beehive_turn (id, round_id, idx, active_member_id, started_at, deadline_at)
         values ($1,$2,0,$3,$4,$5)`,
        [turnId, round.id, activeMemberId, now, now + TIMERS.beehiveTurnMs],
      );
    }
  }
  await q(
    "update round set phase = 'active', state = $2::jsonb where id = $1",
    [round.id, JSON.stringify(state)],
  );
  await bumpVersion(q, match.room_id, now);
}

type BeehiveOutcome = boolean;

/** Returns true when the round was finalized by a timeout. */
async function resolveBeehiveTimeouts(q: QueryFn, round: RoundRow, now: number): Promise<BeehiveOutcome> {
  const state: RoundState = round.state ?? {};
  const beehive = state.beehive;
  if (!beehive) return false;
  let guard = 0;
  let changed = false;

  while (beehive.turnEndsAt && now >= beehive.turnEndsAt && guard < 40) {
    guard += 1;
    const active = beehive.activeMemberId;
    if (!active) break;

    const place = beehive.living.length;
    beehive.eliminations.push({ memberId: active, place });
    beehive.living = beehive.living.filter((id) => id !== active);
    await q(
      "update beehive_turn set outcome = 'timeout' where round_id = $1 and active_member_id = $2 and outcome = 'pending'",
      [round.id, active],
    );
    changed = true;

    if (beehive.living.length <= 1) {
      state.beehive = beehive;
      await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);
      const match = await matchForRound(q, round);
      if (match) await finalizeRound(q, { ...round, state }, match, now);
      return true;
    }

    const next = advanceBeehiveSeat(beehive, now);
    await q(
      `insert into beehive_turn (id, round_id, idx, active_member_id, started_at, deadline_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        next.turnId as string,
        round.id,
        beehive.used.length + beehive.eliminations.length,
        next.activeMemberId as string,
        now,
        next.turnEndsAt as number,
      ],
    );
  }

  if (changed) {
    state.beehive = beehive;
    await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);
  }
  return false;
}

async function matchForRound(q: QueryFn, round: RoundRow): Promise<MatchRow | null> {
  const rows = await q<Row>("select * from match where id = $1", [round.match_id]);
  return (rows[0] as unknown as MatchRow) ?? null;
}

export function advanceBeehiveSeat(beehive: BeehiveState, now: number): BeehiveState {
  const current = beehive.activeMemberId;
  const seat = current ? beehive.seatOrder.indexOf(current) : -1;
  let nextId: string | null = null;
  for (let step = 1; step <= beehive.seatOrder.length; step += 1) {
    const candidate = beehive.seatOrder[(seat + step + beehive.seatOrder.length) % beehive.seatOrder.length];
    if (beehive.living.includes(candidate)) {
      nextId = candidate;
      break;
    }
  }
  beehive.activeMemberId = nextId ?? beehive.living[0] ?? null;
  beehive.turnId = beehive.activeMemberId ? newId("turn") : null;
  beehive.turnStartedAt = now;
  beehive.turnEndsAt = beehive.activeMemberId ? now + TIMERS.beehiveTurnMs : null;
  return beehive;
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

async function finalizeRound(
  q: QueryFn,
  round: RoundRow,
  match: MatchRow,
  now: number,
  opts: { skipClock?: boolean } = {},
) {
  if (round.finalized_at) return;
  const guard = await q<Row>("select finalized_at from round where id = $1", [round.id]);
  if (guard[0]?.finalized_at) return;
  const prompt = round.prompt ?? {};
  const mode = round.mode;
  const participants = round.participants ?? [];
  const participantsSet = new Set(participants);

  type RowOut = {
    memberId: string;
    placement: number | null;
    matchPoints: number;
    performance: Record<string, unknown>;
  };
  let rows: RowOut[] = [];

  if (mode === "anthill") {
    const accepted = await q<Row>(
      "select aa.member_id, aa.entity_id, aa.base_value, e.canonical_name, aa.rarity from anthill_answer aa join entity e on e.id = aa.entity_id where aa.round_id = $1",
      [round.id],
    );
    const ledger = anthillLedger(
      accepted.map((row) => ({
        memberId: String(row.member_id),
        entityId: String(row.entity_id),
        base: Number(row.base_value),
      })),
    );
    const totals = anthillTotals(ledger);
    const eligible = new Set(ledger.map((row) => row.memberId));
    const ranked = competitionRanking(
      participants.filter((id) => eligible.has(id)).map((id) => ({ memberId: id, score: totals.get(id) ?? 0 })),
    );
    const points = awardPlacements(ranked, eligible);
    rows = participants.map((memberId) => {
      const mine = ledger.filter((row) => row.memberId === memberId);
      const total = totals.get(memberId) ?? 0;
      return {
        memberId,
        placement: eligible.has(memberId) ? (ranked.get(memberId) ?? null) : null,
        matchPoints: points.get(memberId) ?? 0,
        performance: {
          total,
          acceptedCount: mine.length,
          sharedCount: mine.filter((row) => row.shared).length,
          answers: mine
            .map((row) => {
              const entity = accepted.find(
                (a) => String(a.member_id) === memberId && String(a.entity_id) === row.entityId,
              );
              return {
                name: entity ? String(entity.canonical_name) : row.entityId,
                rarity: row.rarity,
                base: row.base,
                contribution: row.contribution,
                shared: row.shared,
                sharers: row.sharers,
              };
            })
            .sort((a, b) => b.contribution - a.contribution),
        },
      };
    });
  } else if (mode === "beehive") {
    const beehive = (round.state as RoundState).beehive;
    const eliminated = beehive?.eliminations ?? [];
    const survivor = beehive?.living?.[0] ?? null;
    const placementOf = new Map<string, number>();
    for (const entry of eliminated) placementOf.set(entry.memberId, entry.place);
    if (survivor && eliminated.length === participants.length - 1) placementOf.set(survivor, 1);
    // If the round ended early (host left etc.) remaining living players share
    // the best remaining placements.
    let nextPlace = 1;
    for (const memberId of beehive?.living ?? []) {
      if (!placementOf.has(memberId)) {
        placementOf.set(memberId, nextPlace);
      }
      nextPlace += 1;
    }
    const eligible = new Set(participants.filter((id) => placementOf.has(id)));
    const ranked = new Map([...placementOf.entries()].filter(([id]) => participantsSet.has(id)));
    const points = awardPlacements(ranked, eligible);
    const attempts = await q<Row>(
      "select member_id, count(*) as n from answer_attempt where round_id = $1 and result_code like 'ACCEPTED%' group by member_id",
      [round.id],
    );
    rows = participants.map((memberId) => ({
      memberId,
      placement: ranked.get(memberId) ?? null,
      matchPoints: points.get(memberId) ?? 0,
      performance: {
        answersGiven: Number(attempts.find((a) => String(a.member_id) === memberId)?.n ?? 0),
        eliminatedAt: eliminated.find((entry) => entry.memberId === memberId)?.place ?? null,
        survived: survivor === memberId,
        usedThisRound: beehive?.used.length ?? 0,
      },
    }));
  } else if (mode === "spider") {
    const paths = await q<Row>(
      "select * from spider_path where round_id = $1 order by strand_count asc, accepted_at asc",
      [round.id],
    );
    const placementOf = new Map<string, number>();
    let lastKey = "";
    let lastPlace = 0;
    paths.forEach((row, index) => {
      const key = `${row.strand_count}:${row.accepted_at}`;
      const place = key === lastKey ? lastPlace : index + 1;
      placementOf.set(String(row.member_id), place);
      lastKey = key;
      lastPlace = place;
    });
    const eligible = new Set(placementOf.keys());
    const points = awardPlacements(placementOf, eligible);
    rows = participants.map((memberId) => {
      const path = paths.find((row) => String(row.member_id) === memberId);
      const strands = path ? Number(path.strand_count) : null;
      return {
        memberId,
        placement: placementOf.get(memberId) ?? null,
        matchPoints: points.get(memberId) ?? 0,
        performance: {
          strands,
          score: strands ? spiderPathScore(strands) : 0,
          nodes: path?.entity_ids ?? null,
          edgeIds: path?.edge_ids ?? null,
          acceptedAt: path ? Number(path.accepted_at) : null,
        },
      };
    });
  } else if (mode === "hopper") {
    const answers = await q<Row>(
      `select ha.member_id, hb.id as bucket_id, hb.canonical, hb.rank
         from hopper_answer ha join hopper_bucket hb on hb.id = ha.bucket_id
        where ha.round_id = $1`,
      [round.id],
    );
    const scores = answers.map((row) => ({
      memberId: String(row.member_id),
      score: hopperRankScoreSafe(Number(row.rank)),
    }));
    const ranked = competitionRanking(scores);
    const eligible = new Set(scores.map((row) => row.memberId));
    const points = awardPlacements(ranked, eligible);
    rows = participants.map((memberId) => {
      const answer = answers.find((row) => String(row.member_id) === memberId);
      return {
        memberId,
        placement: ranked.get(memberId) ?? null,
        matchPoints: points.get(memberId) ?? 0,
        performance: {
          bucketId: answer ? String(answer.bucket_id) : null,
          answer: answer ? String(answer.canonical) : null,
          rank: answer ? Number(answer.rank) : null,
          score: answer ? hopperRankScoreSafe(Number(answer.rank)) : 0,
        },
      };
    });
  }

  for (const row of rows) {
    await q(
      `insert into round_placement (round_id, member_id, placement, performance, match_points)
       values ($1,$2,$3,$4::jsonb,$5)
       on conflict (round_id, member_id) do nothing`,
      [round.id, row.memberId, row.placement, JSON.stringify(row.performance), row.matchPoints],
    );
  }

  await q(
    "update round set phase = 'results', finalized_at = $2, results_at = $3, state = $4::jsonb where id = $1",
    [
      round.id,
      now,
      now + TIMERS.resultsMs,
      JSON.stringify({ ...(round.state ?? {}), note: prompt.text ?? "" }),
    ],
  );
  await bumpVersion(q, match.room_id, now);

  // Persist prompt usage into the match config so the next round never repeats.
  const fresh = await matchForRound(q, round);
  if (fresh) {
    await q("update match set config = $2::jsonb where id = $1", [fresh.id, JSON.stringify(fresh.config)]);
  }
}

async function finishMatch(q: QueryFn, match: MatchRow, now: number) {
  if (match.status === "ended") return;
  if (match.mode === "party") {
    await q("update match set status = 'voting', vote_ends_at = $2 where id = $1", [
      match.id,
      now + TIMERS.voteMs,
    ]);
    await bumpVersion(q, match.room_id, now);
    return;
  }
  await q("update match set status = 'ended', ended_at = $2 where id = $1", [match.id, now]);
  await q("update room set status = 'ended', state_version = state_version + 1, last_activity_at = $2 where id = $1", [
    match.room_id,
    now,
  ]);
}

async function finishVoting(q: QueryFn, match: MatchRow, now: number) {
  const votes = await q<Row>(
    "select mode, count(*) as n from favorite_vote where match_id = $1 group by mode",
    [match.id],
  );
  const counts: Record<string, number> = {};
  for (const row of votes) counts[String(row.mode)] = Number(row.n);
  const totalVotes = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const max = Math.max(0, ...Object.values(counts));
  const winners = max > 0 ? Object.keys(counts).filter((mode) => counts[mode] === max) : [];
  const result = { winners: winners as ModeId[], counts, totalVotes };
  await q("update match set status = 'ended', ended_at = $2, vote_result = $3::jsonb where id = $1", [
    match.id,
    now,
    JSON.stringify(result),
  ]);
  await q("update room set status = 'ended', state_version = state_version + 1, last_activity_at = $2 where id = $1", [
    match.room_id,
    now,
  ]);
}

// ---------------------------------------------------------------------------
// Host migration and room expiry
// ---------------------------------------------------------------------------

export async function migrateHostIfNeeded(
  q: QueryFn,
  room: RoomRow,
  now: number,
  loadedMembers?: MemberRow[],
) {
  const members = loadedMembers ?? (await loadMembers(q, room.id));
  const active = members.filter((m) => !m.left_at);
  const host = active.find((m) => m.id === room.host_member_id);
  if (host && !host.left_at && now - host.last_seen_at <= TIMERS.hostMigrationMs) return;

  const candidates = active.filter((m) => !m.spectator && isConnected(m, now));
  if (!candidates.length) return;
  const next = candidates.sort((a, b) => a.joined_at - b.joined_at)[0];
  if (next.id === room.host_member_id) return;
  await q("update room set host_member_id = $2, state_version = state_version + 1, last_activity_at = $3 where id = $1", [
    room.id,
    next.id,
    now,
  ]);
  room.host_member_id = next.id;
  room.state_version += 1;
}

async function expireIfIdle(q: QueryFn, room: RoomRow, now: number, members: MemberRow[]) {
  if (room.status === "closed") return;
  const connected = members.filter((m) => isConnected(m, now));
  if (!connected.length) {
    const newest = members.reduce((max, m) => Math.max(max, m.last_seen_at, m.joined_at), 0);
    if (now - newest > TIMERS.emptyRoomCloseMs) {
      await q("update room set status = 'closed', closed_at = $2 where id = $1", [room.id, now]);
      await q("delete from intent_receipt where created_at < $1", [now - 24 * 60 * 60_000]);
    }
  }
}

async function maybeExpireLobby(q: QueryFn, room: RoomRow, now: number) {
  if (room.status !== "lobby") return;
  if (now - room.last_activity_at > TIMERS.idleRoomExpireMs) {
    await q("update room set status = 'closed', closed_at = $2 where id = $1", [room.id, now]);
  }
}

// ---------------------------------------------------------------------------
// Lobby actions
// ---------------------------------------------------------------------------

export async function updateSettingsTx(
  q: QueryFn,
  room: RoomRow,
  memberId: string,
  settingsInput: Partial<RoomSettings>,
  now: number,
): Promise<void> {
  if (room.host_member_id !== memberId) throw new GameError("NOT_HOST", "Only the host can change settings.", 403);
  if (room.status !== "lobby" && room.status !== "ended") {
    throw new GameError("SETTINGS_LOCKED", "Settings are frozen once the match starts.");
  }
  const next = normalizeSettings({ ...room.settings, ...settingsInput });
  await q(
    "update room set settings = $2::jsonb, settings_version = settings_version + 1, state_version = state_version + 1, last_activity_at = $3 where id = $1",
    [room.id, JSON.stringify(next), now],
  );
  await q("update room_member set ready = false where room_id = $1 and id <> $2 and left_at is null", [
    room.id,
    memberId,
  ]);
}

export async function updateSettings(
  db: Db,
  code: string,
  memberId: string,
  settingsInput: Partial<RoomSettings>,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    await updateSettingsTx(q, room, memberId, settingsInput, now);
  });
}

export async function setReady(
  db: Db,
  code: string,
  memberId: string,
  ready: boolean,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    if (room.status === "playing") throw new GameError("MATCH_RUNNING", "The match is already running.");
    await q(
      "update room_member set ready = $3, last_seen_at = $4 where room_id = $1 and id = $2 and left_at is null",
      [room.id, memberId, ready, now],
    );
    await bumpVersion(q, room.id, now);
  });
}

export async function leaveRoom(
  db: Db,
  code: string,
  memberId: string,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    const members = await loadMembers(q, room.id);
    const member = members.find((m) => m.id === memberId && !m.left_at);
    if (!member) return;
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
          const place = beehive.living.length;
          beehive.eliminations.push({ memberId: member.id, place });
          beehive.living = beehive.living.filter((id) => id !== member.id);
          if (beehive.activeMemberId === member.id) {
            await q(
              "update beehive_turn set outcome = 'left' where round_id = $1 and active_member_id = $2 and outcome = 'pending'",
              [round.id, member.id],
            );
          }
          if (beehive.living.length <= 1) {
            state.beehive = beehive;
            await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);
            await finalizeRound(q, { ...round, state }, match, now);
          } else {
            if (beehive.activeMemberId === member.id) advanceBeehiveSeat(beehive, now);
            state.beehive = beehive;
            await q("update round set state = $2::jsonb where id = $1", [round.id, JSON.stringify(state)]);
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
  });
}

export async function kickMember(
  db: Db,
  code: string,
  hostMemberId: string,
  targetMemberId: string,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    if (room.host_member_id !== hostMemberId) throw new GameError("NOT_HOST", "Only the host can remove players.", 403);
    if (room.status === "playing") throw new GameError("MATCH_RUNNING", "Players can't be removed during a match.");
    if (targetMemberId === hostMemberId) throw new GameError("INVALID_TARGET", "You can't remove yourself.");
    await q("update room_member set left_at = $2 where room_id = $1 and id = $3 and left_at is null", [
      room.id,
      now,
      targetMemberId,
    ]);
    await bumpVersion(q, room.id, now);
  });
}

export async function rematchTx(q: QueryFn, room: RoomRow, memberId: string, now: number): Promise<void> {
  if (room.host_member_id !== memberId) throw new GameError("NOT_HOST", "Only the host can start a rematch.", 403);
  const match = await currentMatch(q, room.id);
  if (match && (match.status === "active" || match.status === "voting")) {
    throw new GameError("MATCH_RUNNING", "The current match hasn't finished yet.");
  }
  await q("update room set status = 'lobby', state_version = state_version + 1, last_activity_at = $2 where id = $1", [
    room.id,
    now,
  ]);
  await q("update room_member set ready = false where room_id = $1 and left_at is null and id <> $2", [
    room.id,
    memberId,
  ]);
}

export async function rematch(
  db: Db,
  code: string,
  memberId: string,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (q) => {
    const room = await loadRoomForUpdate(q, code);
    await rematchTx(q, room, memberId, now);
  });
}

// ---------------------------------------------------------------------------
// Round helpers used by intents
// ---------------------------------------------------------------------------

export async function activeRound(q: QueryFn, matchId: string): Promise<RoundRow | null> {
  const rows = await q<Row>(
    "select * from round where match_id = $1 and finalized_at is null order by idx asc limit 1",
    [matchId],
  );
  return (rows[0] as unknown as RoundRow) ?? null;
}

export async function loadPromptForRound(q: QueryFn, round: RoundRow): Promise<PromptBundle | null> {
  if (!round.prompt?.promptId) return null;
  return loadPromptBundle(q, round.prompt.promptId);
}

export { displayAnswer };
export type { HopperBucket } from "./content";
