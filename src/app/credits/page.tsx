import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Credits and licences" };

export default function CreditsPage() {
  return (
    <LegalPage title="Credits and licences" updated="24 November 2026">
      <section className="stack-sm">
        <h2>Colony</h2>
        <p>
          Game design, rules, interface and editorial content by Aison He. The key art was made for
          Colony in Canva and is served locally from this project. Creature marks and interface
          drawings are original inline SVG.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Fonts</h2>
        <p>
          Bricolage Grotesque, Space Grotesk and JetBrains Mono are self-hosted from Google Fonts
          under the SIL Open Font License 1.1. The licence texts are included in{" "}
          <code>public/fonts/</code>. They are not sold or sublicensed as standalone font files.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Content references</h2>
        <p>
          Spider Web relationships cite Wikipedia pages in the game dataset, accessed 2026-11-12.
          Hopper rankings are editorial estimates written for this game and labelled as estimates, not
          survey results. Pokémon, Minecraft, Disney, Harry Potter and Star Wars names are referenced
          factually as answer content; Colony is not affiliated with, endorsed by or sponsored by those
          rights holders, and no proprietary artwork is used.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Source and licences</h2>
        <p>
          The application source is available at{" "}
          <a href="https://github.com/AisHeon/Colony" rel="noreferrer">
            github.com/AisHeon/Colony
          </a>
          . Third-party dependencies keep their own licences; no GPL or AGPL dependency is used to
          provide the hosted game.
        </p>
        <p>
          <Link href="/contact">Contact the operator</Link> with a licensing question.
        </p>
      </section>
    </LegalPage>
  );
}
