# Colony content

Content is code: typed modules under `content/catalog/`, loaded by `scripts/seed.ts` into the same portable Postgres schema used in production. Nothing is fetched at runtime.

## Catalog

| File | What it holds |
| --- | --- |
| `entities.ts` | Canonical names, types, rarity-neutral metadata and aliases for every answerable thing. |
| `countries.ts` | Country/capital rows (name, capital, continent, landlocked flag). |
| `prompts.ts` | Anthill and Beehive prompts: id, kind, text, scope, expected types, reject explanations, answer type/attributes. |
| `hopper.ts` | Hopper questions, editorial rank buckets and aliases, each with a `sourceKind` and `sourceMeta`. |
| `graph.ts` | Spider graph entities, sourced directed edges with forward/inverse labels, and puzzle endpoints. |

## Verified counts

`npm run content:verify` prints and checks these (current seed):

```
entities 1,423   aliases 121   prompts 45   answer links 2,260
Anthill 40 prompts / 1,621 answers
Beehive 5 pools / 639 answers (every pool ≥ 100)
Hopper 25 questions / 175 ranked buckets
Spider 63 sourced edges / 27 puzzles
```

Checks include: every Anthill prompt has at least eight answers (the Solar System prompt is complete at eight planets), every Beehive pool has at least 100, every Hopper question at least five ranked buckets, no canonical name repeats inside a prompt, no alias maps to two entities, every prompt answer points at a real entity, every Spider puzzle is reachable in the permitted direction, and every graph edge records its source.

## Answer validation

`src/lib/validation.ts` resolves a submission in this order:

1. Exact normalized match (case, spacing and curly quotes folded; meaningful symbols such as `Nidoran♀` vs `Nidoran♂` preserved).
2. Curated alias.
3. Conservative Damerau–Levenshtein correction, distance 1, only for names of at least five characters and only when exactly one candidate is in range.
4. Known entity of the wrong type → a specific explanation (for example “Hershey is a company/brand, not a specific candy product”).
5. Anything else → `UNKNOWN_OR_UNVERIFIED`, never a guess.

Every result carries a reason code, so the client can explain a rejection without re-implementing the rules.

## Hopper honesty

Hopper ranks are editorial estimates of what a general audience would answer. The UI labels every question **“Estimated popular answers”** and the report flow lets players flag a bad bucket. There is no invented survey, sample size or percentage.

## Adding content with JSON

For bulk additions without editing TypeScript, use the import tool. It runs in one transaction, reuses entities by canonical name, and refuses pools that are too small for the mode.

```json
{
  "entities": [
    { "name": "Charizard", "type": "pokemon_species", "aliases": ["char"] }
  ],
  "prompts": [
    {
      "id": "anthill.custom.pokemon",
      "kind": "anthill",
      "text": "Name a Pokémon species.",
      "scope": "Species only.",
      "scopeNoun": "Pokémon species",
      "expectedTypes": ["pokemon_species"],
      "rejectTypes": { "pokemon_trainer": "{name} is a Trainer, not a Pokémon species." },
      "answers": [
        { "name": "Charizard", "rarity": "soldier" }
      ]
    }
  ]
}
```

```bash
npx tsx scripts/import-content.mts path/to/content.json
npm run content:verify
```

`rarity` is the tier name (`forager`, `soldier`, `royal`, `queen`, `apex`). Anthill prompts need at least 8 answers, Beehive pools at least 100. Existing prompt rows are updated; answer links are upserted.

## Provenance

- Spider edges are factual relationships with a `source` string; the seed checks reachability before insert and warns when the shortest path exceeds five strands.
- Hopper data is editorial, not survey data, and is labelled as such.
- All prose, creature marks and UI copy are original to this project. No third-party logos, sprites or scraped answer sets are included.
