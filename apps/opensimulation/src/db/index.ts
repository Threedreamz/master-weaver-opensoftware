import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import * as opensimulationSchema from "@opensoftware/db/opensimulation";
import * as sharedSchema from "@opensoftware/db/shared";

const schema = { ...sharedSchema, ...opensimulationSchema };

const dbPath = (process.env.DATABASE_URL || "./data/opensimulation.db").replace(/^file:/, "");

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

// Next.js 16 page-data collection spawns ~47 parallel workers that race on the
// initial `journal_mode = WAL` pragma without a busy timeout → SqliteError:
// database is locked mid-build. 10s busy_timeout makes them wait instead.
const sqlite = new Database(dbPath, { timeout: 10_000 });
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
