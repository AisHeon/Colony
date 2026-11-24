import Link from "next/link";
import { GAME_TAGLINE, MODE_ORDER, MODES } from "@/lib/config";
import { ModeMark } from "@/components/Creatures";
import { HomeEntry } from "@/components/HomeEntry";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CasteRibbon } from "@/components/ColonyWorld";

export default function HomePage() {
  return (
    <div className="shell site-shell home-shell">
      <SiteHeader />
      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow">A party game for 2–20 bugs</p>
            <h1 className="home-wordmark" aria-label="Colony">
              COLONY
            </h1>
            <p className="home-line">
              Start at the surface. Answer fast. Sink to the queen&apos;s chamber.
            </p>
            <CasteRibbon />
            <p className="home-note">
              {GAME_TAGLINE} <Link href="/how-to-play">How to play</Link>
            </p>
            <p className="home-pack-line">
              World History · Wordplay · Geography · Science · Food · Screen · Games
            </p>
          </div>
          <div className="home-entry-panel">
            <HomeEntry />
          </div>
        </section>

        <section className="home-modes" aria-label="Game modes">
          {MODE_ORDER.map((id) => (
            <Link key={id} href="/how-to-play" className={`home-mode home-mode-${id}`}>
              <ModeMark mode={id} size={20} />
              <span>{MODES[id].name}</span>
              <span className="home-mode-rule">{MODES[id].timerLabel}</span>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
