import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { JoinForm } from "@/components/JoinForm";
import { normalizeRoomCode } from "@/lib/ids";

export const metadata: Metadata = { title: "Join a room" };

export default async function JoinWithCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code) ?? code.toUpperCase().slice(0, 8);

  return (
    <div className="shell site-shell">
      <SiteHeader />
      <main className="setup-page setup-page-narrow stack">
        <header className="setup-hero">
          <p className="eyebrow">Room {normalized}</p>
          <h1>Take your seat.</h1>
          <p className="lede">Enter a nickname to join the room. No account, no email.</p>
        </header>
        <JoinForm initialCode={normalized} />
        <p className="hint">
          Your nickname is visible to the room. <Link href="/privacy">Privacy note</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
