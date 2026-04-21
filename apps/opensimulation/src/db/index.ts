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

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
