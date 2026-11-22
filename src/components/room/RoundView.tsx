"use client";

import { MODES } from "@/lib/config";
import type { Snapshot } from "@/lib/game/types";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { Anthill } from "./Anthill";
import { Beehive } from "./Beehive";
import { Hopper } from "./Hopper";
import { SpiderWebRound } from "./SpiderWeb";
import { RoundResults } from "./Results";

export function RoundView({
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

  if (round.phase === "countdown") {
    return <PreRound snapshot={snapshot} offset={offset} />;
  }

  if (round.phase === "results") {
    return <RoundResults snapshot={snapshot} send={send} pending={pending} offset={offset} />;
  }

  switch (round.mode) {
    case "anthill":
      return <Anthill snapshot={snapshot} send={send} pending={pending} offset={offset} />;
    case "beehive":
      return <Beehive snapshot={snapshot} send={send} pending={pending} offset={offset} />;
    case "spider":
      return <SpiderWebRound snapshot={snapshot} send={send} pending={pending} offset={offset} />;
    case "hopper":
      return <Hopper snapshot={snapshot} send={send} pending={pending} offset={offset} />;
    default:
      return null;
  }
}

function PreRound({ snapshot, offset }: { snapshot: Snapshot; offset: number }) {
  const round = snapshot.round!;
  const mode = MODES[round.mode];
  const remaining = Math.max(0, Math.ceil((round.countdownEndsAt - (Date.now() + offset)) / 1000));

  return (
    <div className="card stack center" style={{ maxWidth: 640, margin: "0 auto" }}>
      <p className="eyebrow">
        Round {round.index} of {round.total} · {mode.name}
      </p>
      <h1>{mode.name}</h1>
      <ul className="rule-list" style={{ textAlign: "left", margin: "0 auto", maxWidth: 440 }}>
        {mode.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <div className="countdown" aria-live="polite" aria-atomic="true">
        {remaining}
      </div>
      <p className="hint">Get ready. The timer starts after the countdown.</p>
    </div>
  );
}
