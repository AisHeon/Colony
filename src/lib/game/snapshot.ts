import "server-only";
import { CONTENT_VERSION, MODES, PROTOCOL_VERSION, RARITIES, type ModeId, type Rarity } from "../config";
import type { Db, QueryFn, Row } from "../db";
import { isConnected, type MatchRow, type MemberRow, type RoomRow, type RoundRow } from "./engine";
import { anthillLedger, anthillTotals, hopperRankScoreSafe, spiderPathScore } from "../scoring";
import type {
  AnthillAnswerView,
  PublicMember,
  RoundResultsView,
  Snapshot,
  SpiderDraftView,
  SpiderPathView,
} from "./types";
import { loadGraph } from "./content";
import { findDirectEdge } from "./spider";

type GraphNames = Map<string, string>;

export async function buildSnapshot(
  db: Db,
  code: string,
  guestId: string | null,
  now = Date.now(),
): Promise<Snapshot | null> {
  const room = await db.one<Row>("select * from room where code = $1", [code]);
  if (!room) return null;
  return buildSnapshotForRoom(db, room as unknown as RoomRow, guestId, now);
}

export async function buildSnapshotForRoom(
  db: Db,
  room: RoomRow,
  guestId: string | null,
  now = Date.now(),
): Promise<Snapshot> {
  const q: QueryFn = db.query;

  const memberRows = await q<Row>(
    "select * from room_member where room_id = $1 order by joined_at asc",
    [room.id],
  );
  const members = memberRows as unknown as MemberRow[];
  const viewer = guestId ? members.find((m) => m.guest_id === guestId && !m.left_at) ?? null : null;

  const match = await db.one<Row>(
    "select * from match where room_id = $1 order by started_at desc limit 1",
    [room.id],
  );
  const matchRow = (match as unknown as MatchRow) ?? null;
  const rounds = matchRow
    ? ((await q<Row>("select * from round where match_id = $1 order by idx asc", [matchRow.id])) as unknown as RoundRow[])
    : [];
  const placements = matchRow
    ? await q<Row>(
        `select rp.* from round_placement rp join round r on r.id = rp.round_id where r.match_id = $1`,
        [matchRow.id],
      )
    : [];

  const points: Record<string, number> = {};
  for (const row of placements) {
    const id = String(row.member_id);
    points[id] = (points[id] ?? 0) + Number(row.match_points);
  }

  const currentRound = rounds.find((round) => !round.finalized_at) ?? rounds[rounds.length - 1] ?? null;
  const lastRound = rounds[rounds.length - 1] ?? null;
  const displayRound = matchRow?.status === "ended" ? lastRound : currentRound;

  const nicknameOf = (memberId: string | null | undefined) =>
    members.find((m) => m.id === memberId)?.nickname ?? "Someone";

  const publicMembers: PublicMember[] = members
    .filter((m) => !m.left_at)
    .map((m) => ({
      id: m.id,
      nickname: m.nickname,
      avatar: m.avatar,
      isHost: room.host_member_id === m.id,
      ready: m.ready,
      connected: isConnected(m, now),
      spectator: m.spectator,
      left: false,
    }));

  const snapshot: Snapshot = {
    protocol: PROTOCOL_VERSION,
    serverTime: now,
    contentVersion: CONTENT_VERSION,
    version: room.state_version,
    room: {
      code: room.code,
      status: room.status,
      settings: room.settings,
      settingsVersion: room.settings_version,
      hostMemberId: room.host_member_id,
    },
    you: {
      memberId: viewer?.id ?? null,
      nickname: viewer?.nickname ?? null,
      isHost: !!viewer && room.host_member_id === viewer.id,
      spectator: viewer?.spectator ?? false,
      ready: viewer?.ready ?? false,
    },
    members: publicMembers,
    match: null,
    round: null,
    feedback: null,
    serverIssues: [],
  };

  if (room.status === "closed") snapshot.serverIssues.push("This room has closed.");

  if (db.kind === "pglite" && process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    snapshot.serverIssues.push(
      "Running on the embedded local database. Set DATABASE_URL for a persistent multiplayer deployment.",
    );
  }

  if (matchRow) {
    const playedModes = [...new Set(rounds.map((round) => round.mode))];
    const roundSummaries = rounds.map((round) => ({
      index: round.idx + 1,
      mode: round.mode,
      finalizedAt: round.finalized_at,
      placements: placements
        .filter((row) => String(row.round_id) === round.id)
        .map((row) => ({
          memberId: String(row.member_id),
          placement: row.placement === null ? null : Number(row.placement),
          matchPoints: Number(row.match_points),
        })),
    }));
    const voteRows = await q<Row>("select * from favorite_vote where match_id = $1", [matchRow.id]);
    const voteOpen = matchRow.status === "voting" && !!matchRow.vote_ends_at && now < matchRow.vote_ends_at;
    const voteResult =
      matchRow.vote_result ??
      (matchRow.status === "voting" && matchRow.vote_ends_at && now >= matchRow.vote_ends_at
        ? { winners: [] as ModeId[], counts: {}, totalVotes: 0 }
        : null);

    snapshot.match = {
      id: matchRow.id,
      mode: matchRow.mode,
      status: matchRow.status,
      playlist: matchRow.playlist ?? [],
      roundIndex: Math.min((currentRound?.idx ?? rounds.length - 1) + 1, matchRow.round_count),
      roundCount: matchRow.round_count,
      startedAt: matchRow.started_at,
      points,
      roundSummaries,
      vote:
        matchRow.mode === "party"
          ? {
              open: voteOpen,
              endsAt: matchRow.vote_ends_at ?? 0,
              myVote: viewer
                ? (voteRows.find((row) => row.member_id === viewer.id)?.mode as string | undefined) ?? null
                : null,
              options: playedModes,
              result: voteResult
                ? {
                    winners: voteResult.winners ?? [],
                    counts: voteResult.counts ?? {},
                    totalVotes: voteResult.totalVotes ?? 0,
                  }
                : null,
            }
          : null,
    };
  }

  if (displayRound) {
    snapshot.round = await buildRoundView({
      q,
      db,
      room,
      match: matchRow,
      round: displayRound,
      members,
      viewer,
      now,
      nicknameOf,
    });
  }

  if (viewer && displayRound) {
    const attempt = await q<Row>(
      `select * from answer_attempt where round_id = $1 and member_id = $2
        order by admitted_at desc limit 1`,
      [displayRound.id, viewer.id],
    );
    if (attempt[0] && Number(attempt[0].admitted_at) > now - 30_000) {
      const code = String(attempt[0].result_code);
      snapshot.feedback = {
        code,
        message: attempt[0].message ? String(attempt[0].message) : "",
        tone: code.startsWith("ACCEPTED")
          ? "ok"
          : code === "AMBIGUOUS" || code === "ALREADY_SUBMITTED_BY_YOU" || code === "ALREADY_USED_THIS_ROUND"
            ? "warn"
            : "error",
        at: Number(attempt[0].admitted_at),
      };
    }
  }

  return snapshot;
}

async function buildRoundView(args: {
  q: QueryFn;
  db: Db;
  room: RoomRow;
  match: MatchRow | null;
  round: RoundRow;
  members: MemberRow[];
  viewer: MemberRow | null;
  now: number;
  nicknameOf: (id: string | null | undefined) => string;
}): Promise<NonNullable<Snapshot["round"]>> {
  const { q, round, members, viewer, now, nicknameOf, match } = args;
  const revealed = !!round.finalized_at;

  const view: NonNullable<Snapshot["round"]> = {
    id: round.id,
    index: round.idx + 1,
    total: match?.round_count ?? 1,
    mode: round.mode,
    phase: round.phase,
    startsAt: round.starts_at,
    endsAt: round.ends_at,
    resultsAt: round.results_at,
    countdownEndsAt: round.starts_at + 3000,
    prompt: {
      text: round.prompt.text ?? "",
      scope: round.prompt.scope ?? "",
    },
    results: null,
  };

  const placementRows = await q<Row>(
    "select * from round_placement where round_id = $1",
    [round.id],
  );

  if (round.phase === "results") {
    view.results = await buildResults({
      q,
      round,
      members,
      placementRows,
      nicknameOf,
      viewerIsHost: !!viewer && args.room.host_member_id === viewer.id,
      now,
    });
  }

  if (round.mode === "anthill") {
    const accepted = await q<Row>(
      `select aa.member_id, aa.entity_id, aa.base_value, aa.rarity, e.canonical_name
         from anthill_answer aa join entity e on e.id = aa.entity_id
        where aa.round_id = $1`,
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
    view.anthill = {
      leaderboard: [...totals.entries()]
        .map(([memberId, total]) => ({ memberId, total }))
        .sort((a, b) => b.total - a.total),
      rarityLegend: (Object.keys(RARITIES) as Rarity[]).map((rarity) => ({
        rarity,
        name: RARITIES[rarity].name,
        value: RARITIES[rarity].value,
      })),
      revealed: revealed
        ? members
            .filter((m) => accepted.some((row) => String(row.member_id) === m.id))
            .map((m) => ({
              memberId: m.id,
              answers: accepted
                .filter((row) => String(row.member_id) === m.id)
                .map((row) => {
                  const entry = ledger.find(
                    (item) => item.memberId === m.id && item.entityId === String(row.entity_id),
                  );
                  return {
                    entityId: String(row.entity_id),
                    name: String(row.canonical_name),
                    rarity: String(row.rarity) as Rarity,
                    rarityName: RARITIES[String(row.rarity) as Rarity]?.name ?? "Forager",
                    base: Number(row.base_value),
                    contribution: entry?.contribution ?? Number(row.base_value),
                    shared: entry?.shared ?? false,
                    sharers: entry?.sharers ?? 1,
                  } satisfies AnthillAnswerView;
                })
                .sort((a, b) => b.contribution - a.contribution),
            }))
            .sort((a, b) => {
              const total = (id: string) => totals.get(id) ?? 0;
              return total(b.memberId) - total(a.memberId);
            })
        : null,
    };

    if (viewer) {
      const mine = accepted.filter((row) => String(row.member_id) === viewer.id);
      view.prompt.myAnswers = mine.map((row) => {
        const entry = ledger.find(
          (item) => item.memberId === viewer.id && item.entityId === String(row.entity_id),
        );
        return {
          entityId: String(row.entity_id),
          name: String(row.canonical_name),
          rarity: String(row.rarity),
          rarityName: RARITIES[String(row.rarity) as Rarity]?.name ?? "Forager",
          base: Number(row.base_value),
          contribution: entry?.contribution ?? Number(row.base_value),
          shared: entry?.shared ?? false,
          sharers: entry?.sharers ?? 1,
        };
      });
    }
  }

  if (round.mode === "beehive") {
    const beehive = round.state?.beehive;
    view.beehive = {
      seatOrder: beehive?.seatOrder ?? round.participants ?? [],
      living: beehive?.living ?? [],
      eliminated: (beehive?.eliminations ?? []).map((entry) => ({
        memberId: entry.memberId,
        place: entry.place,
      })),
      activeMemberId: beehive?.activeMemberId ?? null,
      turnEndsAt: beehive?.turnEndsAt ?? null,
      turnId: beehive?.turnId ?? null,
      used: beehive?.used ?? [],
      categorySwaps: beehive?.swaps ?? 0,
      category: beehive?.promptText ?? round.prompt.text ?? "",
    };
    view.prompt.text = beehive?.promptText ?? round.prompt.text ?? "";
  }

  if (round.mode === "spider") {
    const graph = await loadGraph(q);
    const startId = String(round.prompt.meta?.startEntity ?? "");
    const targetId = String(round.prompt.meta?.targetEntity ?? "");
    const start = graph.entities.get(startId);
    const target = graph.entities.get(targetId);
    const paths = await q<Row>("select * from spider_path where round_id = $1 order by strand_count asc, accepted_at asc", [
      round.id,
    ]);
    const toPath = (row: Row): SpiderPathView => {
      const nodes = (row.entity_ids as string[]) ?? [];
      const edgeIds = (row.edge_ids as string[]) ?? [];
      return {
        memberId: String(row.member_id),
        nodes: nodes.map((id) => ({ id, name: graph.entities.get(id)?.name ?? id })),
        edges: edgeIds.map((id, index) => {
          const edge = graph.byId.get(id);
          if (!edge) return { id, label: "relationship", source: "", predicate: "", direction: "forward" as const };
          const forward = edge.from_entity === nodes[index];
          return {
            id,
            label: forward ? edge.forward_label : (edge.inverse_label ?? edge.forward_label),
            source: edge.source,
            predicate: edge.predicate,
            direction: forward ? ("forward" as const) : ("inverse" as const),
          };
        }),
        strands: Number(row.strand_count),
        acceptedAt: Number(row.accepted_at),
      };
    };
    const mine = viewer ? paths.find((row) => String(row.member_id) === viewer.id) : null;
    const rawDraft = viewer ? round.state?.drafts?.[viewer.id] : null;
    let draft: SpiderDraftView | null = null;
    if (rawDraft) {
      const nodes = rawDraft.nodes.map((id) => ({ id, name: graph.entities.get(id)?.name ?? id }));
      const edges: Array<{ label: string; source: string; direction: "forward" | "inverse" }> = [];
      let broken = false;
      for (let i = 0; i < rawDraft.nodes.length - 1; i += 1) {
        const edge = findDirectEdge(graph, rawDraft.nodes[i], rawDraft.nodes[i + 1]);
        if (edge) edges.push({ label: edge.label, source: edge.source, direction: edge.direction });
        else {
          broken = true;
          edges.push({ label: "not in this round's dataset", source: "", direction: "forward" });
        }
      }
      draft = { nodes, edges, broken };
    }
    view.spider = {
      start: { id: startId, name: start?.name ?? startId, type: start?.type ?? "entity" },
      target: { id: targetId, name: target?.name ?? targetId, type: target?.type ?? "entity" },
      allowedPredicates: (round.prompt.meta?.allowedPredicates as string[]) ?? [],
      myBest: mine ? toPath(mine) : null,
      myDraft: draft,
      revealed: revealed
        ? paths.map((row) => toPath(row))
        : null,
    };
    view.prompt.text = `Connect ${start?.name ?? "start"} to ${target?.name ?? "target"}`;
  }

  if (round.mode === "hopper") {
    const questionMeta = (round.prompt.meta ?? {}) as Record<string, unknown>;
    const sourceMeta = (questionMeta.sourceMeta ?? {}) as Record<string, unknown>;
    const answers = await q<Row>(
      `select ha.member_id, hb.id as bucket_id, hb.canonical, hb.rank
         from hopper_answer ha join hopper_bucket hb on hb.id = ha.bucket_id
        where ha.round_id = $1`,
      [round.id],
    );
    const mine = viewer ? answers.find((row) => String(row.member_id) === viewer.id) : null;
    const buckets = await q<Row>(
      "select id, canonical, rank from hopper_bucket where question_id = $1 order by rank",
      [round.prompt.promptId],
    );
    const ranking = buckets.map((row) => {
      const rank = Number(row.rank);
      return {
        rank,
        canonical: String(row.canonical),
        score: hopperRankScoreSafe(rank),
        players: answers
          .filter((answer) => String(answer.bucket_id) === String(row.id))
          .map((answer) => nicknameOf(String(answer.member_id))),
      };
    });
    view.hopper = {
      question: round.prompt.text ?? "",
      scope: round.prompt.scope ?? "",
      sourceKind: String(questionMeta.sourceKind ?? "editorial_estimate"),
      sourceLabel:
        String(sourceMeta.label ?? "") ||
        (String(questionMeta.sourceKind) === "editorial_estimate"
          ? "Estimated popular answers"
          : "Previous player responses"),
      savedCount: answers.length,
      mySaved: mine
        ? {
            bucketId: String(mine.bucket_id),
            text: String(mine.canonical),
          }
        : null,
      reveal: revealed
        ? {
            ranking,
            sourceLabel:
              String(sourceMeta.label ?? "") ||
              (String(questionMeta.sourceKind) === "editorial_estimate"
                ? "Estimated popular answers"
                : "Previous player responses"),
            sourceNote: String(sourceMeta.note ?? "Editorially reviewed ranking. Not a survey."),
            myScore: mine ? hopperRankScoreSafe(Number(mine.rank)) : 0,
          }
        : null,
    };
    view.prompt.text = round.prompt.text ?? "";
  }

  return view;
}

async function buildResults(args: {
  q: QueryFn;
  round: RoundRow;
  members: MemberRow[];
  placementRows: Row[];
  nicknameOf: (id: string | null | undefined) => string;
  viewerIsHost: boolean;
  now: number;
}): Promise<RoundResultsView> {
  const { round, members, placementRows, nicknameOf, now } = args;
  const placements = placementRows.map((row) => ({
    memberId: String(row.member_id),
    placement: row.placement === null ? null : Number(row.placement),
    matchPoints: Number(row.match_points),
    performance: (row.performance ?? {}) as Record<string, unknown>,
  }));

  const sorted = [...placements].sort((a, b) => {
    if (a.placement === null && b.placement === null) return 0;
    if (a.placement === null) return 1;
    if (b.placement === null) return -1;
    return a.placement - b.placement;
  });

  const detailFor = (performance: Record<string, unknown>): string => {
    if (round.mode === "anthill") {
      const total = Number(performance.total ?? 0);
      const count = Number(performance.acceptedCount ?? 0);
      return count ? `${total} harvest · ${count} answer${count === 1 ? "" : "s"}` : "No valid answers";
    }
    if (round.mode === "beehive") {
      return performance.survived
        ? "Last one standing"
        : `Out at ${Number(performance.eliminatedAt ?? 0)} players`;
    }
    if (round.mode === "spider") {
      const strands = performance.strands;
      return strands ? `${strands} strand${Number(strands) === 1 ? "" : "s"} · ${Number(performance.score ?? 0)} path score` : "No completed path";
    }
    if (round.mode === "hopper") {
      const answer = performance.answer;
      return answer ? `${String(answer)} · rank ${Number(performance.rank ?? 0)}` : "No saved answer";
    }
    return "";
  };

  const reveal: Record<string, unknown> = {};
  if (round.mode === "hopper") {
    const buckets = await args.q<Row>(
      "select id, canonical, rank from hopper_bucket where question_id = $1 order by rank",
      [round.prompt.promptId],
    );
    const answers = await args.q<Row>(
      `select ha.member_id, ha.bucket_id from hopper_answer ha where ha.round_id = $1`,
      [round.id],
    );
    reveal.ranking = buckets.map((row) => ({
      rank: Number(row.rank),
      canonical: String(row.canonical),
      score: hopperRankScoreSafe(Number(row.rank)),
      players: answers
        .filter((answer) => String(answer.bucket_id) === String(row.id))
        .map((answer) => nicknameOf(String(answer.member_id))),
    }));
    reveal.answers = answers.map((answer) => ({
      memberId: String(answer.member_id),
      nickname: nicknameOf(String(answer.member_id)),
      canonical: String(buckets.find((bucket) => String(bucket.id) === String(answer.bucket_id))?.canonical ?? ""),
      rank: Number(buckets.find((bucket) => String(bucket.id) === String(answer.bucket_id))?.rank ?? 0),
    }));
    const meta = (round.prompt.meta ?? {}) as Record<string, unknown>;
    const sourceMeta = (meta.sourceMeta ?? {}) as Record<string, unknown>;
    reveal.sourceLabel =
      String(sourceMeta.label ?? "") ||
      (String(meta.sourceKind) === "editorial_estimate" ? "Estimated popular answers" : "Previous player responses");
    reveal.sourceNote = String(sourceMeta.note ?? "Editorially reviewed ranking. Not a survey.");
  }
  if (round.mode === "beehive") {
    const beehive = round.state?.beehive;
    reveal.eliminations = (beehive?.eliminations ?? []).map((entry) => ({
      ...entry,
      nickname: nicknameOf(entry.memberId),
    }));
    reveal.survivor = beehive?.living?.[0] ?? null;
    reveal.used = beehive?.used ?? [];
  }
  if (round.mode === "spider") {
    const graph = await loadGraph(args.q);
    const paths = await args.q<Row>(
      "select * from spider_path where round_id = $1 order by strand_count asc, accepted_at asc",
      [round.id],
    );
    reveal.paths = paths.map((row) => {
      const nodes = (row.entity_ids as string[]) ?? [];
      const edgeIds = (row.edge_ids as string[]) ?? [];
      return {
        memberId: String(row.member_id),
        nickname: nicknameOf(String(row.member_id)),
        strands: Number(row.strand_count),
        score: spiderPathScore(Number(row.strand_count)),
        nodes: nodes.map((id) => graph.entities.get(id)?.name ?? id),
        edges: edgeIds.map((id, index) => {
          const edge = graph.byId.get(id);
          if (!edge) return { label: "relationship", source: "" };
          const forward = edge.from_entity === nodes[index];
          return {
            label: forward ? edge.forward_label : (edge.inverse_label ?? edge.forward_label),
            source: edge.source,
          };
        }),
      };
    });
    reveal.shortest = paths.length ? Number(paths[0].strand_count) : null;
  }

  void members;

  return {
    mode: round.mode,
    placements,
    podium: sorted.map((row) => ({
      memberId: row.memberId,
      placement: row.placement,
      matchPoints: row.matchPoints,
      detail: detailFor(row.performance),
    })),
    reveal,
    nextAt: round.results_at ?? now,
    canAdvance: args.viewerIsHost && !!round.finalized_at && now - round.finalized_at >= 3000,
  };
}

export function modeName(mode: ModeId): string {
  return MODES[mode]?.name ?? mode;
}
