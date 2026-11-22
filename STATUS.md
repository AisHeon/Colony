# Colony delivery status

Last verified: 22 November 2026. Every number below was produced by running the command next to it, not estimated.

## Verified

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | clean, strict mode |
| Unit rules | `npm test` | 29 / 29 pass |
| Engine, real DB | `npm run test:engine` | Anthill, Hopper, Beehive, host migration, rematch pass |
| Content audit | `npm run content:verify` | all checks pass |
| Production build | `npm run build` | 9 static pages + 8 API/room routes |

Seed output: **1,423 entities · 121 aliases · 45 prompts · 2,260 answer links · 25 Hopper questions · 175 Hopper buckets · 63 sourced graph edges · 27 Spider puzzles.** Anthill 40 prompts; Beehive 5 pools of 118–143 answers each.

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

- [x] 40 Anthill prompts (≥8 answers each; most far more).
- [x] 5 Beehive pools, all ≥100 answers.
- [x] 25 Hopper questions with 5+ ranked buckets each and honest labelling.
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

- [x] Off-white/deep-green design system, one accent per mode, original inline SVG creatures.
- [x] Mobile-first layout, 44 px targets, visible focus, keyboard operation, live regions for errors.
- [x] `prefers-reduced-motion` honoured; no external fonts, images or trackers.
- [x] How-to-play, privacy and not-found pages.

## Deliberate deviations

1. **Transport.** Vercel cannot host a long-lived Socket.IO server, so the authoritative state is delivered by adaptive polling (`/api/rooms/[code]/state`, roughly every 1.2 s in a live round, backing off when idle). The server still owns every deadline through a lazy logical clock. This is a deployment constraint, not a client-authoritative shortcut.
2. **Hopper.** Ranks are editorial estimates, never survey results; the UI says so on every question.
3. **Solar System pool.** The planet prompt has eight answers because the Solar System has eight planets. The verifier's floor is eight for this reason.
4. **Database on Vercel.** The code supports `DATABASE_URL`, but no hosted Postgres is provisioned from this workspace. Without it the deployment falls back to an ephemeral PGlite filesystem, which is fine for a look around but not for a persistent room list.

## Not implemented

- Native WebSocket transport (requires a host that supports persistent connections).
- Accounts, friends, cross-room chat, spectator chat, moderation console, push notifications.
- Audio, localization, seasonal content packs.
- Native apps.

## Manual review still worth doing on the live preview

The automated suite covers rules and engine flows. It does not click the interface. Worth a human pass: lobby on a narrow phone, a full Party playlist with three tabs, Spider drag/tap selection, and the results/vote transitions.
