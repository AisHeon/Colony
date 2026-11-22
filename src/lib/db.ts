/**
 * Postgres access for both runtimes:
 *  - DATABASE_URL set  -> node-postgres pool (Neon, Supabase, RDS, Vercel Postgres)
 *  - DATABASE_URL unset -> embedded PGlite (WASM Postgres) for local dev and tests
 *
 * PGlite is a real Postgres build, so one schema and one SQL dialect serve both.
 */

export type Row = Record<string, unknown>;
export type QueryFn = <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

export interface Db {
  query: QueryFn;
  one: <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T | null>;
  transaction: <T>(fn: (q: QueryFn) => Promise<T>) => Promise<T>;
  /** Multi-statement SQL (schema/migrations). No parameters. */
  exec: (sql: string) => Promise<void>;
  kind: "postgres" | "pglite";
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

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();

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
    return wrap(pool as unknown as PgPoolLike, "postgres");
  }

  // Local/dev fallback. Data lives in ./.colony-data so restarts keep rooms.
  const { PGlite } = await import("@electric-sql/pglite");
  const path = process.env.COLONY_PGLITE_PATH || ".colony-data";
  const pglite = await PGlite.create({ dataDir: path });

  const query: QueryFn = async <T extends Row = Row>(sql: string, params: unknown[] = []) => {
    const res = await pglite.query<T>(sql, params as never[]);
    return res.rows as T[];
  };

  const db: Db = {
    kind: "pglite",
    exec: async (sql: string) => {
      await pglite.exec(sql);
    },
    query: query as Db["query"],
    one: async <T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const res = await pglite.query<T>(sql, params as never[]);
      return ((res.rows[0] as T | undefined) ?? null) as T | null;
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

  await ensureSchema(db);
  return db;
}

/** Applies db/schema.sql. Idempotent; safe to call on every cold start. */
async function ensureSchema(db: Db) {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const candidates = [
    path.join(process.cwd(), "db", "schema.sql"),
    path.join(process.cwd(), "..", "db", "schema.sql"),
  ];
  for (const candidate of candidates) {
    try {
      const sql = await fs.readFile(candidate, "utf8");
      await db.exec(sql);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("db/schema.sql not found; run scripts/migrate.ts");
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
