import * as schema from "./schema";

export { schema };

type DbType = any;
type SqliteType = any;

let _db: DbType | null = null;
let _sqlite: SqliteType | null = null;

// WAL-race protection — Next.js 16 page-data collection spawns ~31 parallel
// workers that each import this file. The journal_mode = WAL pragma takes a
// brief exclusive lock and one unlucky worker hits SQLITE_BUSY without retry.
// See known-pitfalls.md → "better-sqlite3 + Next.js 16 page-data collection
// races".
function openWithRetry(Database: any, dbPath: string, maxAttempts = 20): any {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const s = new Database(dbPath, { timeout: 15_000 });
      s.pragma("busy_timeout = 15000");
      s.pragma("journal_mode = WAL");
      s.pragma("foreign_keys = ON");
      return s;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (code !== "SQLITE_BUSY" && code !== "SQLITE_BUSY_RECOVERY") throw err;
      const delayMs = Math.min(50 * Math.pow(1.5, i), 2000);
      const end = Date.now() + delayMs;
      while (Date.now() < end) {
        /* sync busy-wait — yielding via setTimeout lets racing workers jump the queue */
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`open3dreel db open failed after ${maxAttempts} retries`);
}

function init() {
  if (!_db) {
    try {
      const Database = require("better-sqlite3");
      const { drizzle } = require("drizzle-orm/better-sqlite3");
      const dbPath = (process.env.DATABASE_URL || "./data/open3dreel.db").replace(
        /^file:/,
        "",
      );
      _sqlite = openWithRetry(Database, dbPath);
      _db = drizzle(_sqlite, { schema });
    } catch (err) {
      console.error("[open3dreel] Failed to initialize SQLite:", (err as Error).message);
      throw err;
    }
  }
  return { db: _db, sqlite: _sqlite! };
}

const isBuild = !!process.env.DOCKER_BUILD;

// Build-time stub so route modules that touch `db` don't crash during
// `next build` page-data collection (workers can't open the DB before the
// volume is mounted).
export const db: DbType = isBuild
  ? (new Proxy({}, { get: () => () => [] }) as unknown as DbType)
  : new Proxy({} as DbType, { get: (_t, p) => (init().db as any)[p] });

export const sqlite: SqliteType = isBuild
  ? ({} as SqliteType)
  : new Proxy({} as SqliteType, { get: (_t, p) => (init().sqlite as any)[p] });

export type DbClient = typeof db;
