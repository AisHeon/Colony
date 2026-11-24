import type { ModeId, Rarity, RoomSettings } from "../config";

export type IntentResult = {
  ok: boolean;
  code: string;
  message: string;
  tone: "ok" | "warn" | "error";
  /** Structured verdict data so the client can render before the next snapshot. */
  details?: {
    entityId?: string;
    name?: string;
    rarity?: string;
    rarityName?: string;
    base?: number;
    contribution?: number;
    shared?: boolean;
    sharers?: number;
  };
};

export type PublicMember = {
  id: string;
  nickname: string;
  avatar: number;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  spectator: boolean;
  left: boolean;
};

export type PlacementView = {
  memberId: string;
  placement: number | null;
  matchPoints: number;
  performance: Record<string, unknown>;
};

export type AnthillAnswerView = {
  entityId: string;
  name: string;
  rarity: string;
  rarityName: string;
  base: number;
  contribution: number;
  shared: boolean;
  sharers: number;
};

export type SpiderEdgeView = {
  id: string;
  label: string;
  source: string;
  predicate: string;
  direction: "forward" | "inverse";
};

export type SpiderPathView = {
  memberId: string;
  nodes: Array<{ id: string; name: string }>;
  edges: SpiderEdgeView[];
  strands: number;
  acceptedAt: number;
};

export type SpiderDraftView = {
  nodes: Array<{ id: string; name: string }>;
  edges: Array<{ label: string; source: string; direction: "forward" | "inverse" }>;
  broken: boolean;
};

export type RoundResultsView = {
  mode: ModeId;
  placements: PlacementView[];
  podium: Array<{ memberId: string; placement: number | null; matchPoints: number; detail: string }>;
  reveal: Record<string, unknown>;
  nextAt: number;
  canAdvance: boolean;
};

export type RoundSummary = {
  index: number;
  mode: ModeId;
  finalizedAt: number | null;
  placements: Array<{ memberId: string; placement: number | null; matchPoints: number }>;
};

export type Snapshot = {
  protocol: number;
  serverTime: number;
  contentVersion: string;
  version: number;
  room: {
    code: string;
    status: string;
    settings: RoomSettings;
    settingsVersion: number;
    hostMemberId: string | null;
  };
  you: {
    memberId: string | null;
    nickname: string | null;
    isHost: boolean;
    spectator: boolean;
    ready: boolean;
  };
  members: PublicMember[];
  match: null | {
    id: string;
    mode: ModeId;
    status: string;
    playlist: ModeId[];
    roundIndex: number;
    roundCount: number;
    startedAt: number;
    points: Record<string, number>;
    roundSummaries: RoundSummary[];
    vote: null | {
      open: boolean;
      endsAt: number;
      myVote: string | null;
      options: ModeId[];
      result: null | { winners: ModeId[]; counts: Record<string, number>; totalVotes: number };
    };
  };
  round: null | {
    id: string;
    index: number;
    total: number;
    mode: ModeId;
    phase: "countdown" | "active" | "results";
    startsAt: number;
    endsAt: number;
    resultsAt: number | null;
    countdownEndsAt: number;
    prompt: Record<string, unknown> & { text?: string; scope?: string; myAnswers?: AnthillAnswerView[] };
    anthill?: {
      leaderboard: Array<{ memberId: string; total: number }>;
      rarityLegend: Array<{ rarity: Rarity; name: string; value: number }>;
      revealed: Array<{ memberId: string; answers: AnthillAnswerView[] }> | null;
    };
    beehive?: {
      seatOrder: string[];
      living: string[];
      eliminated: Array<{ memberId: string; place: number }>;
      activeMemberId: string | null;
      turnEndsAt: number | null;
      turnId: string | null;
      used: Array<{ entityId: string; name: string; memberId: string }>;
      categorySwaps: number;
      category: string;
    };
    spider?: {
      start: { id: string; name: string; type: string };
      target: { id: string; name: string; type: string };
      allowedPredicates: string[];
      myBest: SpiderPathView | null;
      myDraft: SpiderDraftView | null;
      revealed: SpiderPathView[] | null;
    };
    hopper?: {
      question: string;
      scope: string;
      sourceKind: string;
      sourceLabel: string;
      savedCount: number;
      mySaved: { bucketId: string; text: string } | null;
      reveal: null | {
        ranking: Array<{ rank: number; canonical: string; score: number; players: string[] }>;
        sourceLabel: string;
        sourceNote: string;
        myScore: number;
      };
    };
    results: RoundResultsView | null;
  };
  feedback: null | {
    code: string;
    message: string;
    tone: "ok" | "warn" | "error";
    at: number;
  };
  serverIssues: string[];
};
