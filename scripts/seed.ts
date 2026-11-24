/**
 * Seeds content tables from content/catalog. Idempotent: content tables are
 * cleared and rewritten in one transaction, so a re-run always matches the
 * catalog exactly.
 *
 * Usage: npm run db:seed
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { normalizeKey } from "../src/lib/normalize";
import { CONTENT_VERSION, RARITY_SPLIT, type Rarity } from "../src/lib/config";
import { ENTITY_SEEDS, entitySlug } from "../content/catalog/entities";
import { COUNTRIES, CONTINENT_LABELS } from "../content/catalog/countries";
import { PROMPTS } from "../content/catalog/prompts";
import { HOPPER_QUESTIONS } from "../content/catalog/hopper";
import { GRAPH_ENTITIES, GRAPH_EDGES, PUZZLES } from "../content/catalog/graph";
import { HISTORY_GROUPS, HISTORY_POOL_GROUPS, HISTORY_PROMPTS } from "../content/catalog/history";
import { WORDPLAY_PROMPTS } from "../content/catalog/wordplay";

type SeedEntity = {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  attrs: Record<string, string>;
  description?: string;
};

/** Places every legacy prompt in the closest player-facing topic pack. */
function packForPrompt(id: string): string {
  if (id.includes("pokemon") || id.includes("minecraft") || id.includes("game_console")) return "video_games";
  if (id.includes("disney") || id.includes("superhero") || id.includes("star_wars") || id.includes("hp_")) return "movies_tv";
  if (id.includes("instrument")) return "music";
  if (id.includes("sport")) return "sports";
  if (id.includes("candy") || id.includes("fruit") || id.includes("vegetable") || id.includes("pizza") || id.includes("ice_cream") || id.includes("breakfast")) return "food";
  if (id.includes("dog_breed") || id.includes("cat_breed") || id.endsWith(".animal")) return "animals";
  if (id.includes("greek_figure")) return "mythology";
  if (id.includes("planet") || id.includes("moon")) return "space";
  if (id.includes("element") || id.includes("bone") || id.includes("dinosaur") || id.includes("gemstone")) return "science";
  if (id.includes("country") || id.includes("capital") || id.includes("city") || id.includes("us_state") || id.includes("river") || id.includes("mountain") || id.includes("sea") || id.includes("volcano") || id.includes("currency")) return "geography";
  if (id.includes("tree") || id.includes("flower")) return "science";
  return "classics";
}

async function main() {
  const db = await getDb();
  console.log(`[seed] database: ${db.kind}`);

  if (process.argv.includes("--if-needed")) {
    const meta = await db.one<{ value: unknown }>("select value from content_meta where key = 'version'");
    const value =
      typeof meta?.value === "string" ? (JSON.parse(meta.value) as { version?: string }) : (meta?.value as { version?: string } | undefined);
    if (value?.version === CONTENT_VERSION) {
      console.log(`[seed] content ${CONTENT_VERSION} already current; skipping`);
      return;
    }
    console.log(`[seed] upgrading content ${value?.version ?? "missing"} -> ${CONTENT_VERSION}`);
  }

  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await db.exec(schema);

  // 1. Entities -------------------------------------------------------------
  const entities: SeedEntity[] = [];
  const ids = new Set<string>();
  const add = (entity: SeedEntity) => {
    if (ids.has(entity.id)) return;
    ids.add(entity.id);
    entities.push(entity);
  };

  for (const entity of ENTITY_SEEDS) add(entity);

  for (const [country, capital, continent, landlocked] of COUNTRIES) {
    add({
      id: `country_${entitySlug(country)}`,
      name: country,
      type: "country",
      aliases: [],
      attrs: { continent, landlocked: String(landlocked) },
    });
    add({
      id: `capital_${entitySlug(capital)}`,
      name: capital,
      type: "capital",
      aliases: [],
      attrs: { continent, country: `country_${entitySlug(country)}` },
      description: `Capital of ${country}.`,
    });
  }

  for (const entity of GRAPH_ENTITIES) {
    add({ ...entity, aliases: [], attrs: {} });
  }

  // History entities are generated from the compact answer groups. One name
  // can appear in several prompts, but only one entity row is created for it.
  const historyByGroup = new Map<string, SeedEntity[]>();
  for (const [groupId, group] of Object.entries(HISTORY_GROUPS)) {
    const pool: SeedEntity[] = [];
    const seenInGroup = new Set<string>();
    for (const raw of group.answers) {
      const [namePart, aliasPart = ""] = raw.split("|").map((part) => part.trim());
      if (!namePart) continue;
      const key = normalizeKey(namePart);
      if (seenInGroup.has(key)) continue;
      seenInGroup.add(key);
      const id = `hist_${entitySlug(namePart)}`;
      let entity = entities.find((entry) => entry.id === id);
      if (!entity) {
        entity = {
          id,
          name: namePart,
          type: `history_${group.kind}`,
          aliases: aliasPart
            .split(",")
            .map((alias) => alias.trim())
            .filter(Boolean),
          attrs: {},
          description: `Historical ${group.kind}.`,
        };
        add(entity);
      }
      pool.push(entity);
    }
    historyByGroup.set(groupId, pool);
  }

  const wordplayEntity = new Map<string, SeedEntity>();
  for (const prompt of WORDPLAY_PROMPTS) {
    for (const raw of prompt.answers) {
      const name = raw.trim();
      const key = normalizeKey(name);
      if (!name || wordplayEntity.has(key)) continue;
      const id = `word_${entitySlug(name)}`;
      let entity = entities.find((entry) => entry.id === id);
      if (!entity) {
        entity = { id, name, type: "wordplay_answer", aliases: [], attrs: {}, description: "Wordplay answer." };
        add(entity);
      }
      wordplayEntity.set(key, entity);
    }
  }

  // 2. Prompt answer selection ---------------------------------------------
  const byType = new Map<string, SeedEntity[]>();
  for (const entity of entities) {
    const list = byType.get(entity.type) ?? [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  const selectAnswers = (prompt: (typeof PROMPTS)[number]): SeedEntity[] => {
    let pool = byType.get(prompt.type) ?? [];
    if (prompt.attrs) {
      for (const [key, value] of Object.entries(prompt.attrs)) {
        pool = pool.filter((entity) => entity.attrs[key] === value);
      }
    }
    if (prompt.initial) {
      pool = pool.filter((entity) => entity.name.toUpperCase().startsWith(prompt.initial as string));
    }
    // Distinct entity ids can share a display name (for example a graph node and
    // a prompt entity). One name must appear once per pool, or the answer index
    // would treat the canonical answer itself as ambiguous.
    const seen = new Set<string>();
    return pool.filter((entity) => {
      const key = normalizeKey(entity.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const selectHistoryAnswers = (prompt: (typeof HISTORY_PROMPTS)[number]): SeedEntity[] => {
    const groupIds = prompt.pool ? HISTORY_POOL_GROUPS[prompt.pool] : [prompt.group];
    const pool: SeedEntity[] = [];
    const seen = new Set<string>();
    for (const groupId of groupIds) {
      for (const entity of historyByGroup.get(groupId) ?? []) {
        if (seen.has(entity.id)) continue;
        seen.add(entity.id);
        pool.push(entity);
      }
    }
    const seenNames = new Set<string>();
    return pool.filter((entity) => {
      const key = normalizeKey(entity.name);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
  };

  const assignRarity = (count: number, index: number): Rarity => {
    if (count === 0) return "forager";
    const ratio = index / count;
    let cumulative = 0;
    for (const [rarity, share] of RARITY_SPLIT) {
      cumulative += share;
      if (ratio < cumulative) return rarity;
    }
    return "apex";
  };

  // 3. Write content -------------------------------------------------------
  await db.transaction(async (q) => {
    // Clear in FK-safe order.
    const tables = [
      "prompt_answer",
      "prompt",
      "entity_alias",
      "graph_edge",
      "puzzle",
      "hopper_bucket",
      "hopper_question",
      "entity",
      "content_meta",
    ];
    for (const table of tables) await q(`delete from ${table}`);
    await q("delete from answer_stats");

    for (const entity of entities) {
      await q(
        "insert into entity (id, canonical_name, type, description, meta) values ($1,$2,$3,$4,$5::jsonb)",
        [entity.id, entity.name, entity.type, entity.description ?? null, JSON.stringify(entity.attrs)],
      );
      const seen = new Set<string>();
      for (const alias of entity.aliases) {
        const key = normalizeKey(alias);
        if (!key || key === normalizeKey(entity.name) || seen.has(key)) continue;
        seen.add(key);
        await q(
          "insert into entity_alias (entity_id, alias_norm, display) values ($1,$2,$3) on conflict do nothing",
          [entity.id, key, alias],
        );
      }
    }

    let promptAnswerCount = 0;
    for (const prompt of PROMPTS) {
      const answers = selectAnswers(prompt);
      if (answers.length === 0) {
        console.warn(`[seed] prompt ${prompt.id} has no answers; skipping`);
        continue;
      }
      await q(
        `insert into prompt (id, kind, text, scope, pack, family_friendly, version, meta)
         values ($1,$2,$3,$4,$5,true,$6,$7::jsonb)`,
        [
          prompt.id,
          prompt.kind,
          prompt.text,
          prompt.scope,
          packForPrompt(prompt.id),
          CONTENT_VERSION,
          JSON.stringify({
            scopeNoun: prompt.scopeNoun,
            expectedTypes: prompt.expectedTypes,
            rejectTypes: prompt.rejectTypes ?? {},
            answerCount: answers.length,
          }),
        ],
      );
      for (let index = 0; index < answers.length; index += 1) {
        await q(
          "insert into prompt_answer (prompt_id, entity_id, rarity) values ($1,$2,$3)",
          [prompt.id, answers[index].id, assignRarity(answers.length, index)],
        );
        promptAnswerCount += 1;
      }
      console.log(`[seed] ${prompt.id.padEnd(34)} ${answers.length} answers`);
    }

    for (const prompt of HISTORY_PROMPTS) {
      const answers = selectHistoryAnswers(prompt);
      if (answers.length < 8) {
        console.warn(`[seed] history prompt ${prompt.id} has only ${answers.length} answers; skipping`);
        continue;
      }
      const expectedTypes = [...new Set(answers.map((entity) => entity.type))];
      await q(
        `insert into prompt (id, kind, text, scope, pack, family_friendly, version, meta)
         values ($1,$2,$3,$4,'world_history',true,$5,$6::jsonb)`,
        [
          prompt.id,
          prompt.kind ?? "anthill",
          prompt.text,
          prompt.scope,
          CONTENT_VERSION,
          JSON.stringify({
            scopeNoun: prompt.scopeNoun,
            expectedTypes,
            rejectTypes: {},
            answerCount: answers.length,
            pack: "world_history",
          }),
        ],
      );
      for (let index = 0; index < answers.length; index += 1) {
        await q(
          "insert into prompt_answer (prompt_id, entity_id, rarity) values ($1,$2,$3)",
          [prompt.id, answers[index].id, assignRarity(answers.length, index)],
        );
        promptAnswerCount += 1;
      }
      console.log(`[seed] ${prompt.id.padEnd(34)} ${answers.length} answers`);
    }

    for (const prompt of WORDPLAY_PROMPTS) {
      const answers = prompt.answers
        .map((name) => wordplayEntity.get(normalizeKey(name)))
        .filter(Boolean) as SeedEntity[];
      if (answers.length < 8) {
        console.warn(`[seed] wordplay prompt ${prompt.id} has only ${answers.length} answers; skipping`);
        continue;
      }
      await q(
        `insert into prompt (id, kind, text, scope, pack, family_friendly, version, meta)
         values ($1,'anthill',$2,$3,'wordplay',true,$4,$5::jsonb)`,
        [
          prompt.id,
          prompt.text,
          prompt.scope,
          CONTENT_VERSION,
          JSON.stringify({
            scopeNoun: prompt.scopeNoun,
            expectedTypes: ["wordplay_answer"],
            rejectTypes: {},
            answerCount: answers.length,
            pack: "wordplay",
          }),
        ],
      );
      for (let index = 0; index < answers.length; index += 1) {
        await q(
          "insert into prompt_answer (prompt_id, entity_id, rarity) values ($1,$2,$3)",
          [prompt.id, answers[index].id, assignRarity(answers.length, index)],
        );
        promptAnswerCount += 1;
      }
      console.log(`[seed] ${prompt.id.padEnd(34)} ${answers.length} answers`);
    }

    for (const question of HOPPER_QUESTIONS) {
      await q(
        `insert into hopper_question (id, text, scope, source_kind, source_meta, version)
         values ($1,$2,$3,$4,$5::jsonb,$6)`,
        [
          question.id,
          question.text,
          question.scope,
          question.sourceKind,
          JSON.stringify(question.sourceMeta),
          CONTENT_VERSION,
        ],
      );
      for (let index = 0; index < question.buckets.length; index += 1) {
        const bucket = question.buckets[index];
        await q(
          `insert into hopper_bucket (id, question_id, canonical, rank, entity_id, aliases)
           values ($1,$2,$3,$4,null,$5::jsonb)`,
          [
            `${question.id}.b${index + 1}`,
            question.id,
            bucket.canonical,
            index + 1,
            JSON.stringify(bucket.aliases),
          ],
        );
      }
    }

    // Graph edges + BFS verification
    const adjacency = new Map<string, Set<string>>();
    for (const edge of GRAPH_EDGES) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        throw new Error(`Graph edge ${edge.from} -> ${edge.to} references a missing entity`);
      }
      const edgeId = `edge_${edge.from}__${edge.predicate}__${edge.to}`;
      await q(
        `insert into graph_edge (id, from_entity, predicate, to_entity, forward_label, inverse_label, source, verified, version)
         values ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
        [edgeId, edge.from, edge.predicate, edge.to, edge.label, edge.inverse, edge.source, CONTENT_VERSION],
      );
      const a = adjacency.get(edge.from) ?? new Set<string>();
      a.add(edge.to);
      adjacency.set(edge.from, a);
      if (edge.inverse) {
        const b = adjacency.get(edge.to) ?? new Set<string>();
        b.add(edge.from);
        adjacency.set(edge.to, b);
      }
    }

    const distance = (start: string, target: string): number | null => {
      if (start === target) return 0;
      const queue: Array<[string, number]> = [[start, 0]];
      const seen = new Set([start]);
      while (queue.length) {
        const [node, dist] = queue.shift()!;
        for (const next of adjacency.get(node) ?? []) {
          if (next === target) return dist + 1;
          if (!seen.has(next)) {
            seen.add(next);
            queue.push([next, dist + 1]);
          }
        }
      }
      return null;
    };

    for (const puzzle of PUZZLES) {
      if (!ids.has(puzzle.start) || !ids.has(puzzle.target)) {
        throw new Error(`Puzzle ${puzzle.id} references a missing entity`);
      }
      const shortest = distance(puzzle.start, puzzle.target);
      if (shortest === null || shortest < 1) {
        throw new Error(`Puzzle ${puzzle.id} is not reachable in >= 1 strand`);
      }
      if (shortest > 5) {
        console.warn(`[seed] puzzle ${puzzle.id} shortest path is ${shortest} strands`);
      }
      await q(
        `insert into puzzle (id, start_entity, target_entity, shortest_distance, allowed_predicates, source, version)
         values ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
        [
          puzzle.id,
          puzzle.start,
          puzzle.target,
          shortest,
          JSON.stringify([...new Set(GRAPH_EDGES.map((edge) => edge.predicate))]),
          "Reviewed graph edges; see graph_edge.source for provenance.",
          CONTENT_VERSION,
        ],
      );
    }

    await q(
      `insert into content_meta (key, value) values ('version', $1::jsonb)
       on conflict (key) do update set value = excluded.value`,
      [JSON.stringify({ version: CONTENT_VERSION, seededAt: new Date().toISOString() })],
    );

    const counts = await q<{ n: number }>("select count(*)::int as n from entity");
    console.log(
      `[seed] entities=${counts[0]?.n} prompts=${PROMPTS.length + HISTORY_PROMPTS.length + WORDPLAY_PROMPTS.length} answers=${promptAnswerCount} hopper=${HOPPER_QUESTIONS.length} edges=${GRAPH_EDGES.length} puzzles=${PUZZLES.length}`,
    );
    console.log(`[seed] continents: ${Object.values(CONTINENT_LABELS).join(", ")}`);
  });

  console.log("[seed] done");
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
