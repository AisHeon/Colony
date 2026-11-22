# Colony delivery status

Last verified: 22 November 2026. Every number below was produced by running the command next to it, not estimated.

## Verified

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | clean, strict mode |
| Unit rules | `npm test` | 29 / 29 pass |
| Engine, real DB | `npm run test:engine` | Anthill, Hopper, Beehive, host migration, rematch pass |
| Shared serverless state | `npm run test:shared` | 3 independent instances share one CAS store; concurrent writes, join, play and settlement pass |
| Content audit | `npm run content:verify` | all checks pass |
| Production build | `npm run build` | 9 static pages + 8 API/room routes |

Seed output: **3,266 entities · 273 aliases · 69 prompts · 5,206 answer links · 50 Hopper questions · 675 Hopper buckets · 63 sourced graph edges · 27 Spider puzzles.** Anthill 60 prompts; Beehive 9 pools, every one above 100 answers.

## Spec coverage

### Game rules

- [x] Party playlist and the four minigames; no repeat until the four-mode bag is empty.
- [x] 2–20 players, private rooms with six-character codes, host controls, rematch.
- [x] Every score computed on the server; clients receive a visibility-scoped snapshot.
- [x] Placement table 900/750/600/450/300/200/100/75/50; tenth and below score zero.
- [x] Competition ranking with shared places and skipped following places.
- [x] No-participation players score zero and receive no placement.
- [x] Anthill rarity tiers 100 / 200 / 300 / 500 / 1,000.
- [x] Anthill fixed 50% reduction, applied once per answer no matter how many players match.
- [x] Beehive 10-second turns, timeout/duplicate/wrong-answer elimination, survivor order 3/2/1 for three players.
- [x] Spider Web 90-second rounds, verified graph, server-derived edges and strand counts, floor(1000 / strands).
- [x] Hopper 20-second rounds, ranked buckets, ties share a place, labelled “Estimated popular answers”.
- [x] 3-second countdown, 8-second results, 10-second favourite vote, host skip.
- [x] Answers frozen when the deadline passes; late submissions are rejected with a specific reason.

### Reliability

- [x] Server-authoritative state with one transactional intent endpoint.
- [x] Idempotency receipts; a retried request returns the stored result.
- [x] Lazy logical-clock tick: deadlines settle even with no client polling at the exact moment.
- [x] Guest cookie reconnect inside the 120-second seat reservation window.
- [x] Host migration after 10 seconds of host silence, without resetting the match.
- [x] Room expiry when everyone has been gone for two hours; closed rooms cannot be joined.
- [x] Host-only settings, start, skip, kick and rematch; all checked server-side.

### Content

- [x] 60 Anthill prompts (≥8 answers each; most far more), including deep dinosaur, Greek myth, flower, tree, gemstone, console, Shakespeare, bone, moon, volcano, river, mountain, sea and currency pools.
- [x] 9 Beehive pools, all ≥100 answers.
- [x] 50 Hopper questions with 12+ ranked buckets each and honest labelling.
- [x] 27 Spider puzzles on 63 sourced edges; every puzzle reachability-checked at seed time.
- [x] Alias resolution plus conservative Damerau–Levenshtein distance-1 correction.
- [x] Specific wrong-type messages rather than a generic “no”.
- [x] No invented survey data, no third-party assets.

### Data and operations

- [x] One portable Postgres schema (`db/schema.sql`), works on hosted Postgres and PGlite.
- [x] Migration, seed, verification and JSON import tools.
- [x] Health endpoint; structured API errors; rate limits on room creation and reports.
- [x] Tables for reports and answer statistics so future moderation has data.

### Interface

- [x] Printed game-zine design: warm paper and dot grid, ink rules, hard offset shadows, serif display type, mono labels, one accent per mode, original inline SVG creatures, and local Canva key art.
- [x] Mobile-first layout, 44 px targets, visible focus, keyboard operation, live regions for errors.
- [x] `prefers-reduced-motion` honoured; no external fonts or remote images, one local illustration, no trackers.
- [x] How-to-play, privacy and not-found pages.

## Deliberate deviations

1. **Transport.** Vercel cannot host a long-lived Socket.IO server, so the authoritative state is delivered by adaptive polling (`/api/rooms/[code]/state`, roughly every 1.2 s in a live round, backing off when idle). The server still owns every deadline through a lazy logical clock. This is a deployment constraint, not a client-authoritative shortcut.
2. **Hopper.** Ranks are editorial estimates, never survey results; the UI says so on every question.
3. **Solar System pool.** The planet prompt has eight answers because the Solar System has eight planets. The verifier's floor is eight for this reason.
4. **Shared state on Vercel.** No hosted Postgres is provisioned from this workspace, so the deployment uses a private Vercel Blob document as its durable store: content is seeded into in-memory PGlite, and mutable tables are persisted with ETag compare-and-swap. Every serverless instance reads the same room state, verified live across independent HTTPS requests. Writes are serialized through one document, which is appropriate for party-sized traffic; `DATABASE_URL` remains the preferred path for high concurrency.

## Not implemented

- Native WebSocket transport (requires a host that supports persistent connections).
- Accounts, friends, cross-room chat, spectator chat, moderation console, push notifications.
- Audio, localization, seasonal content packs.
- Native apps.

## Live verification

- `npm run test:shared` starts three independent Db instances over one store, then creates, joins, concurrently readies, starts, answers and settles a room across them.
- The production deployment is verified by separate HTTPS requests for create, state, join, ready, start and settlement; the response bodies are recorded in `evidence/`.
- The hosted UI is exercised in a real browser for create and join; API evidence alone is not treated as UI proof.

## Manual review still worth doing on the live preview

The automated suite covers rules and engine flows. It does not click the interface. Worth a human pass: lobby on a narrow phone, a full Party playlist with three tabs, Spider drag/tap selection, and the results/vote transitions.
