import type { Metadata } from "next";
import { RoomClient } from "@/components/room/RoomClient";
import { getDb } from "@/lib/db";
import { readGuest } from "@/lib/session";
import { buildSnapshot } from "@/lib/game/snapshot";
import type { Snapshot } from "@/lib/game/types";
import { normalizeRoomCode } from "@/lib/ids";

export const metadata: Metadata = { title: "Room" };

// Runs at parse time, before React hydrates. The room is server-rendered, so for
// a few hundred milliseconds the answer field is visible but React is not
// listening yet: an Enter there used to be swallowed. Buffer it instead and let
// Anthill send it the moment hydration finishes.
const EARLY_ANSWER_BOOT = `(function(){
  var input = document.getElementById("anthill-answer");
  if (!input) return;
  var form = input.closest(".answer-form");
  if (!form) return;
  var queue = function (event) {
    if (window.__colonyHydrated) return;
    var value = (input.value || "").trim();
    if (!value) return;
    window.__colonyEarlyAnswer = value;
    event.preventDefault();
  };
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && event.target === input) queue(event);
  }, true);
  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("[data-answer-send]") : null;
    if (button && form.contains(button)) queue(event);
  }, true);
})();`;
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

  return (
    <>
      <RoomClient code={normalized} initial={initial} />
      <script dangerouslySetInnerHTML={{ __html: EARLY_ANSWER_BOOT }} />
    </>
  );
}
