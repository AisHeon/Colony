import Link from "next/link";
import { GAME_TAGLINE } from "@/lib/config";
import { Wordmark } from "./Creatures";

export const CONTACT_EMAIL = "he.aison@charterschool.org";
export const LEGAL_REVIEW_NOTE =
  "This is a plain-language draft prepared for the project. It still needs review by a qualified lawyer before Colony is treated as a finished commercial service.";

export function SiteHeader() {
  return (
    <header className="site-head">
      <Link href="/" className="wordmark" aria-label="Colony home">
        <Wordmark />
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link className="nav-link" href="/how-to-play">
          How to play
        </Link>
        <Link className="nav-link" href="/join">
          Join
        </Link>
        <Link className="btn btn-primary btn-sm" href="/create">
          Create room
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Wordmark />
          <p>{GAME_TAGLINE}</p>
          <p className="tiny">
            Colony is an independent project by Aison He. Questions or requests:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          <div>
            <h3>Play</h3>
            <Link href="/how-to-play">How to play</Link>
            <Link href="/create">Create a room</Link>
            <Link href="/join">Join a room</Link>
          </div>
          <div>
            <h3>Legal</h3>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div>
            <h3>Your data</h3>
            <Link href="/delete-data">Delete my data</Link>
            <Link href="/credits">Credits &amp; licences</Link>
          </div>
        </nav>
      </div>
      <div className="footer-fine">
        <p>Legal pages are drafts pending review. No trackers. No ads. No accounts.</p>
        <p>© 2026 Colony</p>
      </div>
    </footer>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell legal-shell">
      <SiteHeader />
      <main className="legal-page stack-lg">
        <header className="legal-head stack-sm">
          <p className="eyebrow">Draft · needs legal review</p>
          <h1>{title}</h1>
          <p className="muted">Last updated: {updated}</p>
          <p className="legal-banner">{LEGAL_REVIEW_NOTE}</p>
        </header>
        <div className="legal-copy stack">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
