import { hopperScore, placementPoints, RARITIES, type Rarity } from "./config";

export type ScoreRow = { memberId: string; score: number };

/**
 * Standard competition ranking: equal scores share a place and the next place
 * skips the occupied positions (1, 2, 2, 4).
 * Rows are sorted for display but ties keep equal placements.
 */
export function competitionRanking(rows: ScoreRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.memberId.localeCompare(b.memberId));
  const placements = new Map<string, number>();
  let lastScore: number | null = null;
  let lastPlace = 0;
  sorted.forEach((row, index) => {
    const place = lastScore !== null && row.score === lastScore ? lastPlace : index + 1;
    placements.set(row.memberId, place);
    lastScore = row.score;
    lastPlace = place;
  });
  return placements;
}

/**
 * Anthill contributions under the fixed 50% sharing rule.
 * One matching player: full base value. Two or more: every matching player gets
 * half, once. A third or twentieth match never reduces it further.
 */
export type AnthillAccepted = {
  memberId: string;
  entityId: string;
  base: number;
};

export type AnthillContribution = {
  memberId: string;
  entityId: string;
  base: number;
  rarity: Rarity;
  shared: boolean;
  sharers: number;
  contribution: number;
};

export function anthillLedger(accepted: AnthillAccepted[]): AnthillContribution[] {
  const distinct = new Map<string, Set<string>>();
  for (const row of accepted) {
    const set = distinct.get(row.entityId) ?? new Set<string>();
    set.add(row.memberId);
    distinct.set(row.entityId, set);
  }

  return accepted.map((row) => {
    const sharers = distinct.get(row.entityId)?.size ?? 1;
    const shared = sharers >= 2;
    const rarity = rarityForValue(row.base);
    return {
      memberId: row.memberId,
      entityId: row.entityId,
      base: row.base,
      rarity,
      shared,
      sharers,
      contribution: shared ? row.base / 2 : row.base,
    };
  });
}

export function hopperRankScoreSafe(rank: number): number {
  return hopperScore(rank);
}

export function rarityForValue(value: number): Rarity {
  const found = (Object.keys(RARITIES) as Rarity[]).find(
    (key) => RARITIES[key].value === value,
  );
  return found ?? "forager";
}

export function anthillTotals(ledger: AnthillContribution[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of ledger) {
    totals.set(row.memberId, (totals.get(row.memberId) ?? 0) + row.contribution);
  }
  return totals;
}

/** Spider Web path score. Not added directly to match points. */
export function spiderPathScore(strands: number): number {
  if (strands <= 0) return 0;
  return Math.floor(1000 / strands);
}

/**
 * Award match points for scored placements. Rows without a placement
 * (no participation) receive zero and are not shown as placed.
 */
export function awardPlacements(
  placements: Map<string, number>,
  eligible: Set<string>,
): Map<string, number> {
  const points = new Map<string, number>();
  for (const memberId of eligible) {
    const place = placements.get(memberId);
    points.set(memberId, place ? placementPoints(place) : 0);
  }
  return points;
}

export function formatScore(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function ordinal(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}
