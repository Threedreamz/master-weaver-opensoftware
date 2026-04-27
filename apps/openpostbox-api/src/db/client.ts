import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;
  const dbPath =
    process.env.DATABASE_URL?.replace(/^file:/, "") ??
    path.join(process.cwd(), "data", "openpostbox.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  cached = drizzle(sqlite, { schema });
  return cached;
}
