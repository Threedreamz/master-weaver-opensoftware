import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as opencamSchema from "@opensoftware/db/opencam";
import * as sharedSchema from "@opensoftware/db/shared";

const schema = { ...sharedSchema, ...opencamSchema };

const dbPath = (process.env.DATABASE_URL || "./data/opencam.db").replace(/^file:/, "");

mkdirSync(dirname(dbPath), { recursive: true });

// Next.js 16 page-data collection spawns ~25-31 parallel workers that each
// import route modules and transitively this file. A plain busy_timeout is
// not enough — workers race on the initial `journal_mode = WAL` pragma which
// briefly takes an exclusive lock and a 10s timeout still throws SQLITE_BUSY
// under contention. Retry the whole open-and-pragma sequence with a sync
// busy-wait — the operation is cheap and WAL is idempotent once one worker
// wins. Pattern lifted from apps/opencad/src/db/index.ts post-2026-04-22.
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
    : new Error(`opencam db open failed after ${maxAttempts} retries`);
}

const sqlite = openWithRetry(dbPath);

export const db = drizzle(sqlite, { schema });
export { schema };
