"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type Busy = "join" | "create" | null;

export function HomeEntry() {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [familyFriendly, setFamilyFriendly] = useState(true);
  const [quickMatch, setQuickMatch] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(readNickname());
  }, []);

  const rounds = quickMatch ? 4 : MODES.party.defaultRounds;
  const bugName = nickname.trim() || "Place Holder Bug";

  async function createRoom() {
    setError(null);
    const name = nickname.trim();
    if (!name) {
      setError("Choose a bug name first.");
      return;
    }
    setBusy("create");
    rememberNickname(name);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nickname: name,
          settings: { mode: "party", rounds, familyFriendly },
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't create the lobby. Try again.");
        return;
      }
      window.location.assign(`/room/${body.roomCode}`);
    } catch {
      setError("Couldn't connect. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function joinRoom(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const name = nickname.trim();
    const cleanCode = code.replace(/[\s-]/g, "").toUpperCase();
    if (!cleanCode) {
      setError("Enter a lobby code.");
      return;
    }
    if (!name) {
      setError("Choose a bug name first.");
      return;
    }
    setBusy("join");
    rememberNickname(name);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: cleanCode, nickname: name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't join that lobby.");
        return;
      }
      window.location.assign(`/room/${body.roomCode}`);
    } catch {
      setError("Couldn't connect. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="lobby-stage">
        <div className="lobby-bug">
          <div className="lobby-bug-arch" aria-hidden="true">
            <div className="lobby-bug-dome">
              <span className="lobby-bug-label">{bugName}</span>
            </div>
          </div>
          <label className="lobby-name-field">
            <span>Name</span>
            <input
              className="lobby-name-input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={16}
              placeholder="Chedward"
              autoComplete="nickname"
              autoCapitalize="words"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="lobby-panel">
          <h2>Private Lobby</h2>

          <form className="lobby-form" onSubmit={joinRoom}>
            <label className="sr-only" htmlFor="lobby-code">
              Lobby code
            </label>
            <div className="lobby-code-field">
              <input
                id="lobby-code"
                className="lobby-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              {code === "" ? (
                <span className="lobby-code-hint" aria-hidden="true">
                  ABCDEF
                </span>
              ) : null}
            </div>
            <button className="lobby-btn" type="submit" disabled={busy !== null}>
              {busy === "join" ? "Joining…" : "Join"}
            </button>
          </form>

          <h3>Create Lobby</h3>

          <div className="lobby-toggles">
            <label className="lobby-toggle">
              <span>Family friendly</span>
              <input
                type="checkbox"
                checked={familyFriendly}
                onChange={(event) => setFamilyFriendly(event.target.checked)}
              />
              <span className="lobby-switch" aria-hidden="true" />
            </label>
            <label className="lobby-toggle">
              <span>Quick match</span>
              <input
                type="checkbox"
                checked={quickMatch}
                onChange={(event) => setQuickMatch(event.target.checked)}
              />
              <span className="lobby-switch" aria-hidden="true" />
            </label>
          </div>

          <button className="lobby-btn" type="button" onClick={createRoom} disabled={busy !== null}>
            {busy === "create" ? "Opening…" : "Create"}
          </button>

          <p className="lobby-meta">
            Party mix · {rounds} rounds · {familyFriendly ? "family friendly" : "standard"}
          </p>

          {error ? (
            <p className="lobby-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <p className="lobby-legal">
        Nickname only · <Link href="/terms">terms</Link> · <Link href="/privacy">privacy</Link>
      </p>
    </>
  );
}
