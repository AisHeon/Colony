import { fail, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { GameError } from "@/lib/game/engine";
import { advanceRoom } from "@/lib/game/engine";
import { buildSnapshot } from "@/lib/game/snapshot";
import { isValidRoomCode } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const normalized = code.trim().toUpperCase();
    if (!isValidRoomCode(normalized)) {
      throw new GameError("INVALID_CODE", "That code isn't in the expected format.", 400);
    }
    const db = await getDb();
    await advanceRoom(db, normalized);
    const guest = await readGuest();
    const snapshot = await buildSnapshot(db, normalized, guest?.id ?? null);
    if (!snapshot) throw new GameError("ROOM_NOT_FOUND", "We couldn't find an active room with that code.", 404);
    void request;
    return ok({ snapshot });
  } catch (error) {
    return fail(error);
  }
}
