"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readNickname, rememberNickname } from "./HomeEntry";

export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(readNickname());
  }, []);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const clean = code.replace(/[\s-]/g, "").toUpperCase();
    if (!clean) {
      setError("Enter a room code.");
      return;
    }
    if (!/^[A-Z0-9]{4,8}$/.test(clean)) {
      setError("That code isn't in the expected format.");
      return;
    }
    if (!nickname.trim()) {
      setError("Choose a nickname first.");
      return;
    }
    setBusy(true);
    rememberNickname(nickname.trim());
    try {
      const res = await fetch(`/api/rooms/${clean}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: clean, nickname: nickname.trim() }),
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
    <form className="card stack" onSubmit={submit}>
      <label className="field">
        <span className="label">Room code</span>
        <input
          className="input input-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="K7M4Q9"
          maxLength={40}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <span className="hint">Invite links work too — we only read the code.</span>
      </label>

      <label className="field">
        <span className="label">Nickname</span>
        <input
          className="input"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={16}
          placeholder="e.g. Pip"
          autoComplete="nickname"
        />
        <span className="hint">
          Shown in your room. <Link href="/privacy">Privacy note</Link>.
        </span>
      </label>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
        {busy ? "Joining…" : "Join room"}
      </button>
    </form>
  );
}
