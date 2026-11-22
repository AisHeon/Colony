"use client";

import { useState } from "react";
import { LIMITS, MODE_ORDER, MODES, PLAYABLE_MODES, type ModeId, type RoomSettings } from "@/lib/config";
import { ModeMark } from "./Creatures";

export function RoomSettingsForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial: RoomSettings;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (settings: RoomSettings) => void;
}) {
  const [settings, setSettings] = useState<RoomSettings>(initial);
  const [advanced, setAdvanced] = useState(false);

  const update = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const mode = MODES[settings.mode];

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(settings);
      }}
    >
      <div className="field">
        <span className="label">Mode</span>
        <div className="mode-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {(["party", ...PLAYABLE_MODES] as ModeId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`mode-card${settings.mode === id ? " is-selected" : ""}`}
              aria-pressed={settings.mode === id}
              onClick={() => {
                update("mode", id);
                update("rounds", MODES[id].defaultRounds);
              }}
              style={{
                ["--mode-accent" as string]: `var(--accent-${id})`,
                borderColor: settings.mode === id ? `var(--accent-${id})` : undefined,
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span className="row-tight">
                <span className="mode-icon" style={{ width: 28, height: 28 }}>
                  <ModeMark mode={id} size={18} />
                </span>
                <strong>{MODES[id].name}</strong>
              </span>
              <span className="tiny muted">{MODES[id].rule}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <label className="field grow">
          <span className="label">{settings.mode === "party" ? "Playlist rounds" : "Rounds"}</span>
          <input
            className="input"
            type="number"
            min={LIMITS.minRounds}
            max={LIMITS.maxRounds}
            value={settings.rounds}
            onChange={(event) => update("rounds", Number(event.target.value))}
          />
          <span className="hint">1–20 rounds.</span>
        </label>
        <label className="field grow">
          <span className="label">Max players</span>
          <input
            className="input"
            type="number"
            min={LIMITS.minPlayers}
            max={LIMITS.maxPlayers}
            value={settings.maxPlayers}
            onChange={(event) => update("maxPlayers", Number(event.target.value))}
          />
          <span className="hint">2–20.</span>
        </label>
      </div>

      {settings.mode === "party" ? (
        <div className="notice">
          <strong>Party playlist.</strong> {settings.rounds} slots. Each slot is one complete round
          of a shuffled minigame — all four appear before any repeats.
        </div>
      ) : (
        <p className="hint">{mode.rule}</p>
      )}

      {settings.mode === "spider" || settings.mode === "party" ? (
        <label className="field">
          <span className="label">Spider Web duration</span>
          <select
            className="select"
            value={settings.spiderSeconds}
            onChange={(event) => update("spiderSeconds", Number(event.target.value) as 60 | 90 | 120)}
          >
            <option value={60}>60 seconds</option>
            <option value={90}>90 seconds (default)</option>
            <option value={120}>120 seconds</option>
          </select>
        </label>
      ) : null}

      {settings.mode === "hopper" || settings.mode === "party" ? (
        <label className="field">
          <span className="label">Hopper duration</span>
          <select
            className="select"
            value={settings.hopperSeconds}
            onChange={(event) => update("hopperSeconds", Number(event.target.value) as 15 | 20 | 30)}
          >
            <option value={15}>15 seconds</option>
            <option value={20}>20 seconds (default)</option>
            <option value={30}>30 seconds</option>
          </select>
        </label>
      ) : null}

      <button
        type="button"
        className="btn btn-ghost"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
      >
        {advanced ? "Hide content controls" : "Content controls"}
      </button>

      {advanced ? (
        <div className="card-flat stack-sm">
          <label className="check">
            <input
              type="checkbox"
              checked={settings.familyFriendly}
              onChange={(event) => update("familyFriendly", event.target.checked)}
            />
            <span>
              <strong>Family-friendly content</strong>
              <br />
              <span className="hint">Only reviewed prompts and puzzles marked family-friendly.</span>
            </span>
          </label>
          <p className="hint">
            Content pack: <strong>Core</strong> — {MODE_ORDER.length} modes, verified answer lists and
            sourced Spider Web facts.
          </p>
        </div>
      ) : null}

      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
        {busy ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
