import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const dbPath = (process.env.DATABASE_URL || "./data/opengen-image-gateway.db").replace(
  /^file:/,
  "",
);

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

function openWithRetry(path: string, maxAttempts = 20): Database.Database {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const s = new Database(path, { timeout: 15_000 });
      s.pragma("busy_timeout = 15000");
      s.pragma("journal_mode = WAL");
      s.pragma("foreign_keys = ON");
      return s;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (code !== "SQLITE_BUSY" && code !== "SQLITE_BUSY_RECOVERY") throw err;
      const delayMs = Math.min(50 * Math.pow(1.5, i), 2000);
      const end = Date.now() + delayMs;
      while (Date.now() < end) {
        /* sync busy-wait */
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`opengen-image-gateway db open failed after ${maxAttempts} retries`);
}

const sqlite = openWithRetry(dbPath);

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };
