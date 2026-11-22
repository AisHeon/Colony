"use client";

import type { ReactNode } from "react";
import { MODES } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { formatScore } from "@/lib/scoring";
import { Avatar } from "@/components/ui";

export function PromptCard({
  eyebrow,
  text,
  scope,
  timer,
  children,
}: {
  eyebrow?: string;
  text: string;
  scope?: string;
  timer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="card prompt-card">
      <div className="spread">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : <span />}
        {timer}
      </div>
      <h1 className="prompt-text">{text}</h1>
      {scope ? (
        <details className="scope">
          <summary>What counts?</summary>
          <p style={{ marginTop: 6 }}>{scope}</p>
        </details>
      ) : null}
      {children}
    </section>
  );
}

export function Standings({ snapshot }: { snapshot: Snapshot }) {
  const match = snapshot.match;
  const players = snapshot.members.filter((member) => !member.spectator);
  const points = match?.points ?? {};
  const sorted = [...players].sort((a, b) => (points[b.id] ?? 0) - (points[a.id] ?? 0));
  const spectators = snapshot.members.filter((member) => member.spectator);

  return (
    <aside className="stack">
      <div className="card card-tight stack-sm">
        <div className="spread">
          <h3>Match points</h3>
          {match ? (
            <span className="badge">
              Round {Math.min(match.roundIndex, match.roundCount)}/{match.roundCount}
            </span>
          ) : null}
        </div>
        <ul className="roster">
          {sorted.map((member) => (
            <li
              key={member.id}
              className={`member${member.id === snapshot.you.memberId ? " is-you" : ""}`}
            >
              <Avatar name={member.nickname} index={member.avatar} size="sm" />
              <span className="member-name grow">
                {member.nickname}
                {member.isHost ? <span className="tiny muted"> · host</span> : null}
              </span>
              <span className={`dot ${member.connected ? "online" : ""}`} aria-hidden="true" />
              <span className="score">{formatScore(points[member.id] ?? 0)}</span>
            </li>
          ))}
        </ul>
      </div>

      {spectators.length ? (
        <div className="card card-tight stack-sm">
          <h3>Watching</h3>
          <ul className="roster">
            {spectators.map((member) => (
              <li key={member.id} className="member">
                <Avatar name={member.nickname} index={member.avatar} size="sm" />
                <span className="member-name grow">{member.nickname}</span>
                <span className="badge">spectator</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="tiny muted">
        {MODES[snapshot.room.settings.mode].name} · {snapshot.room.settings.rounds} round
        {snapshot.room.settings.rounds === 1 ? "" : "s"}
      </p>
    </aside>
  );
}

export function Countdown({ endsAt, offset }: { endsAt: number; offset: number }) {
  const seconds = Math.max(0, Math.ceil((endsAt - (Date.now() + offset)) / 1000));
  return <div className="countdown">{seconds}</div>;
}
