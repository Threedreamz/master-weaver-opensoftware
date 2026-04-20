import * as schema from "./schema";

export { schema };

// Use `any` for types to avoid importing better-sqlite3 at the top level.
// The native module is loaded lazily in init() to prevent crashes when the
// .node binary isn't available (e.g. wrong architecture or missing from runtime).
type DbType = any;
type SqliteType = any;

let _db: DbType | null = null;
let _sqlite: SqliteType | null = null;

function init() {
  if (!_db) {
    try {
      // Lazy-require better-sqlite3 to avoid top-level native module crash
      const Database = require("better-sqlite3");
      const { drizzle } = require("drizzle-orm/better-sqlite3");
      const dbPath = (process.env.DATABASE_URL || process.env.DB_PATH || "./data/opensem.db").replace(/^file:/, "");
      _sqlite = new Database(dbPath);
      _sqlite.pragma("journal_mode = WAL");
      _sqlite.pragma("foreign_keys = ON");
      _db = drizzle(_sqlite, { schema });
    } catch (err) {
      console.error("[opensem] Failed to initialize SQLite:", (err as Error).message);
      throw err;
    }
  }
  return { db: _db, sqlite: _sqlite! };
}

// During Docker build, export a stub that won't crash DrizzleAdapter
const isBuild = !!process.env.DOCKER_BUILD;

export const db: DbType = isBuild
  ? (new Proxy({}, { get: () => () => [] }) as unknown as DbType)
  : new Proxy({} as DbType, { get: (_t, p) => (init().db as any)[p] });

export const sqlite: SqliteType = isBuild
  ? ({} as SqliteType)
  : new Proxy({} as SqliteType, { get: (_t, p) => (init().sqlite as any)[p] });

export type DbClient = typeof db;
