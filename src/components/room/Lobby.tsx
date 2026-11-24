"use client";

import { useEffect, useState } from "react";
import {
  MODES,
  MODE_ORDER,
  PLAYABLE_MODES,
  packLabel,
  type ModeId,
  type PlayableMode,
  type RoomSettings,
} from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { CopyButton } from "@/components/ui";
import { AntAvatar } from "@/components/ColonyWorld";
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

  const settings = snapshot.room.settings as RoomSettings;
  const partyModes: PlayableMode[] =
    settings.partyModes && settings.partyModes.length ? settings.partyModes : PLAYABLE_MODES;
  const packs = settings.packs ?? ["all"];
  const isHost = snapshot.you.isHost;
  const mode = MODES[settings.mode];
  const emptySeats = Math.min(8, Math.max(0, Math.min(settings.maxPlayers, players.length + 4) - players.length));

  function update(patch: Partial<RoomSettings>) {
    void send({ type: "room:updateSettings", settings: patch });
  }

  function togglePartyMode(id: PlayableMode) {
    const next = partyModes.includes(id)
      ? partyModes.filter((entry) => entry !== id)
      : [...partyModes, id];
    if (!next.length) return;
    update({ partyModes: next });
  }

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

  return (
    <div className="lobby-screen lobby-mock">
      <section className="lobby-codebar">
        <div className="lobby-codebar-id">
          <span className="eyebrow">Room code</span>
          <strong className="lobby-codebar-code">
            <ScrambleCode code={snapshot.room.code} />
          </strong>
        </div>
        <div className="lobby-codebar-actions">
          <CopyButton value={snapshot.room.code} label="Copy code" copiedLabel="Copied" />
          <CopyButton value={invite} label="Invite link" copiedLabel="Link copied" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
            Share
          </button>
        </div>
        <p className="lobby-codebar-hint">Anyone with this code can join while the room is open.</p>
        {shareNote ? (
          <p className="small lobby-codebar-hint" role="status">
            {shareNote}
          </p>
        ) : null}
      </section>

      <div className="lobby-mock-grid">
        <section className="lobby-players">
          <header className="lobby-panel-head">
            <h2>Players</h2>
            <span className="lobby-count">
              {players.length}/{settings.maxPlayers}
            </span>
          </header>

          <ul className="player-grid">
            {players.map((member) => (
              <li key={member.id} className="player-tile">
                <AntAvatar name={member.nickname} index={member.avatar} size={76} />
                <span className="player-tile-name">
                  {member.nickname}
                  {member.id === snapshot.you.memberId ? " (YOU)" : ""}
                </span>
                <span className={`player-tile-meta${member.connected ? "" : " is-away"}`}>
                  {member.isHost ? "Host" : member.ready ? "Ready" : member.connected ? "Waiting" : "Away"}
                </span>
              </li>
            ))}
            {Array.from({ length: emptySeats }).map((_, index) => (
              <li key={`seat-${index}`} className="player-tile is-empty" aria-hidden="true">
                <span className="player-seat" />
                <span className="player-tile-name muted">Open</span>
              </li>
            ))}
          </ul>

          {spectators.length ? (
            <div className="lobby-watching">
              <hr className="divider" />
              <h3>Watching</h3>
              <ul className="roster">
                {spectators.map((member) => (
                  <li key={member.id} className="member">
                    <AntAvatar name={member.nickname} index={member.avatar} size={28} />
                    <span className="member-name grow">{member.nickname}</span>
                    <span className="badge">spectator</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="lobby-host">
          <h2>Host Settings</h2>

          {isHost ? (
            <div className="host-fields">
              <label className="host-field">
                <span className="host-label">Gamemode</span>
                <select
                  className="host-pill"
                  value={settings.mode}
                  disabled={pending}
                  onChange={(event) => update({ mode: event.target.value as ModeId })}
                >
                  {MODE_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {MODES[id].name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="host-field">
                <span className="host-label">Rounds</span>
                <select
                  className="host-pill"
                  value={settings.rounds}
                  disabled={pending}
                  onChange={(event) => update({ rounds: Number(event.target.value) })}
                >
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>

              <div className="host-field">
                <span className="host-label">Topics</span>
                <details className="host-drop">
                  <summary className="host-pill">{packLabel(packs)}</summary>
                  <div className="host-drop-body">
                    <TopicPicker
                      compact
                      value={packs}
                      disabled={pending}
                      onChange={(next) => update({ packs: next })}
                    />
                  </div>
                </details>
              </div>

              <div className="host-advanced">
                <h3>Advanced</h3>
                <span className="host-label">Party Gamemodes</span>
                <div className="host-modes" role="group" aria-label="Party minigames">
                  {PLAYABLE_MODES.map((id) => {
                    const on = partyModes.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`host-mode${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        disabled={pending}
                        onClick={() => togglePartyMode(id)}
                      >
                        {MODES[id].name}
                      </button>
                    );
                  })}
                </div>
                <p className="hint">
                  {settings.mode === "party"
                    ? "Party draws from the checked minigames."
                    : "Used when the gamemode is Party."}
                </p>
              </div>
            </div>
          ) : (
            <dl className="host-readonly">
              <div>
                <dt>Mode</dt>
                <dd>{mode.name}</dd>
              </div>
              <div>
                <dt>Rounds</dt>
                <dd>{settings.rounds}</dd>
              </div>
              <div>
                <dt>Topics</dt>
                <dd>{packLabel(packs)}</dd>
              </div>
              <div>
                <dt>Content</dt>
                <dd>{settings.familyFriendly ? "Family-friendly" : "Standard"}</dd>
              </div>
              <p className="hint">The host controls these.</p>
            </dl>
          )}

          <p className="hint lobby-host-note">
            {isHost
              ? "Changes apply immediately. Starting the match freezes them."
              : "The host starts when everyone is ready."}
          </p>
        </aside>
      </div>

      <section className="lobby-cta">
        <div className="lobby-cta-copy">
          <span className="eyebrow">{isHost ? "Ready when you are" : "Take your seat"}</span>
          <p>
            {isHost
              ? (startReason ?? "Everyone is ready. The tunnel is waiting.")
              : snapshot.you.ready
                ? "You're ready. Waiting for the host to start."
                : "Mark ready so the host can start."}
          </p>
        </div>
        {isHost ? (
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
