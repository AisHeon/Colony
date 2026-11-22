"use client";

import { useCallback, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game/types";
import { formatScore } from "@/lib/scoring";
import { Feedback, Timer } from "@/components/ui";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { PromptCard, Standings } from "./parts";

export function Anthill({
  snapshot,
  send,
  offset,
}: {
  snapshot: Snapshot;
  send: (intent: IntentBody) => Promise<IntentAck | null>;
  pending: boolean;
  offset: number;
}) {
  const round = snapshot.round!;
  const [input, setInput] = useState("");
  const [queued, setQueued] = useState(0);
  const queueRef = useRef<string[]>([]);
  const workingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const mine = round.prompt.myAnswers ?? [];
  const myTotal = round.anthill?.leaderboard.find((row) => row.memberId === snapshot.you.memberId)?.total ?? 0;
  const top = [...(round.anthill?.leaderboard ?? [])].slice(0, 6);

  const drain = useCallback(async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    while (queueRef.current.length) {
      const text = queueRef.current[0];
      const ack = await send({ type: "answer:submit", text, roundId: round.id });
      queueRef.current = queueRef.current.slice(1);
      setQueued(queueRef.current.length);
      if (ack && !ack.ok && (ack.code === "UNKNOWN_OR_UNVERIFIED" || ack.code === "KNOWN_WRONG_TYPE")) {
        // Put a rejected answer back only if the player hasn't typed something new.
        if (!inputRef.current?.value) setInput(text);
      }
    }
    workingRef.current = false;
  }, [round.id, send]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    if (queueRef.current.length >= 3) return;
    queueRef.current.push(text);
    setQueued(queueRef.current.length);
    setInput("");
    inputRef.current?.focus();
    void drain();
  }

  return (
    <div className="game-grid">
      <div className="stack">
        <PromptCard
          eyebrow="Anthill · 30 seconds"
          text={round.prompt.text ?? ""}
          scope={round.prompt.scope}
          timer={<Timer endsAt={round.endsAt} offset={offset} totalMs={30_000} label="Anthill time remaining" />}
        >
          <form className="answer-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="anthill-answer">
              Your answer
            </label>
            <input
              id="anthill-answer"
              ref={inputRef}
              className="input input-lg grow"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type an answer and press Enter"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={120}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
              Submit
            </button>
          </form>

          <Feedback feedback={snapshot.feedback} />

          <div className="spread small muted">
            <span>
              {mine.length} accepted · {formatScore(myTotal)} harvest
            </span>
            <span>
              {queued > 0 ? `${queued} sending…` : "Live — sharing can change totals"}
            </span>
          </div>

          {mine.length === 0 ? (
            <p className="hint">
              Rarer answers score more: Forager 100, Soldier 200, Royal Guard 300, Queen 500, Apex
              1,000.
            </p>
          ) : (
            <ul className="answer-list" aria-label="Your accepted answers">
              {mine.map((answer) => (
                <li key={answer.entityId} className={`answer-row${answer.shared ? " shared" : ""}`}>
                  <span className={`rarity rarity-${answer.rarity}`}>{answer.rarityName}</span>
                  <span className="grow truncate">{answer.name}</span>
                  {answer.shared ? (
                    <span className="tiny muted nowrap" title="Fixed 50% reduction, applied once">
                      shared ×{answer.sharers}
                    </span>
                  ) : null}
                  <span className="score">{formatScore(answer.contribution)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="tiny muted">
            Other players&apos; answers stay hidden until the round ends. A shared answer loses half
            its value once, no matter how many players match it.
          </p>
        </PromptCard>

        <section className="card card-tight stack-sm">
          <div className="spread">
            <h3>Live harvest</h3>
            <span className="badge badge-warn">Provisional</span>
          </div>
          <ul className="roster">
            {top.map((row) => {
              const member = snapshot.members.find((entry) => entry.id === row.memberId);
              if (!member) return null;
              return (
                <li key={row.memberId} className="member">
                  <span className="member-name grow">{member.nickname}</span>
                  <span className="score">{formatScore(row.total)}</span>
                </li>
              );
            })}
          </ul>
          <p className="tiny muted">Totals can drop when an answer is shared.</p>
        </section>
      </div>

      <Standings snapshot={snapshot} />
    </div>
  );
}
