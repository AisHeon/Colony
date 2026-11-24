"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MODES } from "@/lib/config";

const NICK_KEY = "colony:nickname";

export function readNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberNickname(value: string) {
  try {
    window.localStorage.setItem(NICK_KEY, value);
  } catch {
    /* storage may be blocked; nickname still works for this page */
  }
}

export function HomeEntry() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(readNickname());
  }, []);

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
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
        body: JSON.stringify({
          nickname: name,
          settings: { mode: "party", rounds: MODES.party.defaultRounds },
        }),
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

  async function joinRoom(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const name = nickname.trim();
    const cleanCode = code.replace(/[\s-]/g, "").toUpperCase();
    if (!cleanCode) {
      setError("Enter a room code.");
      return;
    }
    if (!name) {
      setError("Choose a nickname first.");
      return;
    }
    setBusy(true);
    rememberNickname(name);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: cleanCode, nickname: name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't join that room.");
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
    <div className="card entry-card">
      <div className="entry-head">
        <div>
          <span className="ticket-kicker">Start here</span>
          <h2>Claim a seat.</h2>
        </div>
        <span className="ticket-mark">no account</span>
      </div>

      <div className="entry-tabs" role="tablist" aria-label="Create or join">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className="entry-tab"
          onClick={() => setTab("create")}
        >
          Create
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          className="entry-tab"
          onClick={() => setTab("join")}
        >
          Join with code
        </button>
      </div>

      <label className="field">
        <span className="label">Nickname</span>
        <input
          className="input"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={16}
          placeholder="e.g. Pip"
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
        />
        <span className="hint">
          Shown in your room. 2–16 characters.{" "}
          <Link href="/privacy">Privacy note</Link>.
        </span>
      </label>

      {tab === "create" ? (
        <form className="stack-sm" onSubmit={createRoom}>
          <div className="entry-callout">
            <strong>Party room.</strong> Eight slots, all four games, one favourite-mode vote at the
            end. You can change the mode and rounds in the lobby.
          </div>
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
            {busy ? "Opening the room…" : "Create a room"}
          </button>
          <p className="hint">
            Want a specific game or fewer rounds?{" "}
            <Link href="/create">Set it up first</Link>.
          </p>
        </form>
      ) : (
        <form className="stack-sm" onSubmit={joinRoom}>
          <label className="field">
            <span className="label">Room code</span>
            <input
              className="input input-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="K7M4Q9"
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <span className="hint">Paste an invite link too — we only read the code.</span>
          </label>
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
            {busy ? "Joining…" : "Join the room"}
          </button>
        </form>
      )}
    </div>
  );
}
