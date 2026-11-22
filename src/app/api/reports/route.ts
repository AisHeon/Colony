import { z } from "zod";
import { fail, ok, requireSameOrigin, takeToken } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { CONTENT_VERSION } from "@/lib/config";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["missing_answer", "missing_connection", "missing_question"]),
  targetId: z.string().min(1).max(120),
  text: z.string().min(1).max(160),
  reason: z.string().max(400).optional(),
  roomCode: z.string().max(12).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = schema.parse(await request.json());
    const guest = await readGuest();
    if (!takeToken(`report:${guest?.id ?? "anon"}`, 3, 0.02)) {
      return ok({ error: { code: "RATE_LIMITED", message: "You've sent a few reports already. Try later." } }, { status: 429 });
    }
    const db = await getDb();
    await db.query(
      `insert into content_report
         (id, kind, target_id, content_version, submitted_text, reason, member_id, room_code, review_status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9)`,
      [
        newId("rep"),
        body.kind,
        body.targetId,
        CONTENT_VERSION,
        body.text,
        body.reason ?? null,
        guest?.id ?? null,
        body.roomCode ?? null,
        Date.now(),
      ],
    );
    return ok({ ok: true, message: "Thanks — that's in the review queue." });
  } catch (error) {
    return fail(error);
  }
}
