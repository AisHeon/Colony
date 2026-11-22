"use client";

import { useEffect, useRef, useState } from "react";
import { avatarColor, type ModeId } from "@/lib/config";
import { formatScore } from "@/lib/scoring";
import { ModeMark } from "./Creatures";

export function Avatar({
  name,
  index,
  size = "md",
}: {
  name: string;
  index: number;
  size?: "sm" | "md" | "lg";
}) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const first = [...segmenter.segment(name.trim() || "?")][0]?.segment ?? "?";
  const className = size === "lg" ? "avatar avatar-lg" : size === "sm" ? "avatar avatar-sm" : "avatar";
  return (
    <span className={className} style={{ background: avatarColor(index) }} aria-hidden="true">
      {first.toUpperCase()}
    </span>
  );
}

export function ModeIcon({ mode, size = 22 }: { mode: ModeId; size?: number }) {
  return (
    <span className="mode-icon" style={{ ["--mode-accent" as string]: `var(--accent-${mode})` }}>
      <ModeMark mode={mode} size={size} />
    </span>
  );
}

export function useServerClock(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = window.setInterval(() => setNow(Date.now() + offset), 100);
    return () => window.clearInterval(timer);
  }, [offset]);
  return now;
}

export function Timer({
  endsAt,
  offset,
  totalMs,
  label,
  compact = false,
}: {
  endsAt: number | null | undefined;
  offset: number;
  totalMs: number;
  label?: string;
  compact?: boolean;
}) {
  const now = useServerClock(offset);
  if (!endsAt) return null;
  const remaining = Math.max(0, endsAt - now);
  const seconds = Math.ceil(remaining / 1000);
  const percent = totalMs > 0 ? Math.max(0, Math.min(100, (remaining / totalMs) * 100)) : 0;
  const urgent = seconds <= 5;
  return (
    <div className="timer" role="group" aria-label={label ?? "Round timer"}>
      <div
        className={`timer-value${urgent ? " urgent" : ""}`}
        aria-live={urgent ? "polite" : "off"}
        aria-atomic="true"
      >
        {seconds}s
      </div>
      <div
        className="timer-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={Math.max(0, Math.round(remaining / 1000))}
        aria-label={label ?? "Time remaining"}
      >
        <div
          className={`timer-fill${urgent ? " urgent" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && urgent ? <span className="tiny muted">Hurry</span> : null}
    </div>
  );
}

export function Feedback({
  feedback,
}: {
  feedback: { code: string; message: string; tone: "ok" | "warn" | "error" } | null;
}) {
  if (!feedback?.message) return null;
  const label =
    feedback.tone === "ok" ? "Accepted" : feedback.tone === "warn" ? "Check that" : "Not accepted";
  return (
    <div className={`feedback feedback-${feedback.tone}`} role="status" aria-live="polite">
      <div>
        <strong>{label}</strong>
        {feedback.message}
      </div>
    </div>
  );
}

export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  className = "btn btn-secondary",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<number | null>(null);

  useEffect(() => () => (timeout.current ? window.clearTimeout(timeout.current) : undefined), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("clipboard unavailable");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timeout.current) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {state === "copied" ? copiedLabel : state === "failed" ? "Copy failed — select the code" : label}
    </button>
  );
}

export function Score({ value }: { value: number }) {
  return <span className="score">{formatScore(value)}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hint">{children}</p>;
}
