import { z } from "zod";
import { fail, ok, requireSameOrigin } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { applyIntent, intentSchema } from "@/lib/game/intents";
import { buildSnapshot } from "@/lib/game/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  requestId: z.string().min(6).max(80),
  intent: intentSchema,
});

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    requireSameOrigin(request);
    const { code } = await ctx.params;
    const normalized = code.trim().toUpperCase();
    const body = bodySchema.parse(await request.json());
    const guest = await readGuest();
    const db = await getDb();
    // `applyIntent` advances the room clock inside its own transaction, so a
    // separate tick here would only add latency.
    const result = await applyIntent(db, normalized, guest?.id ?? null, body.intent as never, body.requestId);
    // A verdict is complete on its own: the ack carries every number the player
    // sees and the room stream delivers the next snapshot. Rebuilding a snapshot
    // here doubled the answer's latency for nothing.
    if (body.intent.type === "answer:submit") return ok({ result, snapshot: null });
    const snapshot = await buildSnapshot(db, normalized, guest?.id ?? null);
    return ok({ result, snapshot });
  } catch (error) {
    return fail(error);
  }
}
