/**
 * Postgres access for both runtimes:
 *  - DATABASE_URL set  -> node-postgres pool (Neon, Supabase, RDS, Vercel Postgres)
 *  - DATABASE_URL unset -> embedded PGlite (WASM Postgres) for local dev and tests
 *
 * PGlite is a real Postgres build, so one schema and one SQL dialect serve both.
 */

import {
  BlobStateStore,
  MemoryStateStore,
  StateConflictError,
  emptyState,
  restoreState,
  snapshotState,
  type StateStore,
} from "./state-store";

export type Row = Record<string, unknown>;
export type QueryFn = <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T[]>;
export interface Db {
  query: QueryFn;
  one: <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T | null>;
  transaction: <T>(fn: (q: QueryFn) => Promise<T>) => Promise<T>;
  /** Multi-statement SQL (schema/migrations). No parameters. */
  exec: (sql: string) => Promise<void>;
  /** Performs a real, small write so health never reports a read-only store as healthy. */
  probe: () => Promise<void>;
  kind: "postgres" | "pglite" | "blob";
}

type PgPoolLike = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Row[] }>;
  connect: () => Promise<{
    query: (text: string, values?: unknown[]) => Promise<{ rows: Row[] }>;
    release: () => void;
  }>;
  end: () => Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __colonyDb: Promise<Db> | undefined;
}

function wrap(pool: PgPoolLike, kind: Db["kind"]): Db {
  const query: QueryFn = async <T extends Row = Row>(sql: string, params: unknown[] = []) => {
    const res = await pool.query(sql, params);
    return res.rows as T[];
  };

  return {
    kind,
    exec: async (sql: string) => {
      await pool.query(sql);
    },
    query: query as Db["query"],
    one: async <T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const res = await pool.query(sql, params);
      return ((res.rows[0] as T | undefined) ?? null) as T | null;
    },
    probe: async () => {
      await pool.query(
        "insert into health_probe (id, checked_at) values ('health', $1) on conflict (id) do update set checked_at = excluded.checked_at",
        [Date.now()],
      );
    },
    transaction: async <T>(fn: (q: QueryFn) => Promise<T>) => {
      const client = await pool.connect();
      const txQuery = (async (sql: string, params: unknown[] = []) => {
        const res = await client.query(sql, params);
        return res.rows as Row[];
      }) as QueryFn;
      try {
        await client.query("begin");
        const out = await fn(txQuery);
        await client.query("commit");
        return out;
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          /* connection already gone */
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

type PgliteLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>;
  transaction: <T>(
    fn: (tx: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }> }) => Promise<T>,
  ) => Promise<T>;
  exec: (sql: string) => Promise<void>;
};

function wrapPglite(pglite: PgliteLike, kind: Db["kind"] = "pglite"): Db {
  const query: QueryFn = async <T extends Row = Row>(sql: string, params: unknown[] = []) => {
    const res = await pglite.query(sql, params as never[]);
    return res.rows as T[];
  };

  return {
    kind,
    exec: async (sql: string) => {
      await pglite.exec(sql);
    },
    query: query as Db["query"],
    one: async <T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const res = await pglite.query(sql, params as never[]);
      return ((res.rows[0] as T | undefined) ?? null) as T | null;
    },
    probe: async () => {
      await pglite.query(
        "insert into health_probe (id, checked_at) values ('health', $1) on conflict (id) do update set checked_at = excluded.checked_at",
        [Date.now()],
      );
    },
    transaction: async <T>(fn: (q: QueryFn) => Promise<T>) => {
      return (await pglite.transaction(async (tx) => {
        const txQuery = (async (sql: string, params: unknown[] = []) => {
          const res = await tx.query(sql, params as never[]);
          return res.rows as Row[];
        }) as QueryFn;
        return fn(txQuery);
      })) as T;
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Shared, durable state for serverless instances: content is in memory, mutable
 * tables live in a versioned JSON document with ETag compare-and-swap.
 */
export async function createSharedDb(store: StateStore): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = (await PGlite.create()) as unknown as PgliteLike;
  const base = wrapPglite(pglite);
  await ensureSchema(base);
  await ensureContent(base);

  let appliedEtag: string | null = null;
  let lastHeadAt = 0;
  let tail: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function sync(maxAgeMs: number) {
    if (Date.now() - lastHeadAt < maxAgeMs) return;
    const meta = await store.head();
    if (!meta) {
      if (appliedEtag !== null) {
        await restoreState(pglite, emptyState());
        appliedEtag = null;
      }
    } else if (meta.etag !== appliedEtag) {
      const stored = await store.read();
      if (stored) {
        await restoreState(pglite, stored.state);
        appliedEtag = stored.etag;
      }
    }
    lastHeadAt = Date.now();
  }

  return {
    kind: "blob",
    probe: async () => {
      if (!store.probe) throw new Error("State store does not support a write probe");
      await store.probe();
    },
    exec: (sql: string) =>
      enqueue(async () => {
        await sync(0);
        await pglite.exec(sql);
      }),
    query: (<T extends Row = Row>(sql: string, params: unknown[] = []) =>
      enqueue(async () => {
        await sync(150);
        const res = await pglite.query(sql, params as never[]);
        return res.rows as T[];
      })) as QueryFn,
    one: <T extends Row = Row>(sql: string, params: unknown[] = []) =>
      enqueue(async () => {
        await sync(150);
        const res = await pglite.query(sql, params as never[]);
        return ((res.rows[0] as T | undefined) ?? null) as T | null;
      }),
    transaction: <T>(fn: (q: QueryFn) => Promise<T>) =>
      enqueue(async () => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 25; attempt += 1) {
          const stored = await store.read();
          await restoreState(pglite, stored?.state ?? emptyState());
          appliedEtag = stored?.etag ?? null;
          lastHeadAt = Date.now();

          const value = (await pglite.transaction(async (tx) => {
            const txQuery = (async (sql: string, params: unknown[] = []) => {
              const res = await tx.query(sql, params as never[]);
              return res.rows as Row[];
            }) as QueryFn;
            return fn(txQuery);
          })) as T;

          const nextVersion = (stored?.state.version ?? 0) + 1;
          const state = await snapshotState(pglite, nextVersion);
          const unchanged =
            JSON.stringify(state.tables) === JSON.stringify(stored?.state.tables ?? {});
          if (unchanged) {
            // Idle polls still run the tick; do not churn the shared blob.
            appliedEtag = stored?.etag ?? null;
            lastHeadAt = Date.now();
            return value;
          }
          try {
            appliedEtag = await store.write(state, stored?.etag ?? null);
            lastHeadAt = Date.now();
            return value;
          } catch (error) {
            lastError = error;
            if (!(error instanceof StateConflictError)) throw error;
            console.warn("[colony] shared state conflict", { attempt: attempt + 1 });
            await sleep(20 + Math.floor(Math.random() * 80));
          }
        }
        throw new Error(
          `Shared state is busy; retry the request.${lastError instanceof Error ? ` (${lastError.message})` : ""}`,
        );
      }),
  };
}

async function createDb(): Promise<Db> {
  const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL)?.trim();

  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    pool.on("error", (err) => {
      console.error("[colony] unexpected postgres pool error", err.message);
    });
    const db = wrap(pool as unknown as PgPoolLike, "postgres");
    // Hosted Postgres starts empty on a new Neon/Vercel database. These
    // helpers are idempotent, so the first cold start can initialize the
    // schema and audited content without a separate migration request.
    await ensureSchema(db);
    await ensureContent(db);
    return db;
  }

  // Serverless shared state: content stays in memory, rooms are persisted in a
  // Blob document with ETag compare-and-swap. Production without DATABASE_URL.
  const explicit = process.env.COLONY_STATE_STORE;
  if (explicit === "memory") return createSharedDb(new MemoryStateStore());
  if (explicit === "blob" || (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN)) {
    return createSharedDb(new BlobStateStore());
  }

  // Embedded local fallback. Data lives in ./.colony-data so restarts keep rooms.
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.COLONY_PGLITE_PATH || ".colony-data";
  const pglite = await PGlite.create({ dataDir });

  const db = wrapPglite(pglite as unknown as PgliteLike);
  await ensureSchema(db);
  await ensureContent(db);
  return db;
}

/** Reads a SQL file from the project's db/ directory (bundled on serverless). */
async function readDbSql(name: string): Promise<string | null> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const candidates = [
    path.join(process.cwd(), "db", name),
    path.join(process.cwd(), "..", "db", name),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

/** Applies db/schema.sql. Idempotent; safe to call on every cold start. */
async function ensureSchema(db: Db) {
  const sql = await readDbSql("schema.sql");
  if (!sql) throw new Error("db/schema.sql not found; run scripts/migrate.ts");
  await db.exec(sql);
}

/**
 * Seeds the audited content once per database. The seed is idempotent, so the
 * first cold start on a new hosted Postgres database is ready to serve rooms.
 */
async function ensureContent(db: Db) {
  const seeded = await db.one<{ key: string }>("select key from content_meta where key = 'version'");
  if (seeded) return;
  const sql = await readDbSql("seed.sql");
  if (!sql) throw new Error("db/seed.sql not found; run npx tsx scripts/dump-seed.mts");
  await db.exec(sql);
}

export function getDb(): Promise<Db> {
  if (!globalThis.__colonyDb) {
    globalThis.__colonyDb = createDb().catch((error) => {
      globalThis.__colonyDb = undefined;
      throw error;
    });
  }
  return globalThis.__colonyDb;
}

/** JSON helper: Postgres jsonb accepts a stringified value. */
export function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value instanceof Date) return value.getTime();
  return 0;
}
