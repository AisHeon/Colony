"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_SETTINGS, MODES, type RoomSettings } from "@/lib/config";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RoomSettingsForm } from "@/components/RoomSettingsForm";
import { readNickname, rememberNickname } from "@/components/HomeEntry";

export default function CreateRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(readNickname());
  }, []);

  async function create(settings: RoomSettings) {
    setError(null);
    const name = nickname.trim();
    if (!name) {
      setError("Choose a nickname first.");
      return;
    }
    setBusy(true);
    rememberNickname(name);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: name, settings }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't create the room. Try again.");
        return;
      }
      router.push(`/room/${body.roomCode}`);
    } catch {
      setError("Couldn't connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell site-shell">
      <SiteHeader />
      <main className="setup-page stack">
        <header className="setup-hero">
          <p className="eyebrow">Host the table</p>
          <h1>Pick the game.<br />Set the pace.</h1>
          <p className="lede">
            You can change everything before the first round. Settings freeze when you press start.
          </p>
        </header>

        <div className="card setup-card stack">
          <label className="field">
            <span className="label">Your nickname</span>
            <input
              className="input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={16}
              placeholder="e.g. Pip"
              autoComplete="nickname"
            />
            <span className="hint">
              2–16 characters. Unique in the room. <Link href="/privacy">Privacy note</Link>.
            </span>
          </label>

          <hr className="divider" />

          <RoomSettingsForm
            initial={{ ...DEFAULT_SETTINGS, rounds: MODES.party.defaultRounds }}
            submitLabel="Open the room"
            busy={busy}
            onSubmit={create}
          />
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <p className="hint">
          By creating a room you agree to the <Link href="/terms">terms</Link> and{" "}
          <Link href="/privacy">privacy note</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
