import type { Metadata } from "next";
import { LegalPage } from "@/components/SiteChrome";
import { DeleteDataButton } from "@/components/DeleteDataButton";

export const metadata: Metadata = { title: "Delete my data" };

export default function DeleteDataPage() {
  return (
    <LegalPage title="Delete my data" updated="24 November 2026">
      <section className="stack-sm">
        <h2>Clear this browser</h2>
        <p>
          This removes Colony&apos;s local preferences (nickname, sound and age-gate choice) and asks
          the server to detach your active seat and clear the guest session. Shared match history is
          kept for the other players until the room closes; use the manual request below for immediate
          removal. It cannot remove copies held by your browser&apos;s cache or by a hosting provider
          under its own retention rules.
        </p>
        <DeleteDataButton />
      </section>

      <section className="stack-sm">
        <h2>What happens next</h2>
        <p>
          A successful request ends the guest session and removes your name from the active room. If
          you host a room, the host role moves to another connected player, or the room closes if no
          one else can take over. Other players&apos; match records remain theirs. Send a manual request
          if you need the historical answer and score rows deleted as well.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Need a manual review?</h2>
        <p>
          Email <a href="mailto:he.aison@charterschool.org">he.aison@charterschool.org</a> with the
          nickname and room code you remember. We aim to respond within 30 days. See the{" "}
          <a href="/privacy">Privacy page</a> for the full data description.
        </p>
      </section>
    </LegalPage>
  );
}
