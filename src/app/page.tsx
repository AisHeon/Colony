import Link from "next/link";
import { GAME_TAGLINE } from "@/lib/config";
import { MODE_ORDER, MODES } from "@/lib/config";
import { Wordmark, ModeMark } from "@/components/Creatures";
import { HomeEntry } from "@/components/HomeEntry";

export default function HomePage() {
  return (
    <div className="shell">
      <header className="site-head">
        <Wordmark />
        <nav className="row-tight" aria-label="Main">
          <Link className="btn btn-ghost" href="/how-to-play">
            How to play
          </Link>
          <Link className="btn btn-secondary btn-sm" href="/create">
            Create room
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="stack">
            <p className="eyebrow">A tiny-creature party game</p>
            <h1>Quick answers. Clever connections. One room.</h1>
            <p className="lede">
              Five fast minigames for friends on phones or laptops. No accounts, no downloads — share
              a six-character code and play.
            </p>
            <div className="row small muted">
              <span className="badge badge-outline">2–20 players</span>
              <span className="badge badge-outline">Private rooms</span>
              <span className="badge badge-outline">Guests welcome</span>
            </div>
          </div>
          <HomeEntry />
        </section>

        <section className="stack" style={{ marginTop: 36 }}>
          <div className="spread">
            <h2>The colony</h2>
            <p className="small muted">Pick one, or let Party shuffle all four.</p>
          </div>
          <div className="mode-grid">
            {MODE_ORDER.map((id) => {
              const mode = MODES[id];
              return (
                <article
                  key={id}
                  className="mode-card"
                  style={{ ["--mode-accent" as string]: `var(--accent-${id})` }}
                >
                  <span className="mode-icon">
                    <ModeMark mode={id} size={22} />
                  </span>
                  <h3>{mode.name}</h3>
                  <p>{mode.blurb}</p>
                  <p className="tiny muted" style={{ marginTop: "auto" }}>
                    {mode.timerLabel}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="stack" style={{ marginTop: 44 }}>
          <h2>How a round works</h2>
          <div className="steps">
            <div className="card card-tight stack-sm">
              <span className="step-num">01</span>
              <h3>Share a code</h3>
              <p className="small muted">
                The host creates a private room. Everyone else joins with the code or invite link.
              </p>
            </div>
            <div className="card card-tight stack-sm">
              <span className="step-num">02</span>
              <h3>Ready up</h3>
              <p className="small muted">
                Two players is enough. Settings freeze when the host starts, so everyone plays the
                same game.
              </p>
            </div>
            <div className="card card-tight stack-sm">
              <span className="step-num">03</span>
              <h3>Score match points</h3>
              <p className="small muted">
                Each round ranks players and awards placement points. Ties share a placement and the
                points that go with it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="spread" style={{ alignItems: "flex-start" }}>
          <div className="stack-sm">
            <p className="strong" style={{ color: "var(--ink)" }}>
              {GAME_TAGLINE}
            </p>
            <p>
              Colony is an original party game. Creature marks and interface are original artwork.
              Facts in Spider Web come from the cited sources in the game dataset.
            </p>
          </div>
          <div className="footer-links">
            <Link href="/how-to-play">How to play</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/create">Create room</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
