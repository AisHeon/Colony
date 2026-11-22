import { randomBytes, randomInt, createHash } from "node:crypto";

/** Confusable characters removed (no I, L, O, 0, 1). */
export const ROOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    out += ROOM_ALPHABET[randomInt(0, ROOM_ALPHABET.length)];
  }
  return out;
}

/**
 * Normalizes user-entered codes and invite links.
 * Returns null when the input cannot contain a valid code.
 */
export function normalizeRoomCode(input: string): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;

  // Accept a full invite link or a bare code with spaces/hyphens.
  if (/^https?:\/\//i.test(value) || value.includes("/")) {
    const match = value.match(/\/join\/([A-Za-z0-9\s-]+)/i);
    if (!match) return null;
    value = match[1];
  }

  value = value.replace(/[\s-]/g, "").toUpperCase();
  if (!value) return null;
  if (!/^[A-Z0-9]{4,8}$/.test(value)) return null;
  for (const char of value) {
    if (!ROOM_ALPHABET.includes(char)) return null;
  }
  if (value.length !== ROOM_CODE_LENGTH) return null;
  return value;
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_ALPHABET.includes(c));
}
