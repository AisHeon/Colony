import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { JoinForm } from "@/components/JoinForm";

export const metadata: Metadata = { title: "Join a room" };

export default function JoinPage() {
  return (
    <div className="shell site-shell">
      <SiteHeader />
      <main className="setup-page setup-page-narrow stack">
        <header className="setup-hero">
          <p className="eyebrow">A code, a nickname, a seat</p>
          <h1>Got a code?</h1>
          <p className="lede">
            Ask the host for the six-character room code or the invite link. No account needed.
          </p>
        </header>
        <JoinForm />
        <p className="hint">
          Your nickname is visible to the room. <Link href="/privacy">Privacy note</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
