# Colony

Colony is a server-authoritative online party game for 2–20 friends in one room. One host creates a private room, shares a six-character code, and everyone plays on their own phone. There are no accounts, downloads or installs.

## The five modes

| Mode | What happens | Clock |
| --- | --- | --- |
| **Party** | A shuffled playlist of the four minigames, with no mode repeating until the bag is empty. | per mode |
| **Anthill** | Everyone names things in a category. Matching answers share a fixed 50% reduction; rarity tiers pay 100–1,000. | 30 s |
| **Beehive** | Survival answers in turn order. A wrong answer, duplicate or timeout eliminates you. | 10 s per turn |
| **Spider Web** | Connect two nodes through verified, labelled graph edges. Fewer strands score more. | 90 s |
| **Hopper** | Guess the most popular answers to an editorial ranking question. | 20 s |

Scoring follows one table everywhere: 900 / 750 / 600 / 450 / 300 / 200 / 100 / 75 / 50, tenth place and below score 0. Ties share a competition rank (1, 1, 3); players who did not take part in a round score 0 and get no placement.

The full rules, content policy and edge cases are in [STATUS.md](STATUS.md) and [CONTENT.md](CONTENT.md).

## Run it locally

```bash
npm install
npm run db:seed      # schema + all content, into .colony-data (PGlite)
npm run dev          # http://localhost:3000
```

`npm run db:seed` is idempotent: it applies `db/schema.sql` and upserts the catalog. Delete `.colony-data` for a clean room list.

### Database

The same schema and SQL run on:

- **Postgres** when `DATABASE_URL` is set. This is the preferred path at scale.
- **PGlite in memory + shared Blob state** on Vercel. Content stays in memory; rooms, players, matches and answers are stored as one JSON document in a private Vercel Blob store, guarded by ETag compare-and-swap (`ifMatch`). Every instance reads and writes the same durable state, so a room created on one serverless instance is visible to the next.
- **PGlite on disk** locally, in `.colony-data/`. This is what local development, tests and scripts use.

```bash
cp .env.example .env.local
# DATABASE_URL=postgres://user:password@host/db?sslmode=require
npm run db:migrate
npm run db:seed
```

For a hosted deployment, point `DATABASE_URL` at a pooled Postgres connection string. The first cold start applies `db/schema.sql` and seeds the audited catalog idempotently; the schema and seed helpers skip work when the database is already initialized.

## Tests and checks

```bash
npm run typecheck        # TypeScript, strict
npm test                 # 29 rule tests (placement, sharing, validation, Spider, Party)
npm run test:engine      # full engine smoke on a real PGlite database and simulated clock
npm run test:shared      # three independent instances sharing one Blob-style state store
npm run content:verify   # counts, pools, duplicates, solvability, provenance
npm run build            # production build
npx tsx scripts/dump-seed.mts   # regenerate db/seed.sql after content changes
```

`test:engine` plays real matches: Anthill settlement and fixed sharing, Hopper ties, Beehive timeouts and elimination, idempotent intents, late-answer rejection, host migration and rematch.

## Architecture

```
src/app/                 Next.js App Router pages + API routes
src/components/          UI, one component per mode
src/lib/game/engine.ts   room/match/round lifecycle, lazy server tick
src/lib/game/intents.ts  the single validated intent endpoint
src/lib/game/snapshot.ts visibility-scoped state for each viewer
src/lib/validation.ts    aliases, conservative autocorrect, reason codes
src/lib/scoring.ts       placement table, Anthill ledger, Hopper ranking
content/catalog/         typed, audited content modules
db/schema.sql            portable Postgres schema
scripts/                 migrate, seed, verify, import, engine smoke
```

**Server authority.** Clients never compute scores or tell the server which Spider edges exist. A client sends only an intent (join, ready, start, submit, vote); the server validates it inside a transaction, freezes the result, and returns the new state. Spider clients send node IDs only; the server derives every edge and strand count from the approved graph.

**Time.** There is no long-lived socket. `GET /api/rooms/:code/state` is an adaptive poll and also advances the room: deadlines are settled lazily inside a `SELECT … FOR UPDATE` transaction with a logical clock. The countdown, turn expiry, round end and host migration all work even if nobody is polling at the exact deadline.

**Reconnect.** A signed `httpOnly` guest cookie identifies the seat. Reopening the link within the seat-reservation window restores the same nickname, score and submit history. If the host is silent for 10 seconds, the longest-present connected player becomes host without losing the match.

**Idempotency.** Every mutation carries a request ID; `intent_receipt` stores the result, so a retried tap cannot double-submit or double-score.

**Shared serverless state.** On Vercel, the mutable tables are persisted in Vercel Blob as one versioned document. A write first runs against the latest snapshot, then commits with `ifMatch: etag`. If another instance committed in between, the whole transaction is reloaded and replayed, so concurrent joins, reads and answers cannot silently overwrite each other. Idle polls that change nothing do not write at all.

## Design

Colony uses a loud pop-art game-night system: warm paper stock (`#FFF6E5`), heavy black ink rules, hard offset shadows without blur, riso-style misregistered type, flat colour blocks and Ben-Day dots. Bricolage Grotesque carries display type, Space Grotesk carries body copy, and JetBrains Mono carries codes, scores and labels. Party is pink, Anthill red, Beehive yellow, Spider Web green and Hopper blue; shapes, stickers and comic bubbles carry the mode identity instead of generic icons.

The hero uses an original insect-table illustration exported from Canva and served locally from `public/art/` (source in `design/`). All three fonts are self-hosted from `public/fonts/` under the SIL Open Font License, so there are no remote font requests, remote images or trackers. Motion respects `prefers-reduced-motion`, focus styles stay visible, and interactive targets are at least 44 px.

Legal and safety routes are part of the shell: `/privacy`, `/terms`, `/cookies`, `/refunds`, `/contact`, `/credits` and `/delete-data`. The neutral 13+ gate stores only a local preference, and the deletion route clears the guest session and active membership; shared match history is retained for the other players unless a manual request is made. The legal copy is explicitly marked as a draft that needs review by a qualified lawyer before commercial use.

## Content

- 3,266 entities and 5,206 accepted answer links across 60 Anthill prompts and 9 Beehive pools (all ≥100 answers).
- 50 Hopper questions with 675 ranked buckets and at least 12 buckets each, plus 27 Spider puzzles over 63 sourced graph edges.
- Deep niche coverage: 292 Pokémon, 250 animals, 192 countries and capitals, 175 instruments, 167 dog breeds, 128 Minecraft items, 80 dinosaurs, 62 flowers, 60 trees, 50 gemstones, 49 Greek figures, 41 game consoles and more.
- All answer text is original editorial content. Spider edges carry a `source` column and are checked for reachability at seed time.
- Hopper is explicitly labelled **Estimated popular answers** in the UI; it is not survey data and the app never claims otherwise.

See [CONTENT.md](CONTENT.md) for the catalog and JSON import format.

## Deploy on Vercel

The repository is a standard Next.js 15 app.

1. Import the repo into Vercel (framework preset: Next.js).
2. The project's private Blob store supplies `BLOB_READ_WRITE_TOKEN` automatically. No schema setup is needed; content is seeded from `db/seed.sql` on first cold start.
3. Deploy.

For a large deployment or one that needs SQL analytics, attach Postgres instead:

1. Add `DATABASE_URL` in Project → Settings → Environment Variables (Production and Preview).
2. Deploy. Postgres takes precedence over Blob when both are present; the first request applies the schema and seeds the catalog if the database is empty.

The shared Blob document is a single CAS-guarded JSON file. It is plenty for party-sized rooms, but every write is serialized; Postgres is the better choice for high concurrency.
