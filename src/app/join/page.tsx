import Link from "next/link";
import { Wordmark } from "@/components/Creatures";
import { JoinForm } from "@/components/JoinForm";

export default function JoinPage() {
  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <header className="site-head">
        <Link href="/" aria-label="Colony home">
          <Wordmark />
        </Link>
        <Link className="btn btn-ghost" href="/">
          Back
        </Link>
      </header>
      <main className="stack">
        <h1>Join a room</h1>
        <p className="muted">Ask the host for the six-character code or invite link.</p>
        <JoinForm />
      </main>
    </div>
  );
}
