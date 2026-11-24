import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies and local storage" updated="24 November 2026">
      <section className="stack-sm">
        <h2>Only what the game needs</h2>
        <p>
          Colony does not use advertising, analytics, affiliate or social-media cookies. There is no
          consent banner because no non-essential script is loaded. If that changes, we will add an
          equally weighted accept/reject choice before the script loads and update this page.
        </p>
      </section>

      <section className="stack-sm">
        <h2>What is stored</h2>
        <div className="legal-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Where</th>
                <th>Purpose</th>
                <th>Lifetime</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>colony_guest</code>
                </td>
                <td>HttpOnly cookie</td>
                <td>Keeps your seat and score through a refresh or reconnect.</td>
                <td>Up to 1 year</td>
              </tr>
              <tr>
                <td>
                  <code>colony:nickname</code>
                </td>
                <td>Local storage</td>
                <td>Remembers the nickname you typed on this browser.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>colony:sound</code>
                </td>
                <td>Local storage</td>
                <td>Remembers whether game sounds are on.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>colony:age-ok</code>
                </td>
                <td>Local storage</td>
                <td>Remembers that this browser passed the neutral age gate.</td>
                <td>Until cleared</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack-sm">
        <h2>Third parties</h2>
        <p>
          Vercel hosts the application and stores shared room state. Its infrastructure may set
          operational cookies at the platform edge, but Colony does not add advertising or analytics
          trackers. Check Vercel&apos;s own privacy notice for its infrastructure processing.
        </p>
      </section>

      <section className="stack-sm">
        <h2>Change your choice</h2>
        <p>
          Clear this browser&apos;s Colony data on the{" "}
          <a href="/delete-data">delete my data</a> page. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
