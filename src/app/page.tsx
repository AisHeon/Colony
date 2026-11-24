import Image from "next/image";
import Link from "next/link";
import "./jungle.css";
import { Playfair_Display } from "next/font/google";
import { HomeEntry } from "@/components/HomeEntry";
import { GAME_TAGLINE } from "@/lib/config";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jungle",
  display: "swap",
});

// 24 × 14 crop of the hero art, inlined so the first paint is the jungle rather
// than a flat green block while the 73 kB hero downloads.
const HERO_BLUR =
  "data:image/webp;base64,UklGRqoAAABXRUJQVlA4IJ4AAABQBACdASoYAA4APtFWo0uoJKMhsAgBABoJaACdMoAlqhWrKSyU7eiojEoQAP5xuXV3Wxgo9QWJMxVlWX1jPb/y+fjmvctS/EPsVxvXLkEO8Du8u7YlRphtX14izJK/HlRTCXpI1Y5GV/kj9bv0Pn7irnloXhR5fRBiyaaYpXvIkiB8pBjA2hRJ9/bh6ghLt4nIjOt+uschDsadeAAAAA==";

export default function HomePage() {
  return (
    <div className={`${display.variable} jungle-home`}>
      <section className="jungle-hero" aria-label="Colony">
        <Image
          src="/art/jungle/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HERO_BLUR}
          className="jungle-hero-art"
        />
        <h1 className="jungle-title">Colony</h1>
        <a className="jungle-scroll" href="#lobby">
          <span>scroll down for parties and options</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 8l8 8 8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>

      <section className="jungle-lobby" id="lobby" aria-label="Lobby">
        <HomeEntry />
      </section>

      <footer className="jungle-footer">
        <p className="jungle-footer-brand">Colony</p>
        <p className="jungle-footer-line">{GAME_TAGLINE}</p>
        <nav className="jungle-footer-links" aria-label="Footer">
          <Link href="/how-to-play">How to play</Link>
          <Link href="/create">Advanced setup</Link>
          <Link href="/join">Join by link</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/credits">Credits</Link>
        </nav>
      </footer>
    </div>
  );
}
