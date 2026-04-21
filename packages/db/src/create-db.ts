import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export function createDb(dbPath: string, schema: Record<string, unknown>) {
  // Next.js 16 page-data collection spawns ~47 parallel workers that import
  // route modules and transitively this file. Without a busy timeout, the
  // initial `journal_mode = WAL` (a write that briefly takes an exclusive
  // lock) races across workers → SqliteError: database is locked mid-build.
  const sqlite = new Database(dbPath, { timeout: 10_000 });
  sqlite.pragma("busy_timeout = 10000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export type DbClient = ReturnType<typeof createDb>["db"];
