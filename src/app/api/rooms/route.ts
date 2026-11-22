import { z } from "zod";
import { fail, ok, requireSameOrigin, takeToken } from "@/lib/api";
import { getDb } from "@/lib/db";
import { ensureGuest } from "@/lib/session";
import { createRoom } from "@/lib/game/engine";
import { buildSnapshotForRoom } from "@/lib/game/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  nickname: z.string().min(1).max(40),
  settings: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = schema.parse(await request.json());
    const { guest } = await ensureGuest();
    if (!takeToken(`create:${guest.id}`, 4, 0.1)) {
      return ok({ error: { code: "RATE_LIMITED", message: "Give it a moment before creating another room." } }, { status: 429 });
    }
    const db = await getDb();
    const { room } = await createRoom(db, guest.id, body.nickname, body.settings as never);
    const snapshot = await buildSnapshotForRoom(db, room, guest.id);
    return ok({ roomCode: room.code, snapshot });
  } catch (error) {
    return fail(error);
  }
}
