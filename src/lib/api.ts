import "server-only";
import { NextResponse } from "next/server";
import { GameError } from "./game/engine";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function fail(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, detail: error.detail ?? null } },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  if (error instanceof Error && error.name === "ZodError") {
    return NextResponse.json(
      { error: { code: "INVALID_PAYLOAD", message: "That request was malformed." } },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  console.error("[colony] unhandled api error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong on our side. Try again." } },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      throw new GameError("BAD_ORIGIN", "Requests must come from this site.", 403);
    }
  } catch (error) {
    if (error instanceof GameError) throw error;
    throw new GameError("BAD_ORIGIN", "Requests must come from this site.", 403);
  }
}

const buckets = new Map<string, { tokens: number; updated: number }>();

/** Small in-process limiter for non-critical endpoints (reports, autocomplete). */
export function takeToken(key: string, capacity = 12, refillPerSecond = 2): boolean {
  const now = Date.now();
  const entry = buckets.get(key) ?? { tokens: capacity, updated: now };
  const elapsed = (now - entry.updated) / 1000;
  entry.tokens = Math.min(capacity, entry.tokens + elapsed * refillPerSecond);
  entry.updated = now;
  if (entry.tokens < 1) {
    buckets.set(key, entry);
    return false;
  }
  entry.tokens -= 1;
  buckets.set(key, entry);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
