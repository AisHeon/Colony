"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RARITIES, type Rarity } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import { formatScore } from "@/lib/scoring";
import { Timer } from "@/components/ui";
import { CasteBadge, SoilGauge } from "@/components/ColonyWorld";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { PromptCard, Standings } from "./parts";
import { RareAnswerEffect, type RareMoment } from "./RareEffect";

type LocalAnswer = {
  key: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  name?: string;
  entityId?: string;
  rarity?: string;
  rarityName?: string;
  points?: number;
  base?: number;
  shared?: boolean;
  message?: string;
};

function makeKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  // The field is deliberately uncontrolled: the room is server-rendered, and text
  // typed before React hydrates must survive hydration instead of being reset or
  // silently ignored when the player sends it.
  const [hasText, setHasText] = useState(false);
  const [local, setLocal] = useState<LocalAnswer[]>([]);
  const [moment, setMoment] = useState<RareMoment | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sendRef = useRef(send);
  sendRef.current = send;
  const roundIdRef = useRef(round.id);
  roundIdRef.current = round.id;

  const mine = round.prompt.myAnswers ?? [];
  const myTotal = round.anthill?.leaderboard.find((row) => row.memberId === snapshot.you.memberId)?.total ?? 0;
  const top = [...(round.anthill?.leaderboard ?? [])].slice(0, 6);
  const pendingCount = local.filter((answer) => answer.status === "pending").length;

  const accepted = [...mine].reverse();
  const localOnly = local.filter(
    (answer) => answer.status !== "accepted" || !mine.some((entry) => entry.entityId === answer.entityId),
  );

  const submitText = useCallback((raw: string) => {
    const text = raw.trim();
    const field = inputRef.current;
    if (!text) {
      field?.focus();
      return;
    }
    const key = makeKey();

    // Optimistic card: it is on screen before the request leaves the browser.
    const optimistic: LocalAnswer = { key, text, status: "pending" };
    setLocal((previous) => [optimistic, ...previous].slice(0, 14));
    if (field) field.value = "";
    setHasText(false);
    field?.focus();

    void sendRef.current({ type: "answer:submit", text, roundId: roundIdRef.current }).then((ack) => {
      if (!ack) {
        setLocal((previous) =>
          previous.map((answer) =>
            answer.key === key
              ? {
                  ...answer,
                  status: "rejected",
                  message: "We couldn't verify that answer. Check your connection and try again.",
                }
              : answer,
          ),
        );
        return;
      }

      if (ack.ok && ack.details?.name) {
        const rarity = (ack.details.rarity && ack.details.rarity in RARITIES
          ? ack.details.rarity
          : "forager") as Rarity;
        setLocal((previous) =>
          previous.map((answer) =>
            answer.key === key
              ? {
                  ...answer,
                  status: "accepted",
                  text: ack.details?.name ?? answer.text,
                  name: ack.details?.name,
                  entityId: ack.details?.entityId,
                  rarity,
                  rarityName: ack.details?.rarityName ?? RARITIES[rarity].name,
                  points: ack.details?.contribution ?? RARITIES[rarity].value,
                  base: ack.details?.base ?? RARITIES[rarity].value,
                  shared: ack.details?.shared,
                  message: ack.message,
                }
              : answer,
          ),
        );
        if (rarity !== "forager") {
          setMoment({
            id: Date.now(),
            rarity,
            name: ack.details.name,
            points: ack.details.contribution ?? RARITIES[rarity].value,
            shared: Boolean(ack.details.shared),
          });
        }
      } else {
        setLocal((previous) =>
          previous.map((answer) =>
            answer.key === key
              ? { ...answer, status: "rejected", message: ack.message }
              : answer,
          ),
        );
      }
    });
  }, []);

  useEffect(() => {
    // The pre-hydration boot script buffers an answer sent before React was
    // listening. Pick it up, and hand keystrokes back to React from now on.
    const globals = window as unknown as {
      __colonyHydrated?: boolean;
      __colonyEarlyAnswer?: string | null;
    };
    globals.__colonyHydrated = true;
    const early = globals.__colonyEarlyAnswer ?? null;
    globals.__colonyEarlyAnswer = null;
    if (early) {
      submitText(early);
      return;
    }
    const field = inputRef.current;
    if (field && field.value.trim()) setHasText(true);
  }, [submitText]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitText(event.currentTarget.value);
  }

  return (
    <div className="game-grid anthill-grid">
      <div className="stack">
        <PromptCard
          eyebrow="Anthill · 30 seconds"
          text={round.prompt.text ?? ""}
          scope={round.prompt.scope}
          timer={<Timer endsAt={round.endsAt} offset={offset} totalMs={30_000} label="Anthill time remaining" />}
        >
          {/* Not a <form>: before hydration an implicit submit would navigate
              away and throw the typed answer away. */}
          <div className={`answer-form${hasText ? " is-ready" : ""}`}>
            <label className="sr-only" htmlFor="anthill-answer">
              Your answer
            </label>
            <input
              id="anthill-answer"
              ref={inputRef}
              className="input answer-input"
              onChange={(event) => setHasText(event.currentTarget.value.trim().length > 0)}
              onKeyDown={onKeyDown}
              placeholder="Type it. Send it. Find out instantly."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={120}
              autoFocus
            />
            <button
              className="btn btn-primary answer-send"
              type="button"
              data-answer-send=""
              onClick={() => submitText(inputRef.current?.value ?? "")}
            >
              Send
            </button>
          </div>

          <div className="answer-status-line">
            <span>
              {mine.length} accepted · {formatScore(myTotal)} depth
            </span>
            <span aria-live="polite">
              {pendingCount
                ? `${pendingCount} checking…`
                : hasText
                  ? "Ready — press Enter to send"
                  : "Verdict appears the moment the judge answers"}
            </span>
          </div>

          <ul className="answer-cards" aria-label="Your answers and verdicts">
            {localOnly.map((answer) => (
              <li
                key={answer.key}
                className={`answer-card is-${answer.status}${answer.rarity ? ` rarity-${answer.rarity}` : ""}`}
              >
                {answer.status === "pending" ? (
                  <>
                    <span className="answer-pulse" aria-hidden="true" />
                    <span className="answer-card-main">
                      <strong>{answer.text}</strong>
                      <span className="answer-card-note">Checking the colony ledger…</span>
                    </span>
                    <span className="answer-card-points">···</span>
                  </>
                ) : answer.status === "rejected" ? (
                  <>
                    <span className="answer-card-mark" aria-hidden="true">
                      ×
                    </span>
                    <span className="answer-card-main">
                      <strong>{answer.text}</strong>
                      <span className="answer-speech">{answer.message}</span>
                    </span>
                    <span className="answer-card-points">0</span>
                  </>
                ) : (
                  <>
                    <CasteBadge rarity={answer.rarity ?? "forager"} size={24} />
                    <span className="answer-card-main">
                      <strong>{answer.name ?? answer.text}</strong>
                      <span className="answer-card-note">
                        {answer.rarityName}
                        {answer.shared ? " · jinxed, split once" : ""}
                      </span>
                    </span>
                    <span className="answer-card-points">+{formatScore(answer.points ?? 0)}</span>
                  </>
                )}
              </li>
            ))}
            {accepted.map((answer) => (
              <li key={answer.entityId} className={`answer-card is-accepted rarity-${answer.rarity}`}>
                <CasteBadge rarity={answer.rarity} size={24} />
                <span className="answer-card-main">
                  <strong>{answer.name}</strong>
                  <span className="answer-card-note">
                    {answer.rarityName}
                    {answer.shared ? ` · shared ×${answer.sharers}` : ""}
                  </span>
                </span>
                <span className="answer-card-points">+{formatScore(answer.contribution)}</span>
              </li>
            ))}
          </ul>

          {mine.length === 0 && localOnly.length === 0 ? (
            <p className="hint">
              Rarer answers sink you deeper. Forager 100 · Soldier 200 · Royal Guard 300 · Queen
              500 · Apex 1,000.
            </p>
          ) : null}
        </PromptCard>

        <section className="harvest-strip">
          <div className="spread">
            <h2>Live harvest</h2>
            <span className="badge badge-warn">Provisional</span>
          </div>
          <ul className="harvest-list">
            {top.map((row, index) => {
              const member = snapshot.members.find((entry) => entry.id === row.memberId);
              if (!member) return null;
              return (
                <li key={row.memberId} className="harvest-row">
                  <span className="harvest-rank">{index + 1}</span>
                  <span className="grow truncate">{member.nickname}</span>
                  <span className="score">{formatScore(row.total)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="stack game-rail">
        <SoilGauge score={myTotal} />
        <Standings snapshot={snapshot} />
      </aside>

      {moment ? <RareAnswerEffect moment={moment} onDone={() => setMoment(null)} /> : null}
    </div>
  );
}
