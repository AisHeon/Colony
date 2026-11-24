import type { Metadata } from "next";
import { RoomClient } from "@/components/room/RoomClient";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { buildSnapshot } from "@/lib/game/snapshot";
import type { Snapshot } from "@/lib/game/types";
import { normalizeRoomCode } from "@/lib/ids";

export const metadata: Metadata = { title: "Room" };
// The first paint is built from live room state, so this page is never cached.
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code) ?? code.toUpperCase().slice(0, 8);

  // Building the snapshot on the server removes a client round trip and the
  // "Connecting…" flash before the lobby or the prompt appears.
  let initial: Snapshot | null = null;
  try {
    const db = await getDb();
    const guest = await readGuest();
    initial = await buildSnapshot(db, normalized, guest?.id ?? null);
  } catch {
    initial = null;
  }

  return <RoomClient code={normalized} initial={initial} />;
}
