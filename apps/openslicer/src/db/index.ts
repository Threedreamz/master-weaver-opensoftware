import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const dbPath = (process.env.DATABASE_URL || "./data/openslicer.db").replace(/^file:/, "");

mkdirSync(dirname(dbPath), { recursive: true });

// Next.js 16 page-data collection spawns ~47 parallel workers that each import
// route modules and transitively this file. Opening with no timeout made them
// race on the `journal_mode = WAL` pragma (a write that briefly takes an
// exclusive lock) → SqliteError: database is locked mid-build. The 10s busy
// timeout makes subsequent workers wait instead of erroring.
const sqlite = new Database(dbPath, { timeout: 10_000 });
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
