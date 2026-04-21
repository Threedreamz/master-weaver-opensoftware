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
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
