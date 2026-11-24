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

export type IntentAck = {
  ok: boolean;
  code: string;
  message: string;
  tone: "ok" | "warn" | "error";
  details?: {
    entityId?: string;
    name?: string;
    rarity?: string;
    rarityName?: string;
    base?: number;
    contribution?: number;
    shared?: boolean;
    sharers?: number;
  };
};

export function useRoom(code: string, initial: Snapshot | null = null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(!initial);
  const [connected, setConnected] = useState(true);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: string } | null>(null);
  const offsetRef = useRef(0);
  const aliveRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const snapshotRef = useRef<Snapshot | null>(initial);
  const seededRef = useRef<Snapshot | null>(initial);
  const inFlightRef = useRef(0);
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
    const seeded = seededRef.current;
    // A snapshot rendered by the server is fresh enough to paint from; the
    // stream takes over on its next tick instead of a duplicate first fetch.
    if (seeded && Date.now() - seeded.serverTime < 2000) {
      setLoading(false);
    } else {
      setLoading(true);
      void refresh();
    }
    return () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    let stopped = false;
    let source: EventSource | null = null;
    let retry: number | null = null;
    let fallback: number | null = null;

    const startFallback = () => {
      if (fallback || stopped) return;
      fallback = window.setInterval(() => void refresh(), 2000);
    };

    const connect = () => {
      if (stopped) return;
      if (typeof EventSource === "undefined") {
        startFallback();
        return;
      }
      try {
        source = new EventSource(`/api/rooms/${code}/stream`);
      } catch {
        setConnected(false);
        startFallback();
        return;
      }
      source.addEventListener("open", () => {
        if (stopped) return;
        setConnected(true);
      });
      source.addEventListener("snapshot", (event) => {
        if (stopped) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { snapshot?: Snapshot };
          if (payload.snapshot) {
            apply(payload.snapshot);
            setConnected(true);
            setLoading(false);
          }
        } catch {
          /* ignore a malformed frame; the next one will repair the view */
        }
      });
      source.addEventListener("gone", (event) => {
        if (stopped) return;
        source?.close();
        source = null;
        setConnected(false);
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { message?: string };
          setError({ code: "ROOM_NOT_FOUND", message: payload.message ?? "That room has closed." });
        } catch {
          setError({ code: "ROOM_NOT_FOUND", message: "That room has closed." });
        }
      });
      source.addEventListener("error", () => {
        if (stopped) return;
        setConnected(false);
        // EventSource reconnects by itself. If it has given up, rebuild it.
        if (source?.readyState === EventSource.CLOSED) {
          source = null;
          retry = window.setTimeout(connect, 1800);
        }
      });
    };

    connect();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      source?.close();
      if (retry) window.clearTimeout(retry);
      if (fallback) window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [apply, code, refresh]);

  const send = useCallback(
    async (intent: IntentBody): Promise<IntentAck | null> => {
      // Answers can be submitted while another answer is in flight. The server
      // serialises writes; the client must never make the player wait.
      inFlightRef.current += 1;
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
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        setPending(inFlightRef.current > 0);
      }
    },
    [apply, code],
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
