import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/Creatures";
import { JoinForm } from "@/components/JoinForm";
import { normalizeRoomCode } from "@/lib/ids";

export const metadata: Metadata = { title: "Join a room" };

export default async function JoinWithCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code) ?? code.toUpperCase().slice(0, 8);

  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <header className="site-head">
        <Link href="/" aria-label="Colony home">
          <Wordmark />
        </Link>
        <Link className="btn btn-ghost" href="/">
          Back
        </Link>
      </header>
      <main className="stack">
        <h1>Join room {normalized}</h1>
        <p className="muted">Enter a nickname to take your seat.</p>
        <JoinForm initialCode={normalized} />
      </main>
    </div>
  );
}
