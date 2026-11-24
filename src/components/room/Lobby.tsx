"use client";

import { useEffect, useState } from "react";
import { MODES, packLabel, type RoomSettings } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { CopyButton } from "@/components/ui";
import { AntAvatar } from "@/components/ColonyWorld";
import { RoomSettingsForm } from "@/components/RoomSettingsForm";
import { TopicPicker } from "@/components/TopicPacks";
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
  const packs = snapshot.room.settings.packs ?? ["all"];

  return (
    <div className="game-grid lobby-screen">
      <div className="stack">
        <section className="card lobby-plate stack">
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div className="stack-sm">
              <p className="eyebrow">Room code · share this</p>
              <div className="room-code lobby-code">
                <ScrambleCode code={snapshot.room.code} />
              </div>
            </div>
            <div className="row-tight lobby-actions">
              <CopyButton value={snapshot.room.code} label="Copy code" copiedLabel="Copied" />
              <CopyButton value={invite} label="Invite link" copiedLabel="Link copied" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
                Share
              </button>
            </div>
          </div>
          <p className="lobby-code-hint">
            Send this code. Anyone who has it can join while the room is open.
          </p>
          {shareNote ? (
            <p className="small" role="status">
              {shareNote}
            </p>
          ) : null}
        </section>

        <section className="lobby-cta">
          <div className="lobby-cta-copy">
            <span className="eyebrow">{snapshot.you.isHost ? "Ready when you are" : "Take your seat"}</span>
            <p>
              {snapshot.you.isHost
                ? (startReason ?? "Everyone is ready. The tunnel is waiting.")
                : snapshot.you.ready
                  ? "You're ready. Waiting for the host to start."
                  : "Mark ready so the host can start."}
            </p>
          </div>
          {snapshot.you.isHost ? (
            <button
              type="button"
              className="btn btn-primary btn-lg lobby-start"
              disabled={!canStart || pending}
              onClick={() => send({ type: "match:start" })}
              title={startReason ?? "Start the match"}
            >
              Start match
            </button>
          ) : (
            <button
              type="button"
              className={`btn btn-lg lobby-start ${snapshot.you.ready ? "btn-secondary" : "btn-primary"}`}
              aria-pressed={snapshot.you.ready}
              disabled={pending}
              onClick={() => send({ type: "room:ready", ready: !snapshot.you.ready })}
            >
              {snapshot.you.ready ? "Ready — tap to undo" : "I'm ready"}
            </button>
          )}
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
                <AntAvatar name={member.nickname} index={member.avatar} />
                <span className="member-name grow">
                  {member.nickname}
                  {member.id === snapshot.you.memberId ? <span className="tiny muted"> · you</span> : null}
                </span>
                {member.isHost ? <span className="badge badge-accent">Host</span> : null}
                {member.ready ? <span className="badge badge-ok">Ready</span> : null}
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
                    <AntAvatar name={member.nickname} index={member.avatar} size={30} />
                    <span className="member-name grow">{member.nickname}</span>
                    <span className="badge">spectator</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="card lobby-panel stack-sm topic-panel">
          <div className="spread">
            <h2>Topics</h2>
            <span className="badge badge-outline">{packLabel(packs)}</span>
          </div>
          {snapshot.you.isHost ? (
            <>
              <TopicPicker
                value={packs}
                compact
                disabled={pending}
                onChange={(next) => send({ type: "room:updateSettings", settings: { packs: next } })}
              />
              <p className="hint">Tap to mix. Changing topics clears ready states.</p>
            </>
          ) : (
            <p className="small muted">{packLabel(packs)}</p>
          )}
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

          <p className="hint" role="status">
            {snapshot.you.isHost
              ? "Settings freeze when you start. You can still rematch afterwards."
              : "The host starts when everyone is ready."}
          </p>
        </section>
      </aside>
    </div>
  );
}

function ScrambleCode({ code }: { code: string }) {
  const [display, setDisplay] = useState(code.replace(/./g, "·"));

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(code);
      return;
    }
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      if (frame > 10) {
        setDisplay(code);
        window.clearInterval(timer);
        return;
      }
      const settled = Math.floor(frame / 2);
      setDisplay(
        [...code]
          .map((character, index) =>
            index < settled ? character : alphabet[Math.floor(Math.random() * alphabet.length)],
          )
          .join(""),
      );
    }, 55);
    return () => window.clearInterval(timer);
  }, [code]);

  return <span aria-label={`Room code ${code}`}>{display}</span>;
}
