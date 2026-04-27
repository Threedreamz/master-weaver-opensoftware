import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as opencamSchema from "@opensoftware/db/opencam";
import * as sharedSchema from "@opensoftware/db/shared";

const schema = { ...sharedSchema, ...opencamSchema };

const dbPath = (process.env.DATABASE_URL || "./data/opencam.db").replace(/^file:/, "");

// Ensure parent dir exists — matters during `next build` collect-page-data,
// when CWD is the app dir but ./data/ hasn't been created yet.
mkdirSync(dirname(dbPath), { recursive: true });

// Next.js 16 page-data collection spawns ~47 parallel workers that race on the
// initial `journal_mode = WAL` pragma without a busy timeout → SqliteError:
// database is locked mid-build. 10s busy_timeout makes them wait instead.
const sqlite = new Database(dbPath, { timeout: 10_000 });
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
