import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CONTENT_VERSION } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.probe();
    const counts = await db.one<{ prompts: number; entities: number; puzzles: number; questions: number }>(
      `select
         (select count(*) from prompt) as prompts,
         (select count(*) from entity) as entities,
         (select count(*) from puzzle) as puzzles,
         (select count(*) from hopper_question) as questions`,
    );
    return NextResponse.json(
      {
        ok: true,
        database: db.kind,
        persistence: "writable",
        contentVersion: CONTENT_VERSION,
        counts: {
          prompts: Number(counts?.prompts ?? 0),
          entities: Number(counts?.entities ?? 0),
          puzzles: Number(counts?.puzzles ?? 0),
          questions: Number(counts?.questions ?? 0),
        },
        latencyMs: Date.now() - started,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "database_unavailable",
        message: process.env.COLONY_HEALTH_DETAILS === "1" ? (error as Error).message : undefined,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
