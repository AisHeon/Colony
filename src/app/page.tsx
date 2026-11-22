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
          <div className="stack hero-copy">
            <p className="eyebrow">A five-game party in one room</p>
            <h1>
              Quick answers. <span className="scribble">Clever connections.</span>{" "}
              <br />
              One room.
            </h1>
            <p className="lede">
              Five fast games for a loud table. Share a six-character code and everyone plays on
              their own phone. No accounts, no downloads, no explaining what an app store is.
            </p>
            <div className="hero-stamps row small">
              <span className="stamp">2–20 players</span>
              <span className="stamp">one shared code</span>
              <span className="stamp">phones, not consoles</span>
            </div>
          </div>
          <figure className="hero-poster">
            <img
              src="/art/colony-key-art.jpg"
              alt="Four insect friends playing cards around a small green table"
              width={1024}
              height={1024}
            />
            <figcaption>Four friends. One table. Zero downloads.</figcaption>
          </figure>
          <div className="hero-side">
            <HomeEntry />
          </div>
        </section>

        <section className="stack" style={{ marginTop: 48 }}>
          <div className="spread section-head">
            <h2>Five ways to run the table.</h2>
            <p className="small muted">Pick a lane, or let Party deal the whole hand.</p>
          </div>
          <div className="mode-grid">
            {MODE_ORDER.map((id, index) => {
              const mode = MODES[id];
              return (
                <article
                  key={id}
                  className="mode-card"
                  style={{ ["--mode-accent" as string]: `var(--accent-${id})` }}
                >
                  <span className="mode-num">{String(index + 1).padStart(2, "0")}</span>
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

        <section className="stack" style={{ marginTop: 52 }}>
          <h2>How it goes.</h2>
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
