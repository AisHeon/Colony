/**
 * Imports additional content from a JSON file without touching seed data.
 *
 * Format (all fields required unless marked optional):
 * {
 *   "entities": [{ "name": "Charizard", "type": "pokemon_species",
 *                  "aliases": ["char"], "description": "optional" }],
 *   "prompts": [{ "id": "anthill.custom.pokemon", "kind": "anthill",
 *                 "text": "Name a Pokémon.", "scope": "Species only.",
 *                 "scopeNoun": "Pokémon species",
 *                 "expectedTypes": ["pokemon_species"],
 *                 "rejectTypes": { "pokemon_trainer": "…" },
 *                 "answers": [{ "name": "Charizard", "rarity": "soldier" }] }]
 * }
 *
 * Usage: npx tsx scripts/import-content.mts path/to/file.json
 */
import { readFile } from "node:fs/promises";
import { getDb } from "../src/lib/db";
import { RARITIES, type Rarity } from "../src/lib/config";
import { normalizeKey } from "../src/lib/normalize";

type ImportEntity = { name: string; type: string; aliases?: string[]; description?: string };
type ImportAnswer = { name: string; rarity: Rarity };
type ImportPrompt = {
  id: string;
  kind: "anthill" | "beehive";
  text: string;
  scope: string;
  scopeNoun?: string;
  expectedTypes?: string[];
  rejectTypes?: Record<string, string>;
  answers: ImportAnswer[];
};
type ImportFile = { entities?: ImportEntity[]; prompts?: ImportPrompt[] };

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/import-content.mts path/to/content.json");
  process.exit(1);
}
const raw = JSON.parse(await readFile(path, "utf8")) as ImportFile;
const db = await getDb();

let entitiesAdded = 0;
let aliasesAdded = 0;
let promptsWritten = 0;
let linksWritten = 0;

await db.transaction(async (q) => {
  for (const entity of raw.entities ?? []) {
    const name = entity.name?.trim();
    const type = entity.type?.trim();
    if (!name || !type) throw new Error("each entity needs name and type");
    const existing = await q<{ id: string }>("select id from entity where lower(canonical_name) = lower($1)", [name]);
    let entityId = existing[0]?.id;
    if (!entityId) {
      entityId = `ent_${normalizeKey(name).replace(/[^a-z0-9]+/g, "_")}`;
      const clash = await q<{ id: string }>("select id from entity where id = $1", [entityId]);
      if (clash.length) entityId = `ent_${normalizeKey(name).replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;
      await q("insert into entity (id, canonical_name, type, description, meta) values ($1,$2,$3,$4,'{}'::jsonb)", [
        entityId,
        name,
        type,
        entity.description ?? null,
      ]);
      entitiesAdded += 1;
    }
    for (const alias of entity.aliases ?? []) {
      const clean = alias.trim();
      const key = normalizeKey(clean);
      if (!key || key === normalizeKey(name)) continue;
      const inserted = await q<{ alias_norm: string }>(
        `insert into entity_alias (entity_id, alias_norm, display) values ($1,$2,$3)
         on conflict do nothing returning alias_norm`,
        [entityId, key, clean],
      );
      if (inserted.length) aliasesAdded += 1;
    }
  }

  for (const prompt of raw.prompts ?? []) {
    if (!prompt.id || !prompt.text || !(prompt.kind === "anthill" || prompt.kind === "beehive")) {
      throw new Error("each prompt needs id, kind (anthill|beehive) and text");
    }
    if (prompt.kind === "beehive" && prompt.answers.length < 100) {
      throw new Error(`${prompt.id}: Beehive pools need at least 100 answers`);
    }
    if (prompt.kind === "anthill" && prompt.answers.length < 8) {
      throw new Error(`${prompt.id}: Anthill prompts need at least 8 answers`);
    }
    for (const answer of prompt.answers) {
      if (!(answer.rarity in RARITIES)) throw new Error(`${prompt.id}: unknown rarity ${answer.rarity}`);
    }
    await q(
      `insert into prompt (id, kind, text, scope, pack, family_friendly, version, meta)
       values ($1,$2,$3,$4,'core',true,$5,$6::jsonb)
       on conflict (id) do update set kind = excluded.kind, text = excluded.text,
         scope = excluded.scope, meta = excluded.meta`,
      [
        prompt.id,
        prompt.kind,
        prompt.text,
        prompt.scope,
        "1.1.0",
        JSON.stringify({
          scopeNoun: prompt.scopeNoun ?? prompt.scope,
          expectedTypes: prompt.expectedTypes ?? [],
          rejectTypes: prompt.rejectTypes ?? {},
          answerCount: prompt.answers.length,
          imported: true,
        }),
      ],
    );
    promptsWritten += 1;
    for (const answer of prompt.answers) {
      const entity = await q<{ id: string }>("select id from entity where lower(canonical_name) = lower($1)", [
        answer.name,
      ]);
      if (!entity[0]) {
        throw new Error(`${prompt.id}: answer "${answer.name}" is not a known entity (add it under entities)`);
      }
      await q(
        `insert into prompt_answer (prompt_id, entity_id, rarity) values ($1,$2,$3)
         on conflict (prompt_id, entity_id) do update set rarity = excluded.rarity`,
        [prompt.id, entity[0].id, answer.rarity],
      );
      linksWritten += 1;
    }
  }
});

console.log(
  `Imported ${path}: +${entitiesAdded} entities, +${aliasesAdded} aliases, ` +
    `${promptsWritten} prompts written, ${linksWritten} answer links.`,
);
