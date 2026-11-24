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
  const startedAt = performance.now();
  let guestMs = 0;
  let dbMs = 0;
  try {
    requireSameOrigin(request);
    const { code } = await ctx.params;
    const normalized = code.trim().toUpperCase();
    const body = bodySchema.parse(await request.json());

    const guest = await readGuest();
    guestMs = performance.now() - startedAt;
    const db = await getDb();
    dbMs = performance.now() - startedAt - guestMs;

    // `applyIntent` advances the room clock inside its own transaction, so a
    // separate tick here would only add latency.
    const result = await applyIntent(db, normalized, guest?.id ?? null, body.intent as never, body.requestId);
    const intentMs = performance.now() - startedAt - guestMs - dbMs;

    // A verdict is complete on its own: the ack carries every number the player
    // sees and the room stream delivers the next snapshot. Rebuilding a snapshot
    // here doubled the answer's latency for nothing.
    const snapshot =
      body.intent.type === "answer:submit" ? null : await buildSnapshot(db, normalized, guest?.id ?? null);

    const timing = [
      `guest;dur=${guestMs.toFixed(0)}`,
      `db;dur=${dbMs.toFixed(0)}`,
      `intent;dur=${intentMs.toFixed(0)}`,
      `total;dur=${(performance.now() - startedAt).toFixed(0)}`,
    ].join(", ");
    return ok({ result, snapshot }, { headers: { "server-timing": timing } });
  } catch (error) {
    const response = fail(error);
    response.headers.set("server-timing", `total;dur=${(performance.now() - startedAt).toFixed(0)}`);
    return response;
  }
}
