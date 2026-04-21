import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = (process.env.DATABASE_URL || "./data/openfarm.db").replace(/^file:/, "");

// Next.js 16 page-data collection spawns ~47 parallel workers that race on the
// initial `journal_mode = WAL` pragma without a busy timeout → SqliteError:
// database is locked mid-build. 10s busy_timeout makes them wait instead.
const sqlite = new Database(dbPath, { timeout: 10_000 });
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
