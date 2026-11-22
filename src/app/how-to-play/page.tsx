import Link from "next/link";
import type { Metadata } from "next";
import { MODE_ORDER, MODES, PLACEMENT_POINTS, RARITIES } from "@/lib/config";
import { Wordmark, ModeMark } from "@/components/Creatures";

export const metadata: Metadata = { title: "How to play" };

export default function HowToPlayPage() {
  return (
    <div className="shell" style={{ maxWidth: 820 }}>
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
          <h1>How to play</h1>
          <p className="muted">
            Colony is a private party game for 2–20 people. No accounts. Everyone answers on their
            own device, and the server keeps score.
          </p>
        </div>

        <section className="card stack">
          <h2>The basics</h2>
          <ol className="rule-list">
            <li>One person creates a room and shares the six-character code.</li>
            <li>Everyone joins, picks a nickname and marks themselves ready.</li>
            <li>The host starts. Each round ranks players and awards match points.</li>
            <li>Most match points at the end wins. Ties share the win.</li>
          </ol>
        </section>

        <section className="stack">
          <h2>The five modes</h2>
          <div className="stack">
            {MODE_ORDER.map((id) => (
              <article
                key={id}
                className="card"
                style={{ ["--mode-accent" as string]: `var(--accent-${id})` }}
              >
                <div className="row-tight">
                  <span className="mode-icon">
                    <ModeMark mode={id} size={20} />
                  </span>
                  <h3>{MODES[id].name}</h3>
                  <span className="badge">{MODES[id].timerLabel}</span>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {MODES[id].blurb}
                </p>
                <ul className="rule-list" style={{ marginTop: 8 }}>
                  {MODES[id].rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="card stack">
          <h2>Anthill rarities</h2>
          <p className="muted">
            Five tiers, one scale. An answer shared by another player loses exactly half its value,
            once — a third or fourth player never reduces it again.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Base value</th>
                <th>Shared by 2+ players</th>
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
        </section>

        <section className="card stack">
          <h2>Match points</h2>
          <p className="muted">
            Every mode uses the same placement table. Round performance decides placement; only
            placement decides match points.
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {PLACEMENT_POINTS.map((points, index) => (
              <span key={index} className="badge badge-outline">
                {index + 1}
                {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} · {points}
              </span>
            ))}
            <span className="badge badge-outline">10th and below · 0</span>
          </div>
          <p className="hint">
            Ties share a placement and its points; the next player skips the places that were shared.
            A player with no valid participation scores zero for that round.
          </p>
        </section>

        <section className="card stack">
          <h2>Spider Web facts</h2>
          <p className="muted">
            Strands are checked against a reviewed graph with a cited source on every relationship.
            If a connection is missing from the round&apos;s dataset, the game says so instead of
            inventing a fact. Shorter complete paths score better.
          </p>
          <p className="hint">Path score is 1000 ÷ strands, rounded down.</p>
        </section>

        <section className="card stack">
          <h2>Hopper rankings</h2>
          <p className="muted">
            Hopper uses a frozen reference ranking for each question. Our launch rankings are
            editorial estimates, clearly labeled as estimates — not survey results. We never display
            invented percentages or fake participant counts.
          </p>
        </section>

        <div className="row">
          <Link className="btn btn-primary" href="/create">
            Create a room
          </Link>
          <Link className="btn" href="/join">
            Join a room
          </Link>
        </div>
      </main>
    </div>
  );
}
