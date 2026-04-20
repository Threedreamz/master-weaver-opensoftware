import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as opencadSchema from "@opensoftware/db/opencad";
import * as sharedSchema from "@opensoftware/db/shared";

const schema = { ...sharedSchema, ...opencadSchema };

const dbPath = (process.env.DATABASE_URL || "./data/opencad.db").replace(/^file:/, "");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
