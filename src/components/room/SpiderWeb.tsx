"use client";

import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game/types";
import { Feedback, Timer } from "@/components/ui";
import type { IntentAck, IntentBody } from "@/components/useRoom";
import { PromptCard, Standings } from "./parts";

type Suggestion = { id: string; name: string; type: string; description?: string };

export function SpiderWebRound({
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
  const spider = round.spider;
  const [nodes, setNodes] = useState<string[]>(() => spider?.myDraft?.nodes.map((node) => node.id) ?? []);
  const [names, setNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const node of spider?.myDraft?.nodes ?? []) initial[node.id] = node.name;
    if (spider) {
      initial[spider.start.id] = spider.start.name;
      initial[spider.target.id] = spider.target.name;
    }
    return initial;
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<string[][]>([]);
  const [searching, setSearching] = useState(false);
  const lastRound = useRef(round.id);

  useEffect(() => {
    if (lastRound.current === round.id) return;
    lastRound.current = round.id;
    setNodes(round.spider?.myDraft?.nodes.map((node) => node.id) ?? []);
    const fresh: Record<string, string> = {};
    for (const node of round.spider?.myDraft?.nodes ?? []) fresh[node.id] = node.name;
    if (round.spider) {
      fresh[round.spider.start.id] = round.spider.start.name;
      fresh[round.spider.target.id] = round.spider.target.name;
    }
    setNames(fresh);
    setHistory([]);
    setQuery("");
  }, [round.id, round.spider]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/rooms/${snapshot.room.code}/entities?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        setResults(body?.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, snapshot.room.code]);

  if (!spider) return null;

  const totalMs = (snapshot.room.settings.spiderSeconds ?? 90) * 1000;
  const strandCount = Math.max(0, nodes.length - 1);
  const draftEdges = spider.myDraft?.edges ?? [];
  const labelsAligned = spider.myDraft && spider.myDraft.nodes.length === nodes.length;

  async function persist(next: string[], previous: string[]) {
    setHistory((stack) => [...stack, previous].slice(-12));
    setNodes(next);
    const ack = await send({ type: "spider:draft", nodes: next });
    if (ack && (ack.code === "UNKNOWN_OR_UNVERIFIED" || ack.code === "TOO_BROAD")) {
      setNodes(previous);
      setHistory((stack) => stack.slice(0, -1));
    }
  }

  async function addNode(suggestion: Suggestion) {
    if (nodes.includes(suggestion.id)) {
      setQuery("");
      return;
    }
    const previous = nodes;
    const next = [...nodes, suggestion.id];
    setNames((map) => ({ ...map, [suggestion.id]: suggestion.name }));
    setQuery("");
    setResults([]);
    await persist(next, previous);
  }

  async function removeFrom(index: number) {
    const previous = nodes;
    const next = nodes.slice(0, index);
    await persist(next, previous);
  }

  async function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((stack) => stack.slice(0, -1));
    setNodes(previous);
    await send({ type: "spider:draft", nodes: previous });
  }

  async function clearDraft() {
    if (nodes.length && !window.confirm("Clear this draft? Your saved best path stays.")) return;
    await persist([], nodes);
  }

  return (
    <div className="game-grid">
      <div className="stack">
        <PromptCard
          eyebrow="Spider Web · fewer strands win"
          text={`${spider.start.name} → ${spider.target.name}`}
          scope={round.prompt.scope}
          timer={<Timer endsAt={round.endsAt} offset={offset} totalMs={totalMs} label="Spider Web time remaining" />}
        >
          <div className="row" style={{ alignItems: "stretch", gap: 12 }}>
            <div className="card-flat grow" style={{ borderColor: "var(--accent)" }}>
              <p className="tiny muted">Start</p>
              <strong>{spider.start.name}</strong>
              <p className="tiny muted">{spider.start.type.replace(/_/g, " ")}</p>
            </div>
            <div className="card-flat grow" style={{ borderColor: "var(--accent-spider)" }}>
              <p className="tiny muted">Target</p>
              <strong>{spider.target.name}</strong>
              <p className="tiny muted">{spider.target.type.replace(/_/g, " ")}</p>
            </div>
          </div>

          <div className="chain" aria-label="Your draft route">
            <div className="chain-node start">
              <span className="badge badge-accent">Start</span>
              <strong className="grow truncate">{spider.start.name}</strong>
              {nodes.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeFrom(1)}
                  aria-label="Remove everything after the start"
                >
                  Trim
                </button>
              ) : null}
            </div>
            {nodes.slice(1).map((id, index) => {
              const position = index + 1;
              const label = labelsAligned ? draftEdges[index]?.label : null;
              return (
                <div key={`${id}-${position}`}>
                  <div className="chain-edge">
                    {label ?? (position === nodes.length - 1 ? "strand" : "relationship")}
                  </div>
                  <div className={`chain-node${id === spider.target.id ? " target" : ""}`}>
                    <span className="grow truncate">{names[id] ?? id}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeFrom(position)}
                      aria-label={`Remove ${names[id] ?? "node"} and everything after it`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="autocomplete">
            <label className="field">
              <span className="label">Add the next entity</span>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search an entity, e.g. Springfield Nuclear Power Plant"
                autoComplete="off"
                spellCheck={false}
                disabled={pending}
              />
            </label>
            {query.trim().length >= 2 ? (
              <ul className="suggestions" role="listbox" aria-label="Entity suggestions">
                {searching && results.length === 0 ? <li className="suggestion muted">Searching…</li> : null}
                {!searching && results.length === 0 ? (
                  <li className="suggestion muted">No entity in this round&apos;s graph matches.</li>
                ) : null}
                {results.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="suggestion"
                      onClick={() => addNode(suggestion)}
                      disabled={nodes.includes(suggestion.id)}
                    >
                      <strong>{suggestion.name}</strong>
                      {suggestion.description ? (
                        <span className="tiny muted"> — {suggestion.description}</span>
                      ) : (
                        <span className="tiny muted"> — {suggestion.type.replace(/_/g, " ")}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="row-tight">
            <button type="button" className="btn btn-sm" onClick={undo} disabled={!history.length}>
              Undo
            </button>
            <button type="button" className="btn btn-sm" onClick={clearDraft} disabled={!nodes.length}>
              Clear draft
            </button>
            <span className="grow" />
            <span className="badge">{strandCount} strands in draft</span>
            <span className={`badge ${spider.myBest ? "badge-accent" : ""}`}>
              {spider.myBest ? `Best saved: ${spider.myBest.strands}` : "No saved path yet"}
            </span>
          </div>

          <Feedback feedback={snapshot.feedback} />

          {spider.myBest ? (
            <div className="card-flat stack-sm">
              <div className="spread">
                <strong>Saved best — {spider.myBest.strands} strands</strong>
                <span className="badge">{Math.floor(1000 / spider.myBest.strands)} path score</span>
              </div>
              <ol className="rule-list">
                {spider.myBest.nodes.map((node, index) => (
                  <li key={`${node.id}-${index}`}>
                    {node.name}
                    {spider.myBest?.edges[index] ? (
                      <span className="tiny muted"> — {spider.myBest.edges[index].label}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="tiny muted">
                Sources: {spider.myBest.edges.map((edge) => edge.source).filter(Boolean).join("; ")}
              </p>
            </div>
          ) : null}

          <p className="tiny muted">
            Every strand must be a verified direct relationship in this round&apos;s dataset. If a
            connection is missing, that means the dataset lacks it — not that no link exists in the
            world.
          </p>
        </PromptCard>
      </div>

      <Standings snapshot={snapshot} />
    </div>
  );
}
