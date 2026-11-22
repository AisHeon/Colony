import "server-only";
import { CONTENT_VERSION, type Rarity } from "../config";
import type { QueryFn, Row } from "../db";
import {
  buildAnswerIndex,
  type AnswerCandidate,
  type AnswerIndex,
  type GlobalEntity,
  type PromptSpec,
} from "../validation";

export type PromptRow = {
  id: string;
  kind: string;
  text: string;
  scope: string;
  pack: string;
  family_friendly: boolean;
  version: string;
  meta: {
    scopeNoun?: string;
    expectedTypes?: string[];
    rejectTypes?: Record<string, string>;
    answerCount?: number;
  };
};

export type PromptBundle = {
  spec: PromptSpec;
  index: AnswerIndex;
  prompt: PromptRow;
  answerCount: number;
};

type GlobalCache = { version: string; byEntity: Map<string, GlobalEntity>; list: GlobalEntity[] };

const globalCache = new Map<string, GlobalCache>();

export async function getGlobalEntities(q: QueryFn): Promise<GlobalCache> {
  const cached = globalCache.get(CONTENT_VERSION);
  if (cached) return cached;

  const rows = await q<Row>(
    "select id, canonical_name, type, description from entity order by canonical_name",
  );
  const list: GlobalEntity[] = rows.map((row) => ({
    entityId: String(row.id),
    name: String(row.canonical_name),
    type: String(row.type),
    description: row.description ? String(row.description) : undefined,
  }));
  const byEntity = new Map(list.map((entity) => [entity.entityId, entity]));
  const value = { version: CONTENT_VERSION, byEntity, list };
  globalCache.set(CONTENT_VERSION, value);
  return value;
}

export async function loadPromptBundle(q: QueryFn, promptId: string): Promise<PromptBundle | null> {
  const promptRow = await q<Row>("select * from prompt where id = $1", [promptId]);
  const prompt = promptRow[0] as unknown as PromptRow | undefined;
  if (!prompt) return null;

  const rows = await q<Row>(
    `select pa.entity_id, pa.rarity, e.canonical_name, e.type, e.description,
            coalesce(string_agg(ea.display, '|'), '') as aliases
       from prompt_answer pa
       join entity e on e.id = pa.entity_id
       left join entity_alias ea on ea.entity_id = e.id
      where pa.prompt_id = $1
      group by pa.entity_id, pa.rarity, e.canonical_name, e.type, e.description`,
    [promptId],
  );

  const candidates: AnswerCandidate[] = rows.map((row) => ({
    entityId: String(row.entity_id),
    name: String(row.canonical_name),
    aliases: String(row.aliases ?? "")
      .split("|")
      .map((alias) => alias.trim())
      .filter(Boolean),
    rarity: String(row.rarity) as Rarity,
    type: String(row.type),
    description: row.description ? String(row.description) : undefined,
  }));

  const globals = await getGlobalEntities(q);
  const spec: PromptSpec = {
    id: prompt.id,
    text: prompt.text,
    scope: prompt.scope,
    scopeNoun: prompt.meta?.scopeNoun ?? "answer",
    expectedTypes: prompt.meta?.expectedTypes ?? candidates.map((c) => c.type),
    rejectTypes: prompt.meta?.rejectTypes,
  };

  return {
    prompt,
    spec,
    index: buildAnswerIndex(candidates, globals.list),
    answerCount: candidates.length,
  };
}

export async function pickPrompt(
  q: QueryFn,
  opts: { kind: "anthill" | "beehive"; packs: string[]; familyFriendly: boolean; excludeIds: string[]; minAnswers?: number },
): Promise<PromptBundle | null> {
  const rows = await q<Row>(
    `select p.id, (select count(*) from prompt_answer pa where pa.prompt_id = p.id) as answer_count
       from prompt p
      where p.kind = $1
        and p.family_friendly = $2
        and p.pack = any($3::text[])
        and not (p.id = any($4::text[]))
      order by random()
      limit 24`,
    [opts.kind, opts.familyFriendly, opts.packs, opts.excludeIds],
  );

  const minAnswers = opts.minAnswers ?? (opts.kind === "beehive" ? 80 : 12);
  for (const row of rows) {
    if (Number(row.answer_count) < minAnswers) continue;
    const bundle = await loadPromptBundle(q, String(row.id));
    if (bundle) return bundle;
  }
  return null;
}

export type HopperQuestionRow = {
  id: string;
  text: string;
  scope: string;
  source_kind: string;
  source_meta: { label?: string; note?: string };
  version: string;
};

export type HopperBucket = {
  id: string;
  canonical: string;
  rank: number;
  aliases: string[];
};

export async function pickHopperQuestion(
  q: QueryFn,
  excludeIds: string[],
): Promise<{ question: HopperQuestionRow; buckets: HopperBucket[]; index: AnswerIndex } | null> {
  const rows = await q<Row>(
    "select * from hopper_question where not (id = any($1::text[])) order by random() limit 1",
    [excludeIds],
  );
  const question = rows[0] as unknown as HopperQuestionRow | undefined;
  if (!question) return null;
  return loadHopperQuestion(q, question.id);
}

export async function loadHopperQuestion(
  q: QueryFn,
  id: string,
): Promise<{ question: HopperQuestionRow; buckets: HopperBucket[]; index: AnswerIndex } | null> {
  const rows = await q<Row>("select * from hopper_question where id = $1", [id]);
  const question = rows[0] as unknown as HopperQuestionRow | undefined;
  if (!question) return null;
  const bucketRows = await q<Row>(
    "select id, canonical, rank, aliases from hopper_bucket where question_id = $1 order by rank",
    [id],
  );
  const buckets: HopperBucket[] = bucketRows.map((row) => ({
    id: String(row.id),
    canonical: String(row.canonical),
    rank: Number(row.rank),
    aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
  }));
  const candidates: AnswerCandidate[] = buckets.map((bucket) => ({
    entityId: bucket.id,
    name: bucket.canonical,
    aliases: bucket.aliases,
    rarity: "forager",
    type: "answer",
  }));
  return { question, buckets, index: buildAnswerIndex(candidates) };
}

export type PuzzleRow = {
  id: string;
  start_entity: string;
  target_entity: string;
  shortest_distance: number;
  allowed_predicates: string[];
  source: string;
  version: string;
};

export async function pickPuzzle(q: QueryFn, excludeIds: string[]): Promise<PuzzleRow | null> {
  const rows = await q<Row>(
    "select * from puzzle where not (id = any($1::text[])) order by random() limit 1",
    [excludeIds],
  );
  return (rows[0] as unknown as PuzzleRow) ?? null;
}

export type GraphEdge = {
  id: string;
  from_entity: string;
  predicate: string;
  to_entity: string;
  forward_label: string;
  inverse_label: string | null;
  source: string;
};

export type GraphData = {
  edges: GraphEdge[];
  byId: Map<string, GraphEdge>;
  entities: Map<string, GlobalEntity>;
};

const graphCache = new Map<string, GraphData>();

export async function loadGraph(q: QueryFn): Promise<GraphData> {
  const cached = graphCache.get(CONTENT_VERSION);
  if (cached) return cached;
  const edges = await q<Row>("select * from graph_edge where verified = true");
  const globals = await getGlobalEntities(q);
  const data: GraphData = {
    edges: edges.map((row) => ({
      id: String(row.id),
      from_entity: String(row.from_entity),
      predicate: String(row.predicate),
      to_entity: String(row.to_entity),
      forward_label: String(row.forward_label),
      inverse_label: row.inverse_label ? String(row.inverse_label) : null,
      source: String(row.source),
    })),
    byId: new Map(),
    entities: globals.byEntity,
  };
  for (const edge of data.edges) data.byId.set(edge.id, edge);
  graphCache.set(CONTENT_VERSION, data);
  return data;
}

export async function searchEntities(
  q: QueryFn,
  term: string,
  limit = 8,
  graphOnly = false,
): Promise<Array<{ id: string; name: string; type: string; description?: string }>> {
  const cleaned = term.trim().toLowerCase().replace(/[%_]/g, "");
  if (cleaned.length < 2) return [];
  const rows = await q<Row>(
    `select e.id, e.canonical_name, e.type, e.description
       from entity e
      where lower(e.canonical_name) like $1
        and ($3 = false or exists (
          select 1 from graph_edge ge where ge.from_entity = e.id or ge.to_entity = e.id
        ))
      order by length(e.canonical_name), e.canonical_name
      limit $2`,
    [`%${cleaned}%`, limit, graphOnly],
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.canonical_name),
    type: String(row.type),
    description: row.description ? String(row.description) : undefined,
  }));
}

export function resetContentCaches() {
  globalCache.clear();
  graphCache.clear();
}
