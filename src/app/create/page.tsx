"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, MODES, type RoomSettings } from "@/lib/config";
import { Wordmark } from "@/components/Creatures";
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
    if (settings.rounds < 1 || settings.rounds > 20) {
      setError("Rounds must be between 1 and 20.");
      return;
    }
    if (settings.maxPlayers < 2 || settings.maxPlayers > 20) {
      setError("Player limit must be between 2 and 20.");
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
    <div className="shell" style={{ maxWidth: 720 }}>
      <header className="site-head">
        <Link href="/" aria-label="Colony home">
          <Wordmark />
        </Link>
        <Link className="btn btn-ghost" href="/">
          Back
        </Link>
      </header>

      <main className="stack">
        <div className="stack-sm">
          <h1>Create a room</h1>
          <p className="muted">
            Pick a mode and settings. Everyone joins with the code, and settings freeze when you
            start.
          </p>
        </div>

        <div className="card stack">
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
            <span className="hint">2–16 characters. Unique in the room.</span>
          </label>

          <hr className="divider" />

          <RoomSettingsForm
            initial={{ ...DEFAULT_SETTINGS, rounds: MODES.party.defaultRounds }}
            submitLabel="Create room"
            busy={busy}
            onSubmit={create}
          />
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
