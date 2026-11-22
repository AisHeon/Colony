/**
 * Verifies the seeded content against the published content requirements.
 * Run after `npm run db:seed`:
 *   npx tsx scripts/verify-content.mts
 */
import { getDb } from "../src/lib/db";

const db = await getDb();
const failures: string[] = [];
const lines: string[] = [];

function check(ok: boolean, message: string) {
  lines.push(`${ok ? "ok  " : "FAIL"}  ${message}`);
  if (!ok) failures.push(message);
}

const totals = await db.one<{
  entities: number;
  aliases: number;
  prompts: number;
  answers: number;
  hopper: number;
  buckets: number;
  edges: number;
  puzzles: number;
}>(
  `select
     (select count(*) from entity) as entities,
     (select count(*) from entity_alias) as aliases,
     (select count(*) from prompt) as prompts,
     (select count(*) from prompt_answer) as answers,
     (select count(*) from hopper_question) as hopper,
     (select count(*) from hopper_bucket) as buckets,
     (select count(*) from graph_edge) as edges,
     (select count(*) from puzzle) as puzzles`,
);
lines.push(
  `Content: ${totals!.entities} entities, ${totals!.aliases} aliases, ${totals!.prompts} prompts, ` +
    `${totals!.answers} answer links, ${totals!.hopper} Hopper questions, ${totals!.buckets} Hopper buckets, ` +
    `${totals!.edges} graph edges, ${totals!.puzzles} Spider puzzles`,
);

const byKind = await db.query<{ kind: string; prompts: number; answers: number }>(
  `select p.kind, count(distinct p.id) as prompts, count(pa.entity_id) as answers
     from prompt p left join prompt_answer pa on pa.prompt_id = p.id
    group by p.kind order by p.kind`,
);
for (const row of byKind) {
  lines.push(`Mode ${row.kind}: ${row.prompts} prompts, ${row.answers} accepted answers`);
}

const anthill = byKind.find((row) => row.kind === "anthill");
check(Number(totals!.answers) >= 5000, "at least 5,000 accepted answer links");
check(!!anthill && Number(anthill.prompts) >= 60, "at least 60 Anthill prompts");

const beehive = byKind.find((row) => row.kind === "beehive");
check(!!beehive && Number(beehive.prompts) >= 9, "at least 9 Beehive categories");

const thinPools = await db.query<{ id: string; answers: number }>(
  `select p.id, count(pa.entity_id) as answers
     from prompt p left join prompt_answer pa on pa.prompt_id = p.id
    where p.kind = 'beehive'
    group by p.id
   having count(pa.entity_id) < 100
    order by answers`,
);
check(thinPools.length === 0, "every Beehive pool has at least 100 answers");

const anthillThin = await db.query<{ id: string; answers: number }>(
  `select p.id, count(pa.entity_id) as answers
     from prompt p left join prompt_answer pa on pa.prompt_id = p.id
    where p.kind = 'anthill'
    group by p.id
   having count(pa.entity_id) < 8
    order by answers`,
);
// Eight is the floor because the Solar System prompt is complete at eight planets.
check(anthillThin.length === 0, "every Anthill prompt has at least 8 answers");

const hopperThin = await db.query<{ id: string; buckets: number }>(
  `select q.id, count(b.id) as buckets
     from hopper_question q left join hopper_bucket b on b.question_id = q.id
    group by q.id having count(b.id) < 12 order by buckets`,
);
check(hopperThin.length === 0, "every Hopper question has at least 12 ranked buckets");
check(Number(totals!.hopper) >= 50, "at least 50 Hopper questions");
check(Number(totals!.buckets) >= 600, "at least 600 Hopper buckets");

const duplicateAnswers = await db.query<{ prompt_id: string; name: string; n: number }>(
  `select pa.prompt_id, lower(e.canonical_name) as name, count(*) as n
     from prompt_answer pa join entity e on e.id = pa.entity_id
    group by pa.prompt_id, lower(e.canonical_name) having count(*) > 1`,
);
check(duplicateAnswers.length === 0, "no duplicate canonical names inside a prompt");

const ambiguousAliases = await db.query<{ alias_norm: string; n: number }>(
  `select alias_norm, count(distinct entity_id) as n
     from entity_alias group by alias_norm having count(distinct entity_id) > 1`,
);
check(ambiguousAliases.length === 0, "no alias resolves to more than one entity");

const danglingAnswers = await db.query<{ entity_id: string }>(
  `select distinct pa.entity_id from prompt_answer pa
     left join entity e on e.id = pa.entity_id where e.id is null`,
);
check(danglingAnswers.length === 0, "every prompt answer points at a real entity");

// Spider graphs: every puzzle endpoint exists and is reachable in the permitted
// direction (forward edge or a labelled inverse).
const edges = await db.query<{
  from_entity: string;
  to_entity: string;
  inverse_label: string | null;
}>("select from_entity, to_entity, inverse_label from graph_edge");
const adjacency = new Map<string, Set<string>>();
for (const edge of edges) {
  if (!adjacency.has(edge.from_entity)) adjacency.set(edge.from_entity, new Set());
  adjacency.get(edge.from_entity)!.add(edge.to_entity);
  if (edge.inverse_label) {
    if (!adjacency.has(edge.to_entity)) adjacency.set(edge.to_entity, new Set());
    adjacency.get(edge.to_entity)!.add(edge.from_entity);
  }
}
function reachable(start: string, target: string): boolean {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift()!;
    if (node === target) return true;
    for (const next of adjacency.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

const puzzles = await db.query<{ id: string; start_entity: string; target_entity: string }>(
  "select id, start_entity, target_entity from puzzle",
);
const brokenPuzzles = puzzles.filter(
  (puzzle) => puzzle.start_entity === puzzle.target_entity || !reachable(puzzle.start_entity, puzzle.target_entity),
);
check(brokenPuzzles.length === 0, "every Spider puzzle is solvable in the permitted direction");
check(Number(totals!.puzzles) >= 25, "at least 25 Spider puzzles");

const edgesWithoutSource = await db.query<{ id: string }>(
  "select id from graph_edge where source is null or length(trim(source)) = 0",
);
check(edgesWithoutSource.length === 0, "every graph edge records its source");

console.log(lines.join("\n"));
if (failures.length) {
  console.error(`\n${failures.length} content check(s) failed.`);
  process.exit(1);
}
console.log("\nAll content checks passed.");
