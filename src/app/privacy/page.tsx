import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="24 November 2026">
      <section className="stack-sm">
        <h2>The short version</h2>
        <p>
          Colony is designed to be playable without an account or an email address. The game needs a
          nickname, a room code, your game answers and a guest session so it can keep your seat and
          score. We do not run advertising or third-party analytics.
        </p>
      </section>

      <section className="stack-sm">
        <h2>What we collect</h2>
        <ul className="rule-list">
          <li>
            <strong>Guest session.</strong> A random token in an HttpOnly cookie named{" "}
            <code>colony_guest</code>. The database stores only a SHA-256 hash, never the token
            itself. It lasts for up to one year so reconnect works.
          </li>
          <li>
            <strong>Game profile.</strong> Your nickname, avatar colour and room membership. Your
            nickname is shown to people in your room.
          </li>
          <li>
            <strong>Gameplay records.</strong> Accepted answers, Spider Web paths, Hopper selections,
            placements, scores and votes needed to run and settle a match.
          </li>
          <li>
            <strong>Local preferences.</strong> Your last nickname, sound preference and age-gate
            choice are kept in this browser&apos;s local storage. They never leave the browser through
            Colony.
          </li>
          <li>
            <strong>Reports you send.</strong> If you report a missing answer or connection, we keep the
            report text, the content version and the room code for review.
          </li>
        </ul>
      </section>

      <section className="stack-sm">
        <h2>Why we use it</h2>
        <p>
          To create and join rooms, keep seats through reconnects, run the timer and scoring rules,
          show results, prevent duplicate submissions, investigate reported content, and keep the
          service reliable. We do not use gameplay data to build advertising profiles.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Who receives it</h2>
        <p>
          Data is processed by the hosting and storage providers that run Colony. The current
          deployment uses Vercel for hosting and Vercel Blob for the shared room state. Those providers
          process data on our behalf; they are not permitted to use it for their own advertising.
          There are no analytics, advertising, fingerprinting or marketing SDKs in the app.
        </p>
        <p>
          We may disclose information if required by law or to protect the safety and rights of
          players. We do not sell gameplay data.
        </p>
      </section>

      <section className="stack-sm" id="children">
        <h2>Children and age</h2>
        <p>
          Colony is currently limited to players aged 13 or older. The age gate is neutral and does not
          ask for a date of birth. We do not knowingly collect personal information from children under
          13. If you believe a child under 13 has provided information, contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will remove it. A
          parental-consent flow for younger players is not available yet.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Retention</h2>
        <p>
          Rooms close after inactivity. Live room state is not kept as a permanent archive. Raw answer
          attempts are retained for the life of a room so reconnects and results stay consistent. A
          small request-deduplication table is pruned daily. Content reports remain in the review queue
          until handled. Guest sessions expire after one year.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Your choices and rights</h2>
        <p>
          You can clear this browser&apos;s Colony data from the{" "}
          <Link href="/delete-data">delete my data</Link> page. You can also email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to ask for access, correction or
          deletion of the server-side records tied to your guest session. We aim to respond within 30
          days. Because there are no accounts, we may need information from you to locate the right
          session; we will not ask for more than necessary.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Security</h2>
        <p>
          Sessions are server-issued and HttpOnly; mutations are same-origin checked. No service can
          promise perfect security, so please do not submit sensitive personal information in a
          nickname or answer.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Changes and contact</h2>
        <p>
          If this notice changes materially, the updated date at the top will change. Questions:
          {" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Operator: Aison He, an independent
          project.
        </p>
      </section>
    </LegalPage>
  );
}
