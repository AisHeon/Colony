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

- **Postgres** when `DATABASE_URL` is set.
- **PGlite** (embedded Postgres compiled to WASM) otherwise, stored in `.colony-data/`. This is what local development, tests and scripts use.

```bash
cp .env.example .env.local
# DATABASE_URL=postgres://user:password@host/db?sslmode=require
npm run db:migrate
npm run db:seed
```

For a hosted deployment, point `DATABASE_URL` at a pooled Postgres connection string, then run `npm run db:migrate && npm run db:seed` once against it. The app never creates tables at request time.

## Tests and checks

```bash
npm run typecheck        # TypeScript, strict
npm test                 # 29 rule tests (placement, sharing, validation, Spider, Party)
npm run test:engine      # full engine smoke on a real PGlite database and simulated clock
npm run content:verify   # counts, pools, duplicates, solvability, provenance
npm run build            # production build
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

## Design

The visual language is original: off-white paper, deep green ink, six flat creature marks drawn as inline SVG, generous type, and a single accent per mode. There are no external fonts, images or trackers. Motion respects `prefers-reduced-motion`, every control is keyboard reachable, and all interactive targets are at least 44 px.

## Content

- 40 Anthill prompts, 5 Beehive pools (all ≥100 answers), 25 Hopper questions with 175 ranked buckets, 27 Spider puzzles over 63 sourced graph edges.
- All answer text is original editorial content. Spider edges carry a `source` column and are checked for reachability at seed time.
- Hopper is explicitly labelled **Estimated popular answers** in the UI; it is not survey data and the app never claims otherwise.

See [CONTENT.md](CONTENT.md) for the catalog and JSON import format.

## Deploy on Vercel

The repository is a standard Next.js 15 app.

1. Import the repo into Vercel (framework preset: Next.js).
2. Add `DATABASE_URL` in Project → Settings → Environment Variables (Production and Preview).
3. Run the migration and seed once from a machine that can reach that database:
   ```bash
   DATABASE_URL=... npm run db:migrate
   DATABASE_URL=... npm run db:seed
   ```
4. Deploy.

Without `DATABASE_URL`, Vercel falls back to PGlite inside the serverless filesystem. Pages render, but rooms do not survive cold starts and are not shared between instances, so a real deployment needs Postgres.
