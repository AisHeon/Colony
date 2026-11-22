import type { Metadata } from "next";
import { RoomClient } from "@/components/room/RoomClient";
import { normalizeRoomCode } from "@/lib/ids";

export const metadata: Metadata = { title: "Room" };

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code) ?? code.toUpperCase().slice(0, 8);
  return <RoomClient code={normalized} />;
}
