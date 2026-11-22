/**
 * Shared state for the serverless deployment.
 *
 * Rooms and matches are small; content is static. Instead of shipping a whole
 * database file around, we keep content in an in-memory PGlite instance and
 * persist only the mutable tables as one JSON document in Vercel Blob.
 *
 * Every write is a compare-and-swap on the blob's ETag (`ifMatch`). If another
 * instance commits first, the write fails with a precondition error, the state
 * is reloaded and the transaction is replayed. No update is silently lost.
 */

export type Row = Record<string, unknown>;

/** FK-safe order: parents before children. */
export const MUTABLE_TABLES = [
  "guest_session",
  "room",
  "room_member",
  "match",
  "round",
  "intent_receipt",
  "answer_attempt",
  "anthill_answer",
  "beehive_turn",
  "hopper_answer",
  "spider_path",
  "round_placement",
  "favorite_vote",
  "content_report",
  "answer_stats",
] as const;

export type TableSnapshot = { columns: string[]; rows: Row[] };
export type SharedState = {
  version: number;
  savedAt: string;
  tables: Partial<Record<(typeof MUTABLE_TABLES)[number], TableSnapshot>>;
};

export function emptyState(version = 0): SharedState {
  return { version, savedAt: new Date(0).toISOString(), tables: {} };
}

export class StateConflictError extends Error {
  constructor() {
    super("Shared state changed; retry the transaction.");
    this.name = "StateConflictError";
  }
}

type PgliteLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>;
  transaction: <T>(fn: (tx: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }> }) => Promise<T>) => Promise<T>;
};

function jsonish(value: unknown): unknown {
  if (value === undefined) return null;
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
}

/** Reads every mutable table into a JSON-serialisable document. */
export async function snapshotState(pglite: PgliteLike, version: number): Promise<SharedState> {
  const tables: SharedState["tables"] = {};
  for (const table of MUTABLE_TABLES) {
    const res = await pglite.query(`select * from ${table}`);
    const rows = res.rows as Row[];
    const columns = rows.length ? Object.keys(rows[0]) : [];
    tables[table] = { columns, rows };
  }
  return { version, savedAt: new Date().toISOString(), tables };
}

/**
 * Replaces every mutable table with the snapshot. Runs in one transaction so a
 * concurrent reader never sees half-restored data inside this instance.
 */
export async function restoreState(pglite: PgliteLike, state: SharedState): Promise<void> {
  await pglite.transaction(async (tx) => {
    for (const table of [...MUTABLE_TABLES].reverse()) {
      await tx.query(`delete from ${table}`);
    }
    for (const table of MUTABLE_TABLES) {
      const snapshot = state.tables[table];
      if (!snapshot || snapshot.rows.length === 0) continue;
      const columns = snapshot.columns;
      const columnSql = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
      // Batch rows to keep parameter counts and round trips reasonable.
      for (let start = 0; start < snapshot.rows.length; start += 50) {
        const batch = snapshot.rows.slice(start, start + 50);
        const values: unknown[] = [];
        const tuples: string[] = [];
        for (const row of batch) {
          const placeholders = columns.map((column) => {
            values.push(jsonish(row[column]));
            return `$${values.length}`;
          });
          tuples.push(`(${placeholders.join(",")})`);
        }
        await tx.query(`insert into ${table} (${columnSql}) values ${tuples.join(",")}`, values);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export type StoredState = { state: SharedState; etag: string };

export interface StateStore {
  /** Latest metadata only, used to skip downloads when nothing changed. */
  head(): Promise<{ etag: string } | null>;
  read(): Promise<StoredState | null>;
  /** Returns the new ETag. Throws StateConflictError when `etag` is stale. */
  write(state: SharedState, etag: string | null): Promise<string>;
}

const STATE_PATH = "colony/shared-state.json";

export class BlobStateStore implements StateStore {
  async head(): Promise<{ etag: string } | null> {
    const { head } = await import("@vercel/blob");
    try {
      const meta = await head(STATE_PATH);
      return { etag: meta.etag };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async read(): Promise<StoredState | null> {
    const { get } = await import("@vercel/blob");
    // `head` returns the metadata ETag that `ifMatch` expects. The ETag header
    // on the body download is not guaranteed to be the same representation.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const meta = await this.head();
      if (!meta) return null;
      const result = await get(STATE_PATH, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) continue;
      const text = await new Response(result.stream).text();
      if (etagKey(result.blob.etag) !== etagKey(meta.etag)) {
        // A write landed between metadata and body; read both again.
        continue;
      }
      return { state: JSON.parse(text) as SharedState, etag: meta.etag };
    }
    throw new Error("Shared state changed while it was being read; retry the request.");
  }

  async write(state: SharedState, etag: string | null): Promise<string> {
    const { put } = await import("@vercel/blob");
    const body = JSON.stringify(state);
    const common = {
      access: "private" as const,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      addRandomSuffix: false,
    };
    try {
      if (etag) {
        const result = await put(STATE_PATH, body, { ...common, allowOverwrite: true, ifMatch: etag });
        return result.etag;
      }
      const result = await put(STATE_PATH, body, { ...common, allowOverwrite: false });
      return result.etag;
    } catch (error) {
      if (etag) {
        if (isPrecondition(error)) throw new StateConflictError();
        throw error;
      }
      // Create-only lost a race: the blob now exists.
      const current = await this.head();
      if (current) throw new StateConflictError();
      throw error;
    }
  }
}

/** In-memory store with the same CAS semantics; used by tests and local proofs. */
export class MemoryStateStore implements StateStore {
  private stored: StoredState | null = null;

  async head() {
    return this.stored ? { etag: this.stored.etag } : null;
  }

  async read() {
    return this.stored ? { state: structuredClone(this.stored.state), etag: this.stored.etag } : null;
  }

  async write(state: SharedState, etag: string | null) {
    const current = this.stored?.etag ?? null;
    if (current !== etag) throw new StateConflictError();
    const next = `etag-${Number(current?.replace("etag-", "") ?? 0) + 1}`;
    this.stored = { state: structuredClone(state), etag: next };
    return next;
  }
}

/** Compares ETags from the metadata API and the download endpoint. */
function etagKey(value: string): string {
  return value.replace(/^W\//i, "").replace(/^"/, "").replace(/"$/, "");
}

function isNotFound(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? "";
  const message = (error as { message?: string })?.message ?? "";
  return name === "BlobNotFoundError" || /not.?found|404/i.test(message);
}

function isPrecondition(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? "";
  const message = (error as { message?: string })?.message ?? "";
  return (
    name === "BlobPreconditionFailedError" ||
    /precondition|if-match|etag|already exists|blob_already_exists|conflict/i.test(message)
  );
}
