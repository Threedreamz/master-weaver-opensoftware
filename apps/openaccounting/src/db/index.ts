import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export { schema };

type DbType = ReturnType<typeof drizzle<typeof schema>>;
type SqliteType = InstanceType<typeof Database>;

let _db: DbType | null = null;
let _sqlite: SqliteType | null = null;

function init() {
  if (!_db) {
    const dbPath = (process.env.DATABASE_URL || process.env.DB_PATH || "./data/openaccounting.db").replace(/^file:/, "");
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
    _db = drizzle(_sqlite, { schema });
  }
  return { db: _db, sqlite: _sqlite! };
}

const isBuild = !!process.env.DOCKER_BUILD;

export const db: DbType = isBuild
  ? (new Proxy({}, { get: () => () => [] }) as unknown as DbType)
  : new Proxy({} as DbType, { get: (_t, p) => (init().db as any)[p] });

export const sqlite: SqliteType = isBuild
  ? ({} as SqliteType)
  : new Proxy({} as SqliteType, { get: (_t, p) => (init().sqlite as any)[p] });

export type DbClient = typeof db;
