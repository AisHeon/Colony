/**
 * Single source of truth for product constants.
 * Change the title here and the whole app follows.
 */

export const GAME_TITLE = "Colony";
export const GAME_TAGLINE = "Quick answers. Clever connections. One room.";
export const CONTENT_VERSION = "2026.11.3";
export const PROTOCOL_VERSION = 1;

export type ModeId = "party" | "anthill" | "beehive" | "spider" | "hopper";
export type PlayableMode = Exclude<ModeId, "party">;
export type Rarity = "forager" | "soldier" | "royal" | "queen" | "apex";

export const MODES: Record<
  ModeId,
  {
    id: ModeId;
    name: string;
    tagline: string;
    blurb: string;
    rule: string;
    rules: [string, string, string];
    accent: string;
    defaultRounds: number;
    timerLabel: string;
  }
> = {
  party: {
    id: "party",
    name: "Party",
    tagline: "All four, shuffled",
    blurb: "A randomized playlist. One full round of each minigame per slot.",
    rule: "8 rounds by default. Each slot is one complete minigame round.",
    rules: [
      "The playlist covers all four minigames before any repeats.",
      "Each slot is one complete round of that minigame.",
      "Vote for your favorite mode after the last round.",
    ],
    accent: "var(--accent-party)",
    defaultRounds: 8,
    timerLabel: "8 rounds",
  },
  anthill: {
    id: "anthill",
    name: "Anthill",
    tagline: "Rarer answers score more",
    blurb: "Type as many valid answers as you can. Rarer answers are worth more.",
    rule: "30 seconds. Shared answers lose half their value once.",
    rules: [
      "Enter many valid answers before the clock runs out.",
      "Rarer answers score more — Forager to Apex.",
      "Shared answers lose half their value, once.",
    ],
    accent: "var(--accent-anthill)",
    defaultRounds: 5,
    timerLabel: "30s rounds",
  },
  beehive: {
    id: "beehive",
    name: "Beehive",
    tagline: "Keep the circle alive",
    blurb: "Take turns naming an unused answer. Run out of time and you're out.",
    rule: "10 seconds per turn. Last player standing wins.",
    rules: [
      "Wait for your turn, then give an unused answer in 10 seconds.",
      "The same category and used answers apply to everyone.",
      "Last player standing wins the round.",
    ],
    accent: "var(--accent-beehive)",
    defaultRounds: 3,
    timerLabel: "10s turns",
  },
  spider: {
    id: "spider",
    name: "Spider Web",
    tagline: "Fewer strands win",
    blurb: "Connect two entities through verified relationships. Shorter paths win.",
    rule: "90 seconds. Every strand must be a real, sourced relationship.",
    rules: [
      "Connect the start entity to the target entity.",
      "Every strand needs a real, sourced relationship.",
      "Fewer strands in a complete path wins.",
    ],
    accent: "var(--accent-spider)",
    defaultRounds: 3,
    timerLabel: "90s rounds",
  },
  hopper: {
    id: "hopper",
    name: "Hopper",
    tagline: "Say what everyone says",
    blurb: "Give the most popular answer. Matching other players is a good thing.",
    rule: "20 seconds. One saved answer you can change before time runs out.",
    rules: [
      "Think of the most popular answer to the question.",
      "Save one answer before time runs out — you can change it.",
      "Matching other players is fine and never penalized.",
    ],
    accent: "var(--accent-hopper)",
    defaultRounds: 5,
    timerLabel: "20s rounds",
  },
};

export const PLAYABLE_MODES: PlayableMode[] = ["anthill", "beehive", "spider", "hopper"];
export const MODE_ORDER: ModeId[] = ["party", "anthill", "beehive", "spider", "hopper"];

export type TopicPackId =
  | "all"
  | "world_history"
  | "geography"
  | "science"
  | "animals"
  | "food"
  | "sports"
  | "music"
  | "movies_tv"
  | "video_games"
  | "wordplay"
  | "mythology"
  | "space"
  | "classics";

export type TopicPack = {
  id: TopicPackId;
  name: string;
  short: string;
  icon: "all" | "globe" | "pin" | "flask" | "paw" | "bowl" | "medal" | "note" | "film" | "gamepad" | "letters" | "bolt" | "star" | "spark";
};

/** The host can mix up to four packs. The default is every verified prompt. */
export const TOPIC_PACKS: TopicPack[] = [
  { id: "all", name: "All topics", short: "All", icon: "all" },
  { id: "world_history", name: "World History", short: "History", icon: "globe" },
  { id: "geography", name: "Geography", short: "Places", icon: "pin" },
  { id: "science", name: "Science & Nature", short: "Science", icon: "flask" },
  { id: "animals", name: "Animals", short: "Animals", icon: "paw" },
  { id: "food", name: "Food", short: "Food", icon: "bowl" },
  { id: "sports", name: "Sports", short: "Sports", icon: "medal" },
  { id: "music", name: "Music", short: "Music", icon: "note" },
  { id: "movies_tv", name: "Movies & TV", short: "Screen", icon: "film" },
  { id: "video_games", name: "Video Games", short: "Games", icon: "gamepad" },
  { id: "wordplay", name: "Wordplay", short: "Words", icon: "letters" },
  { id: "mythology", name: "Mythology & Legend", short: "Myths", icon: "bolt" },
  { id: "space", name: "Space", short: "Space", icon: "star" },
  { id: "classics", name: "Classics", short: "Classics", icon: "spark" },
];

export function topicPack(id: string): TopicPack | undefined {
  return TOPIC_PACKS.find((pack) => pack.id === id);
}

export function packLabel(packs: string[]): string {
  if (!packs.length || packs.includes("all")) return "All topics";
  return packs.map((id) => topicPack(id)?.name ?? id).join(" + ");
}

/** Placement points for every mode. Index = placement (1-based). */
export const PLACEMENT_POINTS = [900, 750, 600, 450, 300, 200, 100, 75, 50] as const;
export const MAX_PLACEMENT_WITH_POINTS = PLACEMENT_POINTS.length;

export function placementPoints(place: number): number {
  if (place < 1) return 0;
  return PLACEMENT_POINTS[place - 1] ?? 0;
}

export const RARITIES: Record<Rarity, { name: string; value: number; order: number }> = {
  forager: { name: "Forager", value: 100, order: 1 },
  soldier: { name: "Soldier", value: 200, order: 2 },
  royal: { name: "Royal Guard", value: 300, order: 3 },
  queen: { name: "Queen", value: 500, order: 4 },
  apex: { name: "Apex", value: 1000, order: 5 },
};

/** Default tier split when assigning rarity from a familiarity ordering. */
export const RARITY_SPLIT: Array<[Rarity, number]> = [
  ["forager", 0.4],
  ["soldier", 0.3],
  ["royal", 0.2],
  ["queen", 0.08],
  ["apex", 0.02],
];

export const TIMERS = {
  anthillRoundMs: 30_000,
  beehiveTurnMs: 10_000,
  beehiveHandoffMs: 600,
  spiderRoundMs: 90_000,
  hopperRoundMs: 20_000,
  countdownMs: 3_000,
  resultsMs: 8_000,
  voteMs: 10_000,
  /** Minimum time before the host may advance results early. */
  resultsHostMinimumMs: 3_000,
  /** A member is considered connected if seen within this window. */
  connectedWindowMs: 9_000,
  /** Host transfers after this much silence. */
  hostMigrationMs: 10_000,
  /** Seat reservation for disconnected players. */
  seatReservationMs: 120_000,
  /** Whole-room reconnect grace before the room is closed. */
  emptyRoomCloseMs: 120_000,
  /** Idle lobby expiry. */
  idleRoomExpireMs: 30 * 60_000,
} as const;

export const LIMITS = {
  minPlayers: 2,
  maxPlayers: 20,
  minRounds: 1,
  maxRounds: 20,
  nicknameMin: 2,
  nicknameMax: 16,
  answerMaxChars: 120,
  answerMaxBytes: 480,
  spiderMaxDraftNodes: 30,
  spiderMaxDraftEdges: 40,
  spiderMaxPathStrands: 10,
  answersPerSecond: 6,
  answerBurst: 12,
  stateMaxAgeMs: 120_000,
} as const;

export const HOPPER_RANK_SCORES = [1000, 750, 500, 300, 150] as const;
export const HOPPER_OTHER_SCORE = 50;

export function hopperScore(rank: number): number {
  if (rank < 1) return 0;
  return HOPPER_RANK_SCORES[rank - 1] ?? HOPPER_OTHER_SCORE;
}

export const SPIDER_PREDICATES = [
  "works_at",
  "located_in",
  "produces",
  "created_by",
  "part_of",
  "member_of",
  "appears_in",
  "manufactured_by",
  "capital_of",
  "used_for",
  "made_from",
  "featured_in",
] as const;
export type Predicate = (typeof SPIDER_PREDICATES)[number];

export const PREDICATE_LABELS: Record<Predicate, { forward: string; inverse: string }> = {
  works_at: { forward: "works at", inverse: "has employee" },
  located_in: { forward: "is located in", inverse: "contains" },
  produces: { forward: "produces", inverse: "is produced by" },
  created_by: { forward: "was created by", inverse: "created" },
  part_of: { forward: "is part of", inverse: "has part" },
  member_of: { forward: "is a member of", inverse: "has member" },
  appears_in: { forward: "appears in", inverse: "features" },
  manufactured_by: { forward: "is manufactured by", inverse: "manufactures" },
  capital_of: { forward: "is the capital of", inverse: "has capital" },
  used_for: { forward: "is used for", inverse: "uses" },
  made_from: { forward: "is made from", inverse: "is a material for" },
  featured_in: { forward: "is featured in", inverse: "features" },
};

export const AVATAR_COLORS = [
  "#FFDD00",
  "#FF69B4",
  "#00BFFF",
  "#22C55E",
  "#FF3333",
  "#46178F",
  "#FFF6E5",
  "#FFB3A7",
] as const;

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function avatarInk(index: number): string {
  return [0, 1, 2, 3, 4, 5, 6, 7][index % 8] === 5 ? "#FFF6E5" : "#111111";
}

export type RoomSettings = {
  mode: ModeId;
  rounds: number;
  maxPlayers: number;
  familyFriendly: boolean;
  packs: string[];
  spiderSeconds: 60 | 90 | 120;
  hopperSeconds: 15 | 20 | 30;
};

export const DEFAULT_SETTINGS: RoomSettings = {
  mode: "party",
  rounds: MODES.party.defaultRounds,
  maxPlayers: LIMITS.maxPlayers,
  familyFriendly: true,
  packs: ["all"],
  spiderSeconds: 90,
  hopperSeconds: 20,
};
