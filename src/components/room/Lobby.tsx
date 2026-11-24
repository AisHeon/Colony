"use client";

import { useEffect, useState } from "react";
import { MODES, type RoomSettings } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { Avatar, CopyButton } from "@/components/ui";
import { RoomSettingsForm } from "@/components/RoomSettingsForm";
import type { IntentAck, IntentBody } from "@/components/useRoom";

export function Lobby({
  snapshot,
  send,
  pending,
}: {
  snapshot: Snapshot;
  send: (intent: IntentBody) => Promise<IntentAck | null>;
  pending: boolean;
}) {
  const [invite, setInvite] = useState("");
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    setInvite(`${window.location.origin}/join/${snapshot.room.code}`);
  }, [snapshot.room.code]);

  const players = snapshot.members.filter((member) => !member.spectator);
  const spectators = snapshot.members.filter((member) => member.spectator);
  const connected = players.filter((member) => member.connected);
  const waitingOn = connected.filter((member) => !member.isHost && !member.ready);
  const canStart = connected.length >= 2 && waitingOn.length === 0;
  const startReason =
    connected.length < 2
      ? "At least two connected players are needed to start."
      : waitingOn.length
        ? `Waiting for ${waitingOn.map((member) => member.nickname).join(", ")}.`
        : null;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join my Colony room ${snapshot.room.code}`,
          text: "Quick answers, clever connections, one room.",
          url: invite,
        });
        return;
      }
      await navigator.clipboard.writeText(invite);
      setShareNote("Invite link copied.");
      window.setTimeout(() => setShareNote(null), 2400);
    } catch {
      setShareNote("Sharing isn't available — copy the code instead.");
    }
  }

  const mode = MODES[snapshot.room.settings.mode];

  return (
    <div className="game-grid lobby-screen">
      <div className="stack">
        <section className="card lobby-plate stack">
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div className="stack-sm">
              <p className="eyebrow">Room code · share this</p>
              <div className="room-code lobby-code">
                {snapshot.room.code}
              </div>
            </div>
            <div className="row-tight lobby-actions">
              <CopyButton value={snapshot.room.code} label="Copy code" copiedLabel="Code copied" />
              <CopyButton value={invite} label="Copy invite link" copiedLabel="Link copied" />
              <button type="button" className="btn btn-sm" onClick={share}>
                Share
              </button>
            </div>
          </div>
          <p className="hint" style={{ color: "var(--ink)" }}>
            Anyone with this code can join while the room is open. If the code won&apos;t copy,
            select it and copy manually.
          </p>
          {shareNote ? (
            <p className="small" role="status">
              {shareNote}
            </p>
          ) : null}
        </section>

        <section className="card lobby-panel stack">
          <div className="spread">
            <h2>Players</h2>
            <span className="badge">
              {players.length}/{snapshot.room.settings.maxPlayers}
            </span>
          </div>
          <ul className="roster">
            {players.map((member) => (
              <li
                key={member.id}
                className={`member${member.id === snapshot.you.memberId ? " is-you" : ""}`}
              >
                <Avatar name={member.nickname} index={member.avatar} />
                <span className="member-name grow">
                  {member.nickname}
                  {member.id === snapshot.you.memberId ? <span className="tiny muted"> · you</span> : null}
                </span>
                {member.isHost ? <span className="badge badge-accent">Host</span> : null}
                {member.ready ? <span className="badge">Ready</span> : null}
                {!member.connected ? <span className="badge badge-warn">Away</span> : null}
                <span className={`dot ${member.connected ? "online" : ""}`} aria-hidden="true" />
              </li>
            ))}
          </ul>

          {spectators.length ? (
            <div className="stack-sm">
              <hr className="divider" />
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
        </section>

        {snapshot.you.isHost && snapshot.room.status !== "closed" ? (
          <details className="card">
            <summary style={{ cursor: "pointer", fontWeight: 650 }}>
              Host settings — {mode.name}, {snapshot.room.settings.rounds} round
              {snapshot.room.settings.rounds === 1 ? "" : "s"}
            </summary>
            <div style={{ marginTop: 16 }}>
              <RoomSettingsForm
                initial={snapshot.room.settings as RoomSettings}
                submitLabel="Save settings"
                busy={pending}
                onSubmit={(settings) => send({ type: "room:updateSettings", settings })}
              />
            </div>
          </details>
        ) : null}
      </div>

      <aside className="stack">
        <section className="card lobby-panel stack">
          <div className="row-tight">
            <h2>{mode.name}</h2>
            <span className="badge">{mode.timerLabel}</span>
          </div>
          <p className="small muted">{mode.blurb}</p>
          <ul className="rule-list">
            {mode.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <hr className="divider" />
          <dl className="stack-sm" style={{ margin: 0 }}>
            <div className="spread small">
              <dt className="muted">Rounds</dt>
              <dd style={{ margin: 0 }}>{snapshot.room.settings.rounds}</dd>
            </div>
            <div className="spread small">
              <dt className="muted">Max players</dt>
              <dd style={{ margin: 0 }}>{snapshot.room.settings.maxPlayers}</dd>
            </div>
            <div className="spread small">
              <dt className="muted">Content</dt>
              <dd style={{ margin: 0 }}>
                {snapshot.room.settings.familyFriendly ? "Family-friendly" : "Standard"}
              </dd>
            </div>
            {snapshot.room.settings.mode === "spider" || snapshot.room.settings.mode === "party" ? (
              <div className="spread small">
                <dt className="muted">Spider Web</dt>
                <dd style={{ margin: 0 }}>{snapshot.room.settings.spiderSeconds}s</dd>
              </div>
            ) : null}
            {snapshot.room.settings.mode === "hopper" || snapshot.room.settings.mode === "party" ? (
              <div className="spread small">
                <dt className="muted">Hopper</dt>
                <dd style={{ margin: 0 }}>{snapshot.room.settings.hopperSeconds}s</dd>
              </div>
            ) : null}
          </dl>

          {snapshot.you.isHost ? (
            <div className="stack-sm">
              <button
                type="button"
                className="btn btn-primary btn-lg lobby-start"
                disabled={!canStart || pending}
                onClick={() => send({ type: "match:start" })}
                title={startReason ?? "Start the match"}
              >
                Start match
              </button>
              <p className="hint" role="status">
                {startReason ?? "Everyone is ready. Settings freeze when you start."}
              </p>
            </div>
          ) : (
            <div className="stack-sm">
              <button
                type="button"
                className={`btn btn-lg ${snapshot.you.ready ? "" : "btn-primary"}`}
                aria-pressed={snapshot.you.ready}
                disabled={pending}
                onClick={() => send({ type: "room:ready", ready: !snapshot.you.ready })}
              >
                {snapshot.you.ready ? "Ready — tap to unready" : "I'm ready"}
              </button>
              <p className="hint" role="status">
                {snapshot.you.ready ? "Waiting for the host to start." : "Mark ready when you're set."}
              </p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
