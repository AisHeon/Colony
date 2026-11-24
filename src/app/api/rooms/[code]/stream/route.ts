import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { GameError, advanceRoom } from "@/lib/game/engine";
import { buildSnapshot } from "@/lib/game/snapshot";
import type { Snapshot } from "@/lib/game/types";
import { isValidRoomCode } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TICK_MS = 900;
const FORCE_TICK_MS = 2500;

/**
 * Server-sent realtime stream. One open connection per player instead of polling.
 *
 * Between clock boundaries the stream only reads the room's version number, and
 * it advances the room clock solely when something is actually due (round start,
 * round end, results window, a Beehive turn deadline) or a few seconds have
 * passed. A snapshot is built only when the version changed, so an idle room
 * costs a couple of tiny queries per second rather than a full rebuild four
 * times a second.
 */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const normalized = code.trim().toUpperCase();
  if (!isValidRoomCode(normalized)) {
    return Response.json(
      { error: { code: "INVALID_CODE", message: "That code isn't in the expected format." } },
      { status: 400 },
    );
  }

  const db = await getDb();
  const guest = await readGuest();
  const encoder = new TextEncoder();
  let closed = false;

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      let sentVersion = -1;
      let lastHeartbeat = 0;
      let lastTickAt = 0;
      let lastSnapshot: Snapshot | null = null;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const due = (now: number): boolean => {
        if (!lastSnapshot || now - lastTickAt > FORCE_TICK_MS) return true;
        const round = lastSnapshot.round;
        if (round) {
          const countdownAt = round.countdownEndsAt ?? round.startsAt + 3000;
          if (now >= countdownAt && lastTickAt < countdownAt) return true;
          if (now >= round.endsAt && lastTickAt < round.endsAt) return true;
          if (round.resultsAt && now >= round.resultsAt && lastTickAt < round.resultsAt) return true;
          const turnEndsAt = round.beehive?.turnEndsAt;
          if (turnEndsAt && now >= turnEndsAt && lastTickAt < turnEndsAt) return true;
        }
        const vote = lastSnapshot.match?.vote;
        if (vote?.open && vote.endsAt && now >= vote.endsAt && lastTickAt < vote.endsAt) return true;
        return false;
      };

      send("ready", { ok: true });

      // A bounded stream: EventSource reconnects automatically when it ends.
      // 900ms x 55 stays inside the 60s function limit.
      for (let tick = 0; tick < 55 && !closed; tick += 1) {
        try {
          const now = Date.now();
          let version: number | null;
          if (due(now)) {
            version = await advanceRoom(db, normalized, now, guest?.id);
            lastTickAt = now;
          } else {
            const rows = await db.query<{ state_version: number }>(
              "select state_version from room where code = $1",
              [normalized],
            );
            version = rows[0] ? Number(rows[0].state_version) : null;
          }

          if (version === null) {
            send("gone", { message: "That room has closed." });
            break;
          }

          if (version !== sentVersion) {
            const snapshot = await buildSnapshot(db, normalized, guest?.id ?? null);
            if (!snapshot) {
              send("gone", { message: "That room has closed." });
              break;
            }
            sentVersion = version;
            lastSnapshot = snapshot;
            send("snapshot", { snapshot });
            lastHeartbeat = Date.now();
          } else if (Date.now() - lastHeartbeat > 10_000) {
            send("ping", { at: Date.now() });
            lastHeartbeat = Date.now();
          }
        } catch (error) {
          if (error instanceof GameError && error.status === 404) {
            send("gone", { message: error.message });
            break;
          }
          send("stream-error", { message: "Reconnecting to the colony." });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, TICK_MS));
      }

      if (!closed) {
        try {
          controller.close();
        } catch {
          /* the client may have closed first */
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
