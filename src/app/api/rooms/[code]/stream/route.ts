import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { GameError, advanceRoom, touchPresence } from "@/lib/game/engine";
import { buildSnapshot } from "@/lib/game/snapshot";
import { isValidRoomCode } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-sent realtime stream. The client keeps one connection open instead of
 * polling. Snapshots are checked four times a second and pushed only when the
 * room version changes, with a heartbeat to keep proxies from closing it.
 *
 * This is the serverless equivalent of a room socket: same-origin, guest
 * cookie, no extra service or API key.
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
      let version = -1;
      let lastHeartbeat = 0;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send("ready", { ok: true });

      // A bounded stream: EventSource reconnects automatically when it ends.
      for (let tick = 0; tick < 110 && !closed; tick += 1) {
        try {
          if (guest) await touchPresence(db, normalized, guest.id);
          await advanceRoom(db, normalized);
          const snapshot = await buildSnapshot(db, normalized, guest?.id ?? null);
          if (!snapshot) {
            send("gone", { message: "That room has closed." });
            break;
          }
          if (snapshot.version !== version) {
            version = snapshot.version;
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
        await new Promise((resolve) => setTimeout(resolve, 350));
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
