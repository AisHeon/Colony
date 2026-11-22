"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game/types";

export type IntentBody =
  | { type: "room:ready"; ready: boolean }
  | { type: "room:updateSettings"; settings: Record<string, unknown> }
  | { type: "room:leave" }
  | { type: "room:kick"; memberId: string }
  | { type: "match:start" }
  | { type: "match:again" }
  | { type: "match:advance" }
  | { type: "answer:submit"; text: string; turnId?: string; roundId?: string }
  | { type: "spider:draft"; nodes: string[] }
  | { type: "party:voteFavorite"; mode: string };

export type IntentAck = { ok: boolean; code: string; message: string; tone: "ok" | "warn" | "error" };

function pollDelay(snapshot: Snapshot | null): number {
  if (!snapshot) return 1500;
  if (!snapshot.match) return 2200;
  if (snapshot.match.status === "voting") return 700;
  if (!snapshot.round) return 1500;
  if (snapshot.round.phase === "countdown") return 350;
  if (snapshot.round.phase === "results") return 900;
  if (snapshot.round.mode === "beehive") return 550;
  return 800;
}

export function useRoom(code: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: string } | null>(null);
  const offsetRef = useRef(0);
  const aliveRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const [offset, setOffset] = useState(0);

  const apply = useCallback((next: Snapshot) => {
    snapshotRef.current = next;
    const drift = next.serverTime - Date.now();
    if (Math.abs(drift - offsetRef.current) > 400) {
      offsetRef.current = drift;
      setOffset(drift);
    }
    setSnapshot(next);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/state`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? { code: "OFFLINE", message: "Couldn't reach the room." });
        setConnected(false);
        return;
      }
      const body = await res.json();
      if (body?.snapshot && aliveRef.current) {
        apply(body.snapshot as Snapshot);
        setConnected(true);
      }
    } catch {
      if (aliveRef.current) setConnected(false);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [apply, code]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    refresh();
    return () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      const hidden = document.visibilityState === "hidden";
      const delay = pollDelay(snapshotRef.current) * (hidden ? 3 : 1);
      timerRef.current = window.setTimeout(loop, delay);
    };
    timerRef.current = window.setTimeout(loop, pollDelay(snapshotRef.current));
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refresh]);

  const send = useCallback(
    async (intent: IntentBody): Promise<IntentAck | null> => {
      if (pending) return null;
      setPending(true);
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const res = await fetch(`/api/rooms/${code}/intent`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ requestId, intent }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const message = body?.error?.message ?? "That didn't go through. Try again.";
          setToast({ message, tone: "error" });
          return { ok: false, code: body?.error?.code ?? "ERROR", message, tone: "error" };
        }
        if (body?.snapshot) apply(body.snapshot as Snapshot);
        const ack = body?.result as IntentAck | undefined;
        if (ack?.message) setToast({ message: ack.message, tone: ack.tone });
        return ack ?? null;
      } catch {
        setConnected(false);
        setToast({ message: "Couldn't reach the server. Reconnecting…", tone: "error" });
        return null;
      } finally {
        setPending(false);
      }
    },
    [apply, code, pending],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return {
    snapshot,
    error,
    loading,
    connected,
    pending,
    toast,
    offset,
    send,
    refresh,
    setToast,
  };
}
