"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game/types";
import { Feedback, Timer } from "@/components/ui";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { PromptCard, Standings } from "./parts";

export function Hopper({
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
  const hopper = round.hopper;
  // Uncontrolled on purpose: text typed before hydration must survive it and be
  // readable at submit time.
  const [hasText, setHasText] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = useCallback(
    (raw?: string) => {
      const field = inputRef.current;
      const text = (raw ?? field?.value ?? "").trim();
      if (!text) {
        field?.focus();
        return;
      }
      if (field) field.value = "";
      setHasText(false);
      field?.focus();
      void send({ type: "answer:submit", text, roundId: round.id });
    },
    [round.id, send],
  );

  useEffect(() => {
    const field = inputRef.current;
    if (field && field.value.trim()) setHasText(true);
  }, []);

  if (!hopper) return null;

  const totalMs = (snapshot.room.settings.hopperSeconds ?? 20) * 1000;

  return (
    <div className="game-grid">
      <div className="stack">
        <PromptCard
          eyebrow={`Hopper · ${hopper.sourceLabel}`}
          text={hopper.question}
          scope={hopper.scope}
          timer={<Timer endsAt={round.endsAt} offset={offset} totalMs={totalMs} label="Hopper time remaining" />}
        >
          <div className={`notice${hopper.mySaved ? " is-saved" : ""}`} role="status">
            {hopper.mySaved
              ? `Saved: ${hopper.mySaved.text}. You can change it before time runs out.`
              : "Save one answer. Popular answers score more — matching other players is fine."}
          </div>

          {/* Not a <form>: an implicit submit before hydration would navigate away. */}
          <div className={`answer-form${hasText ? " is-ready" : ""}`}>
            <label className="sr-only" htmlFor="hopper-answer">
              Your answer
            </label>
            <input
              id="hopper-answer"
              ref={inputRef}
              className="input input-lg grow"
              onChange={(event) => setHasText(event.currentTarget.value.trim().length > 0)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                submit(event.currentTarget.value);
              }}
              placeholder={hopper.mySaved ? "Replace your saved answer" : "Your most popular answer"}
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
              disabled={!hasText || pending}
            >
              {hopper.mySaved ? "Change" : "Save"}
            </button>
          </div>

          <Feedback feedback={snapshot.feedback} />

          <div className="spread small muted">
            <span>
              {hopper.savedCount} of {snapshot.members.filter((member) => !member.spectator).length} players
              have saved an answer
            </span>
            <span>Answers are hidden until the reveal</span>
          </div>

          <p className="tiny muted">
            Reference ranking: {hopper.sourceLabel}. Colony never displays invented percentages or
            survey counts.
          </p>
        </PromptCard>
      </div>

      <Standings snapshot={snapshot} />
    </div>
  );
}
