import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as opencadSchema from "@opensoftware/db/opencad";
import * as sharedSchema from "@opensoftware/db/shared";

const schema = { ...sharedSchema, ...opencadSchema };

const dbPath = (process.env.DATABASE_URL || "./data/opencad.db").replace(/^file:/, "");

// Next.js 16 page-data collection spawns ~31 parallel workers that each import
// route modules and transitively this file. Even with a 10s busy_timeout the
// `journal_mode = WAL` pragma (which takes an exclusive lock) races across
// workers and one unlucky worker still hits SQLITE_BUSY. Retry the whole
// open-and-pragma sequence with backoff — the operation is cheap and the WAL
// set is idempotent once one worker wins.
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
        /* sync busy-wait — yielding via setTimeout lets other workers jump the queue */
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`opencad db open failed after ${maxAttempts} retries`);
}

const sqlite = openWithRetry(dbPath);

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };
