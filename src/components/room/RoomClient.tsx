"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MODES } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { Wordmark } from "@/components/Creatures";
import { CopyButton } from "@/components/ui";
import { SiteFooter } from "@/components/SiteChrome";
import { useRoom } from "@/components/useRoom";
import { readNickname, rememberNickname } from "@/components/HomeEntry";
import { Lobby } from "./Lobby";
import { RoundView } from "./RoundView";
import { FinalResults } from "./Results";

type Sound = "accepted" | "rejected" | "turn" | "end";

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { snapshot, error, loading, connected, pending, toast, offset, send, refresh } = useRoom(code);
  const [sound, setSound] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const lastFeedbackRef = useRef<number>(0);
  const [joining, setJoining] = useState(false);
  const [nickname, setNickname] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSound(window.localStorage.getItem("colony:sound") === "1");
      setNickname(readNickname());
    } catch {
      /* ignore */
    }
  }, []);

  const beep = (kind: Sound) => {
    if (!sound) return;
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const map: Record<Sound, [number, number, number]> = {
        accepted: [660, 880, 0.09],
        rejected: [240, 200, 0.12],
        turn: [520, 780, 0.16],
        end: [440, 660, 0.22],
      };
      const [start, finish, duration] = map[kind];
      osc.frequency.setValueAtTime(start, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(finish, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* audio is optional */
    }
  };

  useEffect(() => {
    const feedback = snapshot?.feedback;
    if (!feedback || !sound) return;
    if (feedback.at === lastFeedbackRef.current) return;
    lastFeedbackRef.current = feedback.at;
    beep(feedback.tone === "ok" ? "accepted" : "rejected");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.feedback?.at, sound]);

  const isMyTurn = useMemo(() => {
    const round = snapshot?.round;
    return !!round?.beehive?.activeMemberId && round.beehive.activeMemberId === snapshot?.you.memberId;
  }, [snapshot]);

  useEffect(() => {
    if (isMyTurn) beep("turn");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);

  useEffect(() => {
    if (snapshot?.round?.phase === "results") beep("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.round?.phase]);

  async function join() {
    setJoinError(null);
    const name = nickname.trim();
    if (!name) {
      setJoinError("Choose a nickname first.");
      return;
    }
    setJoining(true);
    rememberNickname(name);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, nickname: name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setJoinError(body?.error?.message ?? "Couldn't join the room.");
        return;
      }
      await refresh();
    } catch {
      setJoinError("Couldn't connect. Try again.");
    } finally {
      setJoining(false);
    }
  }

  async function leave() {
    if (!window.confirm("Leave this room?")) return;
    await send({ type: "room:leave" });
    router.push("/");
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      window.localStorage.setItem("colony:sound", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) {
      try {
        audioRef.current = audioRef.current ?? new AudioContext();
      } catch {
        /* ignore */
      }
    }
  }

  if (loading && !snapshot) {
    return (
      <div className="shell">
        <header className="site-head">
          <Wordmark />
        </header>
        <main className="stack" aria-busy="true">
          <div className="card stack">
            <p className="eyebrow">Opening room</p>
            <h1>Connecting…</h1>
            <p className="muted">Fetching the latest room state.</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="shell" style={{ maxWidth: 560 }}>
        <header className="site-head">
          <Link href="/" aria-label="Colony home">
            <Wordmark />
          </Link>
        </header>
        <main className="card stack" style={{ marginTop: 24 }}>
          <h1>{error.code === "ROOM_NOT_FOUND" ? "Room not found" : "Couldn't open the room"}</h1>
          <p className="muted">{error.message}</p>
          <div className="row">
            <Link className="btn btn-primary" href="/join">
              Try another code
            </Link>
            <Link className="btn" href="/">
              Home
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!snapshot) return null;

  if (!snapshot.you.memberId) {
    return (
      <div className="shell" style={{ maxWidth: 520 }}>
        <header className="site-head">
          <Link href="/" aria-label="Colony home">
            <Wordmark />
          </Link>
        </header>
        <main className="card stack" style={{ marginTop: 12 }}>
          <p className="eyebrow">Room {snapshot.room.code}</p>
          <h1>Take a seat</h1>
          <p className="muted">
            {snapshot.members.length} player{snapshot.members.length === 1 ? "" : "s"} already in the
            room. Enter a nickname to join.
          </p>
          <label className="field">
            <span className="label">Nickname</span>
            <input
              className="input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={16}
              placeholder="e.g. Pip"
              autoComplete="nickname"
              autoFocus
            />
          </label>
          {joinError ? (
            <p className="error-text" role="alert">
              {joinError}
            </p>
          ) : null}
          <button className="btn btn-primary btn-lg" onClick={join} disabled={joining}>
            {joining ? "Joining…" : "Join room"}
          </button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const round = snapshot.round;
  const match = snapshot.match;
  const inLobby = snapshot.room.status === "lobby";
  const matchFinished = match?.status === "ended";

  return (
    <div className={`game${inLobby ? " is-lobby" : ""}`}>
      <header className="game-bar">
        <div className="shell game-bar-inner">
          <Link href="/" className="wordmark" aria-label="Colony home">
            <span>Colony</span>
          </Link>
          <span className="room-code" title="Room code">
            {snapshot.room.code}
            <span className="hide-mobile">room</span>
          </span>
          {match ? (
            <span className={`badge`} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {MODES[match.mode].name}
              {round ? ` · round ${Math.min(round.index, match.roundCount)}/${match.roundCount}` : ""}
            </span>
          ) : (
            <span className="badge">{MODES[snapshot.room.settings.mode].name} · lobby</span>
          )}
          <span className="grow" />
          <span className="row-tight hide-mobile">
            <span className={`dot ${connected ? "online" : ""}`} aria-hidden="true" />
            <span className="tiny muted">{connected ? "Live" : "Reconnecting"}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleSound}
            aria-pressed={sound}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={leave}>
            Leave
          </button>
        </div>
      </header>

      <main className="game-main">
        <div className="shell stack">
          {!connected ? (
            <div className="notice notice-warn" role="status">
              Connection lost. Trying to reconnect — your seat and score are held.
            </div>
          ) : null}
          {snapshot.serverIssues.map((issue) => (
            <div key={issue} className="notice notice-warn" role="status">
              {issue}
            </div>
          ))}
          {snapshot.you.spectator ? (
            <div className="notice" role="status">
              You&apos;re spectating this match. You&apos;ll be able to join the next one — the host
              can start a rematch from the results screen.
            </div>
          ) : null}

          {snapshot.room.status === "closed" ? (
            <div className="card stack">
              <h1>This room has closed</h1>
              <p className="muted">Rooms close after everyone has been away for a while.</p>
              <Link className="btn btn-primary" href="/create">
                Create a new room
              </Link>
            </div>
          ) : inLobby || !match ? (
            <Lobby snapshot={snapshot} send={send} pending={pending} />
          ) : matchFinished ? (
            <FinalResults snapshot={snapshot} send={send} pending={pending} offset={offset} />
          ) : round ? (
            <RoundView snapshot={snapshot} send={send} pending={pending} offset={offset} />
          ) : (
            <div className="card stack">
              <h2>Waiting for the next round</h2>
              <p className="muted">The host is setting things up.</p>
            </div>
          )}

        </div>
      </main>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <div className="shell">
        <SiteFooter />
      </div>
    </div>
  );
}
