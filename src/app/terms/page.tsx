import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="24 November 2026">
      <section className="stack-sm">
        <h2>1. The service</h2>
        <p>
          Colony is a browser-based party game for private rooms. A host creates a room and shares its
          code. There are no accounts, paid tiers or in-game purchases. By using Colony you agree to
          these terms. If you do not agree, do not use the service.
        </p>
      </section>

      <section className="stack-sm">
        <h2>2. Who may play</h2>
        <p>
          You must be 13 or older to use Colony. If you are under 18, you should have a parent or
          guardian&apos;s permission. Do not use the service if you are under 13; the current age gate
          blocks that use.
        </p>
      </section>

      <section className="stack-sm">
        <h2>3. Rooms and conduct</h2>
        <p>
          Share room codes only with people you want in your room. Do not use Colony to harass,
          threaten, impersonate, spam, scrape, overload, reverse-engineer, or break the law. Do not
          submit hateful, sexual, violent or otherwise harmful content in a nickname, answer or report.
          Hosts may remove players from their own rooms; we may close a room or restrict access when
          needed to keep the service safe.
        </p>
      </section>

      <section className="stack-sm">
        <h2>4. Your content</h2>
        <p>
          You keep ownership of the nicknames and answers you submit. You give Colony a limited licence
          to store, display and process that content only to run the room, settle the match, show
          results, investigate reports and keep the service working. Do not submit content you do not
          have the right to share.
        </p>
      </section>

      <section className="stack-sm">
        <h2>5. Game content</h2>
        <p>
          Prompts, answer pools, Spider Web relationships and Hopper rankings are editorial content.
          Relationships cite sources where noted. Hopper rankings are estimates, not survey results.
          Third-party names are referenced factually as answer content; Colony is not affiliated with
          or endorsed by their rights holders.
        </p>
      </section>

      <section className="stack-sm">
        <h2>6. Availability and changes</h2>
        <p>
          The service is provided as-is and may be changed, suspended or discontinued. Rooms are
          temporary and may close after inactivity. We do not promise uninterrupted availability,
          specific player counts, or permanent storage of a match. Do not rely on Colony for backups.
        </p>
      </section>

      <section className="stack-sm">
        <h2>7. Liability</h2>
        <p>
          To the fullest extent permitted by law, Colony and its operator are not liable for indirect,
          incidental, special or consequential losses, loss of data, or losses caused by another
          player&apos;s conduct. Nothing in these terms limits rights that cannot legally be limited.
        </p>
      </section>

      <section className="stack-sm">
        <h2>8. Governing law and disputes</h2>
        <p>
          These terms are intended to be governed by the law that applies to the operator. The
          operator will confirm the governing jurisdiction before treating these terms as final. If a
          dispute arises, contact us first at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> so we can try to resolve it.
        </p>
      </section>

      <section className="stack-sm">
        <h2>9. Contact</h2>
        <p>
          Operator: Aison He, an independent project. Contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
