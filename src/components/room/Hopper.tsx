"use client";

import { useState } from "react";
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
  const [input, setInput] = useState("");
  if (!hopper) return null;

  const totalMs = (snapshot.room.settings.hopperSeconds ?? 20) * 1000;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void send({ type: "answer:submit", text, roundId: round.id });
  }

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

          <form className="answer-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="hopper-answer">
              Your answer
            </label>
            <input
              id="hopper-answer"
              className="input input-lg grow"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={hopper.mySaved ? "Replace your saved answer" : "Your most popular answer"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={120}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={!input.trim() || pending}>
              {hopper.mySaved ? "Change" : "Save"}
            </button>
          </form>

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
