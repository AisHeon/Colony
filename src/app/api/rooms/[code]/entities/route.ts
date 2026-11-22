import { fail, ok, takeToken } from "@/lib/api";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { searchEntities } from "@/lib/game/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    await ctx.params;
    const guest = await readGuest();
    const key = guest?.id ?? request.headers.get("x-forwarded-for") ?? "anon";
    if (!takeToken(`search:${key}`, 20, 8)) {
      return ok({ results: [], error: { code: "RATE_LIMITED", message: "Too many searches. Pause for a moment." } }, { status: 429 });
    }
    const term = new URL(request.url).searchParams.get("q") ?? "";
    const db = await getDb();
    const results = await searchEntities(db.query, term.slice(0, 60), 8, true);
    void request;
    return ok({ results });
  } catch (error) {
    return fail(error);
  }
}
