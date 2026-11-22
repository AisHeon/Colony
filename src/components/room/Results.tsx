"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MODES } from "@/lib/config";
import type { Snapshot, SpiderPathView } from "@/lib/game/types";
import { formatScore, ordinal } from "@/lib/scoring";
import { Avatar, Score, Timer, useServerClock } from "@/components/ui";
import type { IntentAck, IntentBody } from "@/components/useRoom";

type Send = (intent: IntentBody) => Promise<IntentAck | null>;

type Reveal = {
  ranking?: Array<{ rank: number; canonical: string; score: number; players: string[] }>;
  answers?: Array<{ memberId: string; nickname: string; canonical: string; rank: number }>;
  sourceLabel?: string;
  sourceNote?: string;
  eliminations?: Array<{ memberId: string; place: number; nickname?: string }>;
  survivor?: string | null;
  used?: Array<{ entityId: string; name: string; memberId: string }>;
  paths?: Array<{
    memberId: string;
    nickname: string;
    strands: number;
    score: number;
    nodes: string[];
    edges: Array<{ label: string; source: string }>;
  }>;
  shortest?: number | null;
};

function MemberName({ snapshot, id }: { snapshot: Snapshot; id: string }) {
  const member = snapshot.members.find((entry) => entry.id === id);
  return <>{member?.nickname ?? "Player"}</>;
}

export function VoteBox({
  snapshot,
  send,
  offset,
  pending,
}: {
  snapshot: Snapshot;
  send: Send;
  offset: number;
  pending: boolean;
}) {
  const vote = snapshot.match?.vote;
  if (!vote) return null;
  const now = useServerClock(offset);

  if (vote.open) {
    return (
      <section className="card stack" aria-labelledby="vote-heading">
        <div className="spread">
          <div>
            <h2 id="vote-heading">Favorite mode</h2>
            <p className="small muted">
              Ten seconds. Votes stay hidden until the ballot closes, and they never change the
              match result.
            </p>
          </div>
          <Timer endsAt={vote.endsAt} offset={offset} totalMs={10_000} label="Voting time remaining" />
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {vote.options.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`btn ${vote.myVote === mode ? "btn-primary" : ""}`}
              aria-pressed={vote.myVote === mode}
              disabled={pending || now >= vote.endsAt}
              onClick={() => send({ type: "party:voteFavorite", mode })}
            >
              {MODES[mode].name}
              {vote.myVote === mode ? " ✓" : ""}
            </button>
          ))}
        </div>
        <p className="hint" role="status">
          {vote.myVote
            ? `Your vote: ${MODES[vote.myVote as keyof typeof MODES]?.name ?? vote.myVote}. You can change it until the timer ends.`
            : "Pick the mode you enjoyed most."}
        </p>
      </section>
    );
  }

  if (vote.result) {
    const { winners, counts, totalVotes } = vote.result;
    return (
      <section className="card stack" aria-labelledby="vote-heading">
        <h2 id="vote-heading">Crowd favorite</h2>
        {winners.length === 0 ? (
          <p className="muted">No favorite selected.</p>
        ) : (
          <p className="strong" style={{ fontSize: 20 }}>
            {winners.map((mode) => MODES[mode].name).join(" & ")}
          </p>
        )}
        <div className="row" style={{ flexWrap: "wrap" }}>
          {vote.options.map((mode) => (
            <span key={mode} className="badge badge-outline">
              {MODES[mode].name}: {counts[mode] ?? 0}
            </span>
          ))}
          <span className="badge">{totalVotes} vote{totalVotes === 1 ? "" : "s"}</span>
        </div>
        <p className="hint">The vote is for fun — match points and winners are unchanged.</p>
      </section>
    );
  }

  return null;
}

export function RoundResults({
  snapshot,
  send,
  pending,
  offset,
}: {
  snapshot: Snapshot;
  send: Send;
  pending: boolean;
  offset: number;
}) {
  const round = snapshot.round!;
  const results = round.results;
  const now = useServerClock(offset);
  if (!results) return null;
  const reveal = results.reveal as Reveal;
  const remaining = results.nextAt ? Math.max(0, Math.ceil((results.nextAt - now) / 1000)) : 0;

  return (
    <div className="game-grid">
      <div className="stack">
        <section className="card stack">
          <div className="spread">
            <div>
              <p className="eyebrow">Round {round.index} results</p>
              <h2>{MODES[round.mode].name}</h2>
            </div>
            <span className="badge">
              Next {remaining > 0 ? `in ${remaining}s` : "starting…"}
            </span>
          </div>

          <div className="podium">
            {results.podium.map((row) => (
              <div key={row.memberId} className={`podium-row${row.placement === 1 ? " first" : ""}`}>
                <span className="place">{row.placement ? ordinal(row.placement) : "—"}</span>
                <span className="row-tight">
                  <MemberName snapshot={snapshot} id={row.memberId} />
                  <span className="tiny muted">· {row.detail}</span>
                </span>
                <span className="points">
                  {row.placement ? `${row.matchPoints} pts` : "no placement"}
                </span>
              </div>
            ))}
          </div>

          {snapshot.you.isHost ? (
            <div className="row">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => send({ type: "match:advance" })}
                disabled={!results.canAdvance || pending}
                title={results.canAdvance ? "Skip the rest of the results" : "Available after 3 seconds"}
              >
                Continue now
              </button>
              <span className="hint">Everyone else moves on automatically.</span>
            </div>
          ) : null}
        </section>

        {round.mode === "anthill" && round.anthill?.revealed ? (
          <section className="card stack">
            <h3>Answers revealed</h3>
            {round.anthill.revealed.map((player) => (
              <div key={player.memberId} className="stack-sm">
                <div className="row-tight">
                  <Avatar
                    name={snapshot.members.find((m) => m.id === player.memberId)?.nickname ?? "?"}
                    index={snapshot.members.find((m) => m.id === player.memberId)?.avatar ?? 0}
                    size="sm"
                  />
                  <strong>
                    <MemberName snapshot={snapshot} id={player.memberId} />
                  </strong>
                </div>
                <ul className="answer-list">
                  {player.answers.map((answer) => (
                    <li key={answer.entityId} className={`answer-row${answer.shared ? " shared" : ""}`}>
                      <span className={`rarity rarity-${answer.rarity}`}>{answer.rarityName}</span>
                      <span className="grow truncate">{answer.name}</span>
                      {answer.shared ? <span className="tiny muted">shared ×{answer.sharers}</span> : null}
                      <span className="score">{formatScore(answer.contribution)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="tiny muted">
              A shared answer is worth half its base value for everyone who matched it, applied once.
            </p>
          </section>
        ) : null}

        {round.mode === "beehive" ? (
          <section className="card stack">
            <h3>Elimination order</h3>
            {reveal.eliminations?.length ? (
              <ul className="rule-list">
                {[...(reveal.eliminations ?? [])].reverse().map((entry) => (
                  <li key={entry.memberId}>
                    {entry.nickname ?? <MemberName snapshot={snapshot} id={entry.memberId} />} — out at{" "}
                    {entry.place} players
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">No eliminations.</p>
            )}
            {reveal.survivor ? (
              <p className="small">
                <strong>Survivor:</strong> <MemberName snapshot={snapshot} id={reveal.survivor} />
              </p>
            ) : null}
            <details className="scope">
              <summary>Answers used ({reveal.used?.length ?? 0})</summary>
              <p style={{ marginTop: 6 }}>
                {(reveal.used ?? []).map((used) => used.name).join(", ") || "None"}
              </p>
            </details>
          </section>
        ) : null}

        {round.mode === "spider" && round.spider?.revealed ? (
          <section className="card stack">
            <div className="spread">
              <h3>Saved routes</h3>
              <span className="badge">
                Shortest in this round&apos;s approved graph: {reveal.shortest ?? "—"}
              </span>
            </div>
            {round.spider.revealed.length === 0 ? (
              <p className="hint">Nobody completed a valid route this round.</p>
            ) : null}
            {round.spider.revealed.map((path: SpiderPathView) => (
              <div key={path.memberId} className="card-flat stack-sm">
                <div className="spread">
                  <strong>
                    <MemberName snapshot={snapshot} id={path.memberId} />
                  </strong>
                  <span className="badge badge-accent">
                    {path.strands} strand{path.strands === 1 ? "" : "s"} · {Math.floor(1000 / path.strands)}
                  </span>
                </div>
                <ol className="rule-list">
                  {path.nodes.map((node, index) => (
                    <li key={`${node.id}-${index}`}>
                      {node.name}
                      {path.edges[index] ? (
                        <span className="tiny muted"> — {path.edges[index].label}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <p className="tiny muted">
                  Sources: {path.edges.map((edge) => edge.source).filter(Boolean).join("; ")}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {round.mode === "hopper" && round.hopper?.reveal ? (
          <section className="card stack">
            <div className="spread">
              <h3>Top answers</h3>
              <span className="badge">{round.hopper.reveal.sourceLabel}</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Answer</th>
                  <th>Score</th>
                  <th>Players</th>
                </tr>
              </thead>
              <tbody>
                {round.hopper.reveal.ranking.map((row) => (
                  <tr key={row.rank}>
                    <td>{row.rank}</td>
                    <td>{row.canonical}</td>
                    <td>{row.score}</td>
                    <td className="small muted">{row.players.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tiny muted">{round.hopper.reveal.sourceNote}</p>
          </section>
        ) : null}

        <VoteBox snapshot={snapshot} send={send} offset={offset} pending={pending} />
      </div>

      <aside className="card card-tight stack-sm">
        <h3>Match points</h3>
        <ul className="roster">
          {[...snapshot.members.filter((member) => !member.spectator)]
            .sort((a, b) => (snapshot.match?.points[b.id] ?? 0) - (snapshot.match?.points[a.id] ?? 0))
            .map((member) => (
              <li key={member.id} className={`member${member.id === snapshot.you.memberId ? " is-you" : ""}`}>
                <Avatar name={member.nickname} index={member.avatar} size="sm" />
                <span className="member-name grow">{member.nickname}</span>
                <Score value={snapshot.match?.points[member.id] ?? 0} />
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}

export function FinalResults({
  snapshot,
  send,
  pending,
  offset,
}: {
  snapshot: Snapshot;
  send: Send;
  pending: boolean;
  offset: number;
}) {
  const router = useRouter();
  const match = snapshot.match!;
  const players = snapshot.members.filter((member) => !member.spectator);
  const points = match.points;
  const max = Math.max(0, ...players.map((member) => points[member.id] ?? 0));
  const winners = max > 0 ? players.filter((member) => (points[member.id] ?? 0) === max) : [];
  const sorted = [...players].sort((a, b) => (points[b.id] ?? 0) - (points[a.id] ?? 0));

  async function leave() {
    await send({ type: "room:leave" });
    router.push("/");
  }

  return (
    <div className="game-grid">
      <div className="stack">
        <section className="card stack">
          <p className="eyebrow">Final match results</p>
          {winners.length === 0 ? (
            <h1>No points scored</h1>
          ) : (
            <h1>
              {winners.length === 1
                ? `${winners[0].nickname} wins`
                : `${winners.map((member) => member.nickname).join(" & ")} tie`}
            </h1>
          )}
          <p className="muted">
            {match.roundCount} round{match.roundCount === 1 ? "" : "s"} ·{" "}
            {MODES[match.mode].name}
            {winners.length > 1 ? " · shared victory" : ""}
          </p>

          <div className="podium">
            {sorted.map((member) => {
              const value = points[member.id] ?? 0;
              const place =
                value === max && max > 0
                  ? 1
                  : sorted.findIndex((entry) => (points[entry.id] ?? 0) === value) + 1;
              return (
                <div key={member.id} className={`podium-row${place === 1 ? " first" : ""}`}>
                  <span className="place">{max > 0 ? ordinal(place) : "—"}</span>
                  <span className="row-tight">
                    <Avatar name={member.nickname} index={member.avatar} size="sm" />
                    <span className="strong">{member.nickname}</span>
                    {member.isHost ? <span className="badge">host</span> : null}
                  </span>
                  <span className="points">{formatScore(value)} pts</span>
                </div>
              );
            })}
          </div>

          <div className="row">
            {snapshot.you.isHost ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => send({ type: "match:again" })}
                disabled={pending}
              >
                Back to lobby for a rematch
              </button>
            ) : (
              <span className="hint">The host can start a rematch from the lobby.</span>
            )}
            <button type="button" className="btn" onClick={leave} disabled={pending}>
              Leave room
            </button>
            <Link className="btn btn-ghost" href="/">
              Home
            </Link>
          </div>
        </section>

        <VoteBox snapshot={snapshot} send={send} offset={offset} pending={pending} />

        <section className="card stack">
          <h2>Round breakdown</h2>
          {match.roundSummaries.map((summary) => {
            const best = [...summary.placements].sort((a, b) => {
              if (a.placement === null) return 1;
              if (b.placement === null) return -1;
              return a.placement - b.placement;
            });
            return (
              <details key={summary.index} className="card-flat">
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Round {summary.index} · {MODES[summary.mode].name}
                </summary>
                <table className="table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Place</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {best.map((row) => (
                      <tr key={row.memberId}>
                        <td>
                          <MemberName snapshot={snapshot} id={row.memberId} />
                        </td>
                        <td>{row.placement ? ordinal(row.placement) : "—"}</td>
                        <td>{row.matchPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            );
          })}
        </section>
      </div>

      <aside className="card card-tight stack-sm">
        <h3>Room</h3>
        <p className="room-code">{snapshot.room.code}</p>
        <p className="hint">
          Rematches keep the room, identities and settings. Points, answers and votes reset.
        </p>
      </aside>
    </div>
  );
}
