import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact" updated="24 November 2026">
      <section className="stack-sm">
        <h2>Talk to a person</h2>
        <p>
          Colony is run by Aison He as an independent project. For a data request, a content report, a
          bug, or a question about these pages, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          Please include the room code and approximate time if you are reporting a game issue. Do not
          send passwords, payment details or other sensitive information.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Data requests</h2>
        <p>
          Start with <Link href="/delete-data">delete my data</Link> to clear this browser. If you need
          server-side records removed, email the address above with the nickname and room code you
          remember. We aim to respond within 30 days.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Safety</h2>
        <p>
          If someone is using Colony to harass or threaten someone, report it to the platform where
          the room was shared as well as to us. We may close rooms or restrict access while we look
          into a report.
        </p>
      </section>
    </LegalPage>
  );
}
