import { z } from "zod";
import { fail, ok, requireSameOrigin } from "@/lib/api";
import { getDb } from "@/lib/db";
import { ensureGuest } from "@/lib/session";
import { joinRoom } from "@/lib/game/engine";
import { normalizeRoomCode } from "@/lib/ids";
import { buildSnapshotForRoom } from "@/lib/game/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(1).max(200),
  nickname: z.string().min(1).max(40).optional(),
  avatar: z.number().int().min(0).max(7).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    requireSameOrigin(request);
    const { code: rawCode } = await ctx.params;
    const body = schema.parse(await request.json());
    const normalized = normalizeRoomCode(body.code || rawCode);
    if (!normalized) {
      return ok({ error: { code: "INVALID_CODE", message: "That code isn't in the expected format." } }, { status: 400 });
    }
    const { guest } = await ensureGuest();
    const db = await getDb();
    const outcome = await joinRoom(db, guest.id, normalized, body.nickname ?? null, Date.now(), body.avatar);
    const snapshot = await buildSnapshotForRoom(db, outcome.room, guest.id);
    return ok({
      roomCode: outcome.room.code,
      spectator: outcome.spectator,
      message: outcome.message ?? null,
      snapshot,
    });
  } catch (error) {
    return fail(error);
  }
}
