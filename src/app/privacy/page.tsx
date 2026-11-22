import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/Creatures";

export const metadata: Metadata = { title: "Privacy & data" };

export default function PrivacyPage() {
  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <header className="site-head">
        <Link href="/" aria-label="Colony home">
          <Wordmark />
        </Link>
        <Link className="btn btn-ghost" href="/">
          Back
        </Link>
      </header>
      <main className="stack-lg">
        <div className="stack-sm">
          <h1>Privacy & data</h1>
          <p className="muted">
            Colony is built to be playable without an account or an email address. Here is exactly
            what the game keeps.
          </p>
        </div>

        <section className="card stack">
          <h2>What we store</h2>
          <ul className="rule-list">
            <li>
              A random guest session token in an HttpOnly cookie. The database stores only a SHA-256
              hash of it, never the token itself.
            </li>
            <li>
              Your nickname, avatar color and room membership. Nicknames are shown to people in your
              room.
            </li>
            <li>
              Gameplay records needed to score a match: accepted answers, saved paths, saved
              rankings and match points.
            </li>
            <li>
              Aggregated, non-identifying counts of how often an answer is chosen, used only to
              improve rarity estimates.
            </li>
            <li>
              Reports you deliberately submit about a missing answer or connection, plus the content
              version they refer to.
            </li>
          </ul>
        </section>

        <section className="card stack">
          <h2>What we do not do</h2>
          <ul className="rule-list">
            <li>No advertising trackers, fingerprinting or third-party analytics.</li>
            <li>No public chat, voice chat or direct messages.</li>
            <li>No sale of gameplay data.</li>
            <li>No email address required to play.</li>
          </ul>
        </section>

        <section className="card stack">
          <h2>Retention</h2>
          <p className="muted">
            Rooms close after inactivity and their live state is not kept as an archive. Raw answer
            attempts are retained for the life of a room so reconnects and results are consistent. A
            small deduplication table for request IDs is pruned daily. Reports remain in the review
            queue until handled.
          </p>
        </section>

        <section className="card stack">
          <h2>Cambridge Analytica-free zone</h2>
          <p className="muted">
            Guest data is pseudonymous, not anonymous: a session can be linked to that browser&apos;s
            play history while the session exists. If you want a clean slate, clear the site cookies
            and you will be issued a new guest session.
          </p>
        </section>

        <section className="card stack">
          <h2>Content acknowledgments</h2>
          <p className="muted">
            Spider Web relationships cite Wikipedia pages in the dataset, accessed 2026-11-12.
            Hopper rankings are editorial estimates written for this game and labeled as such.
            Pokémon, Minecraft, Disney, Harry Potter and Star Wars names are referenced factually as
            answer content; Colony is not affiliated with, endorsed by or sponsored by any of those
            rights holders, and no proprietary artwork is used.
          </p>
        </section>
      </main>
    </div>
  );
}
