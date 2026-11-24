import { del } from "@vercel/blob";
import { requireSameOrigin } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-deployment recovery endpoint for the suspended Blob store. It is
 * same-origin guarded and is removed from the tree immediately after use.
 */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    await del("colony/shared-state.json");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
