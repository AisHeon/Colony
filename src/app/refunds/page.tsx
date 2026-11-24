import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Refunds" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refunds and payments" updated="24 November 2026">
      <section className="stack-sm">
        <h2>Colony is free</h2>
        <p>
          There are no paid features, subscriptions, passes, cosmetics or in-game purchases. Colony
          does not ask for a card or process payments, so there is nothing to refund or cancel.
        </p>
      </section>

      <section className="stack-sm">
        <h2>If that changes</h2>
        <p>
          If a paid feature is ever introduced, the full price and all fees will be shown before
          payment, and a refund and cancellation policy will appear on this page before any charge is
          possible. We will not add a surprise charge to an existing free room.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Questions</h2>
        <p>
          If you see a payment request that claims to be from Colony, do not pay it. Tell us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
