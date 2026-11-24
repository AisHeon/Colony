import Link from "next/link";
import type { Metadata } from "next";
import { MODE_ORDER, MODES, PLACEMENT_POINTS, RARITIES } from "@/lib/config";
import { ModeMark } from "@/components/Creatures";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "How to play" };

export default function HowToPlayPage() {
  return (
    <div className="shell site-shell">
      <SiteHeader />
      <main className="rules-page stack-lg">
        <header className="rules-hero">
          <div className="stack">
            <p className="eyebrow">The rules, without the fine print</p>
            <h1>
              Four games.<br />
              <span className="highlight">One code.</span>
            </h1>
            <p className="lede">
              Colony is a private party game for 2–20 people. No accounts, no downloads. Everyone
              answers on their own device, and the server keeps score.
            </p>
          </div>
          <div className="rules-note">
            <span className="sticker sticker-alt">13+</span>
            <p>
              One person creates a room, shares the six-character code, and everyone else takes a
              seat. The host starts when the room is ready.
            </p>
            <Link className="text-link" href="/create">
              Open a room →
            </Link>
          </div>
        </header>

        <section className="stack">
          <div className="section-head">
            <div>
              <p className="eyebrow">The line-up</p>
              <h2>What each game asks.</h2>
            </div>
            <p className="section-note">Tap a mode in the lobby to set the next room&apos;s pace.</p>
          </div>
          <div className="rules-modes">
            {MODE_ORDER.map((id) => (
              <article key={id} className={`rules-mode rules-mode-${id} mode-${id}`}>
                <div className="rules-mode-mark">
                  <span className="mode-shape" aria-hidden="true" />
                  <ModeMark mode={id} size={24} />
                </div>
                <div className="stack-sm">
                  <div className="rules-mode-title">
                    <h3>{MODES[id].name}</h3>
                    <span className="badge">{MODES[id].timerLabel}</span>
                  </div>
                  <p className="muted">{MODES[id].blurb}</p>
                  <ul className="rule-list">
                    {MODES[id].rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rules-split">
          <div className="card stack">
            <p className="eyebrow">Anthill scores</p>
            <h2>Rarer answers pay more.</h2>
            <p className="muted">
              An answer shared by another player loses exactly half its value, once. A third or
              fourth player never reduces it again.
            </p>
            <div className="legal-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Base</th>
                    <th>Shared</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(RARITIES).map(([key, tier]) => (
                    <tr key={key}>
                      <td>
                        <span className={`rarity rarity-${key}`}>{tier.name}</span>
                      </td>
                      <td>{tier.value}</td>
                      <td>{tier.value / 2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card stack">
            <p className="eyebrow">Match points</p>
            <h2>Placement is the score.</h2>
            <p className="muted">
              Every mode awards the same placement points. Round performance decides placement; only
              placement decides match points.
            </p>
            <div className="points-row">
              {PLACEMENT_POINTS.map((points, index) => (
                <span key={points} className="badge badge-outline">
                  {index + 1}
                  {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} · {points}
                </span>
              ))}
              <span className="badge badge-outline">10th+ · 0</span>
            </div>
            <p className="hint">
              Ties share a placement and its points. A player with no valid participation scores zero
              for that round.
            </p>
          </div>
        </section>

        <section className="rules-split">
          <div className="card stack">
            <p className="eyebrow">Spider Web facts</p>
            <h2>Every strand has a source.</h2>
            <p className="muted">
              Strands are checked against a reviewed graph with a cited source on every relationship.
              If a connection is missing from the round&apos;s dataset, the game says so instead of
              inventing a fact. Shorter complete paths score better.
            </p>
            <p className="hint">Path score is 1000 ÷ strands, rounded down.</p>
          </div>
          <div className="card stack">
            <p className="eyebrow">Hopper honesty</p>
            <h2>Popularity, not prophecy.</h2>
            <p className="muted">
              Hopper uses a frozen reference ranking for each question. Our launch rankings are
              editorial estimates, clearly labelled as estimates — not survey results. We never
              display invented percentages or fake participant counts.
            </p>
          </div>
        </section>

        <section className="rules-cta">
          <div>
            <p className="eyebrow">Ready?</p>
            <h2>The table is waiting.</h2>
          </div>
          <div className="row">
            <Link className="btn btn-primary btn-lg" href="/create">
              Create a room
            </Link>
            <Link className="btn btn-lg" href="/join">
              Join a room
            </Link>
            <Link className="text-link" href="/privacy">
              Privacy note
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
