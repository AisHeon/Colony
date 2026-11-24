"use client";

import { useEffect, useRef, useState } from "react";
import { TIMERS } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { Avatar, Feedback, Timer } from "@/components/ui";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { PromptCard, Standings } from "./parts";

export function Beehive({
  snapshot,
  send,
  pending,
  offset,
}: {
  snapshot: Snapshot;
  send: (intent: IntentBody) => Promise<IntentAck | null>;
  pending: boolean;
  offset: number;
}) {
  const round = snapshot.round!;
  const hive = round.beehive;
  // Uncontrolled on purpose: text typed before hydration must survive it and be
  // readable at submit time.
  const [hasText, setHasText] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const field = inputRef.current;
    if (field && field.value.trim()) setHasText(true);
  }, []);
  if (!hive) return null;

  const me = snapshot.you.memberId;
  const isMyTurn = hive.activeMemberId === me;
  const activeMember = snapshot.members.find((member) => member.id === hive.activeMemberId);
  const seats = hive.seatOrder
    .map((id) => snapshot.members.find((member) => member.id === id))
    .filter(Boolean) as Snapshot["members"];
  const count = Math.max(1, seats.length);

  function submit(raw?: string) {
    const field = inputRef.current;
    const text = (raw ?? field?.value ?? "").trim();
    if (!text || !isMyTurn) return;
    if (field) field.value = "";
    setHasText(false);
    field?.focus();
    void send({
      type: "answer:submit",
      text,
      roundId: round.id,
      turnId: round.beehive?.turnId ?? undefined,
    });
  }

  return (
    <div className="game-grid">
      <div className="stack">
        <PromptCard
          eyebrow="Beehive · survival round"
          text={hive.category || round.prompt.text || "Category"}
          scope={round.prompt.scope}
          timer={
            <Timer
              endsAt={hive.turnEndsAt}
              offset={offset}
              totalMs={TIMERS.beehiveTurnMs}
              label="Turn time remaining"
            />
          }
        >
          <div
            className="notice"
            role="status"
            style={
              isMyTurn
                ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                : undefined
            }
          >
            {isMyTurn
              ? "Your turn — give an unused answer before the timer runs out."
              : `${activeMember?.nickname ?? "Someone"} is on the spot.`}
          </div>

          <div className="hive" aria-hidden="true">
            <div className="hive-center">
              <span className="tiny muted">{hive.living.length} left</span>
              <strong style={{ fontSize: 14, lineHeight: 1.25 }}>
                {isMyTurn ? "Your turn" : (activeMember?.nickname ?? "—")}
              </strong>
              <span className="tiny muted">unused answers only</span>
            </div>
            {seats.map((member, index) => {
              const angle = (-90 + (360 / count) * index) * (Math.PI / 180);
              const x = 50 + 41 * Math.cos(angle);
              const y = 50 + 41 * Math.sin(angle);
              const out = !hive.living.includes(member.id);
              return (
                <div
                  key={member.id}
                  className={`hive-seat${hive.activeMemberId === member.id ? " active" : ""}${out ? " out" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <Avatar name={member.nickname} index={member.avatar} size="sm" />
                  <span className="seat-name">{member.nickname}</span>
                </div>
              );
            })}
          </div>

          {/* Not a <form>: an implicit submit before hydration would navigate away. */}
          <div className={`answer-form${hasText ? " is-ready" : ""}`}>
            <label className="sr-only" htmlFor="beehive-answer">
              Your answer
            </label>
            <input
              id="beehive-answer"
              ref={inputRef}
              className="input input-lg grow"
              onChange={(event) => setHasText(event.currentTarget.value.trim().length > 0)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                submit(event.currentTarget.value);
              }}
              placeholder={isMyTurn ? "Your unused answer" : "Wait for your turn"}
              disabled={!isMyTurn}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={120}
              autoFocus
            />
            <button
              className="btn btn-primary"
              type="button"
              data-answer-send=""
              onClick={() => submit(inputRef.current?.value ?? "")}
              disabled={!isMyTurn || !hasText || pending}
            >
              Answer
            </button>
          </div>

          <Feedback feedback={snapshot.feedback} />

          <details className="scope">
            <summary>Used answers ({hive.used.length})</summary>
            <ul className="answer-list" style={{ marginTop: 8 }} aria-label="Used answers this round">
              {hive.used.length === 0 ? <li className="hint">Nothing used yet.</li> : null}
              {[...hive.used].reverse().map((used) => (
                <li key={used.entityId} className="answer-row">
                  <span className="grow truncate">{used.name}</span>
                  <span className="tiny muted">{snapshot.members.find((m) => m.id === used.memberId)?.nickname}</span>
                </li>
              ))}
            </ul>
          </details>
          {hive.categorySwaps > 0 ? (
            <p className="hint">
              The category was refreshed {hive.categorySwaps} time{hive.categorySwaps === 1 ? "" : "s"} to
              keep enough answers available.
            </p>
          ) : null}
        </PromptCard>

        <section className="card card-tight stack-sm">
          <h3>Order</h3>
          <ol className="rule-list">
            {hive.seatOrder.map((id) => {
              const member = snapshot.members.find((entry) => entry.id === id);
              const eliminated = hive.eliminated.find((entry) => entry.memberId === id);
              return (
                <li key={id} style={{ opacity: eliminated ? 0.55 : 1 }}>
                  {member?.nickname ?? "Player"}
                  {eliminated ? ` — out (${eliminated.place}${eliminated.place === 1 ? "st" : eliminated.place === 2 ? "nd" : eliminated.place === 3 ? "rd" : "th"})` : ""}
                  {id === hive.activeMemberId ? " — turn" : ""}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <Standings snapshot={snapshot} />
    </div>
  );
}
