import Link from "next/link";
import { GAME_TAGLINE, MODE_ORDER, MODES } from "@/lib/config";
import { ModeMark, Wordmark } from "@/components/Creatures";
import { HomeEntry } from "@/components/HomeEntry";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function HomePage() {
  return (
    <div className="shell site-shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy stack">
            <p className="eyebrow">2–20 players · one browser window</p>
            <h1 className="hero-title">
              <span className="riso">Name things.</span>
              <br />
              <span>Connect things.</span>
              <br />
              <span className="highlight">Win the room.</span>
            </h1>
            <p className="lede">
              Four fast games for a loud table. Share a six-character code and everyone plays on
              their own phone. No accounts, no downloads, no explaining what an app store is.
            </p>
            <div className="hero-tags">
              <span className="sticker">2–20 players</span>
              <span className="sticker sticker-alt">one shared code</span>
              <span className="sticker">phones, not consoles</span>
            </div>
            <p className="hero-note">
              <span className="note-arrow" aria-hidden="true">↳</span> {GAME_TAGLINE}
            </p>
          </div>

          <div className="hero-side">
            <HomeEntry />
          </div>

          <figure className="hero-poster">
            <span className="poster-tape poster-tape-one" aria-hidden="true" />
            <span className="poster-tape poster-tape-two" aria-hidden="true" />
            <img
              src="/art/colony-key-art.jpg"
              alt="Four insect friends playing cards around a small green table"
              width={1024}
              height={1024}
            />
            <figcaption>Four friends. One table. Zero downloads.</figcaption>
          </figure>
        </section>

        <section className="mode-section stack">
          <div className="section-head">
            <div>
              <p className="eyebrow">The line-up</p>
              <h2>One room. Five ways to get loud.</h2>
            </div>
            <p className="section-note">
              Pick a lane, or let Party deal the whole hand. Every mode is playable in the same room.
            </p>
          </div>
          <div className="mode-rail" aria-label="Game modes">
            {MODE_ORDER.map((id) => {
              const mode = MODES[id];
              return (
                <article key={id} className={`mode-ticket mode-${id}`}>
                  <span className="mode-shape" aria-hidden="true" />
                  <span className="mode-ticket-icon">
                    <ModeMark mode={id} size={24} />
                  </span>
                  <div>
                    <h3>{mode.name}</h3>
                    <p>{mode.tagline}</p>
                  </div>
                  <span className="mode-time">{mode.timerLabel}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="how-strip stack">
          <div className="section-head">
            <div>
              <p className="eyebrow">How a room runs</p>
              <h2>It takes one code.</h2>
            </div>
            <p className="section-note">
              The rules are short. The arguing about the answers is the entertainment.
            </p>
          </div>
          <div className="comic-strip">
            <article className="strip-panel panel-one">
              <span className="panel-kicker">Host</span>
              <h3>Open a room.</h3>
              <p>
                Pick a mode, rounds and a player limit. Share the code with the group chat. Settings
                freeze when the first round begins.
              </p>
            </article>
            <article className="strip-panel panel-two">
              <span className="panel-kicker">Everyone</span>
              <h3>Take a seat.</h3>
              <p>
                Choose a nickname, ready up and play on your own screen. The server keeps the clock,
                the answers and the score in sync.
              </p>
            </article>
            <article className="strip-panel panel-three">
              <span className="panel-kicker">The room</span>
              <h3>Get loud.</h3>
              <p>
                Rarer answers, shorter webs and shared favourites decide the night. Most match points
                takes the crown.
              </p>
            </article>
          </div>
        </section>

        <section className="home-cta">
          <div>
            <p className="eyebrow">No account. No install.</p>
            <h2>Your table is one code away.</h2>
          </div>
          <div className="row">
            <Link className="btn btn-primary btn-lg" href="/create">
              Create a room
            </Link>
            <Link className="btn btn-lg" href="/join">
              Join with a code
            </Link>
            <Link className="text-link" href="/how-to-play">
              Read the full rules
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
