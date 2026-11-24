import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashToken, newId, newToken } from "./ids";

export const SESSION_COOKIE = "colony_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type Guest = { id: string; token?: string };

/**
 * Reads (and optionally creates) the guest session for this browser.
 * Sessions are opaque server-issued tokens; the cookie is HttpOnly and the
 * database only stores a SHA-256 hash.
 */
/**
 * Guest sessions never change once created, so a short in-process cache removes
 * a database round trip from every room request.
 */
const guestCache = new Map<string, { id: string; expiresAt: number }>();
const GUEST_CACHE_MS = 60_000;

export async function readGuest(): Promise<Guest | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const cached = guestCache.get(tokenHash);
  if (cached && cached.expiresAt > Date.now()) return { id: cached.id, token };

  const db = await getDb();
  const row = await db.one<{ id: string }>("select id from guest_session where token_hash = $1", [tokenHash]);
  if (!row) return null;
  if (guestCache.size > 5000) guestCache.clear();
  guestCache.set(tokenHash, { id: row.id, expiresAt: Date.now() + GUEST_CACHE_MS });
  return { id: row.id, token };
}

export async function ensureGuest(): Promise<{ guest: Guest; isNew: boolean }> {
  const existing = await readGuest();
  if (existing) return { guest: existing, isNew: false };

  const token = newToken();
  const id = newId("gst");
  const db = await getDb();
  await db.transaction(async (q) => {
    await q("insert into guest_session (id, token_hash, created_at) values ($1, $2, $3)", [
      id,
      hashToken(token),
      Date.now(),
    ]);
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  return { guest: { id, token }, isNew: true };
}

/** Used by integration tests: resolve a raw token without the cookie jar. */
export async function guestFromToken(token: string): Promise<Guest | null> {
  if (!token) return null;
  const db = await getDb();
  const row = await db.one<{ id: string }>(
    "select id from guest_session where token_hash = $1",
    [hashToken(token)],
  );
  return row ? { id: row.id, token } : null;
}

export async function createGuestWithToken(): Promise<{ guest: Guest; token: string }> {
  const token = newToken();
  const id = newId("gst");
  const db = await getDb();
  await db.transaction(async (q) => {
    await q("insert into guest_session (id, token_hash, created_at) values ($1, $2, $3)", [
      id,
      hashToken(token),
      Date.now(),
    ]);
  });
  return { guest: { id, token }, token };
}
