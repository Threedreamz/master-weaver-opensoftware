import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// Next.js 16 page-data collection spawns ~31-47 parallel workers that each
// import route modules and transitively this file. Even with a generous
// busy_timeout, the `journal_mode = WAL` pragma (which briefly takes an
// exclusive write lock) races across workers — one unlucky worker still hits
// SqliteError: database is locked. Retry the whole open-and-pragma sequence
// with synchronous busy-wait backoff: the operation is cheap, the WAL set is
// idempotent once one worker wins, and async setTimeout would let the next
// racing worker jump the queue and extend contention.
//
// Mirrors the canonical opencad pattern (see apps/opencad/src/db/index.ts post
// 2026-04-22). Exposed via the shared @opensoftware/db package so every
// consumer (openinventory, openpayroll, openbounty, openseo, openmailer,
// openpipeline, openaccounting, openlawyer, opensem, openmaps) gets the same
// hardening without copy-paste drift.
function syncWait(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync busy-wait — yielding via setTimeout lets other workers jump the queue */
  }
}

function openWithRetry(dbPath: string, maxAttempts = 20): Database.Database {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const sqlite = new Database(dbPath, { timeout: 15_000 });
      sqlite.pragma("busy_timeout = 15000");
      // The WAL pragma can ALSO race independently of the open — wrap it in
      // its own retry inside the same outer loop so a busy WAL upgrade
      // doesn't waste the successfully-acquired connection.
      let walSet = false;
      let walErr: unknown;
      for (let j = 0; j < maxAttempts; j++) {
        try {
          sqlite.pragma("journal_mode = WAL");
          walSet = true;
          break;
        } catch (err) {
          walErr = err;
          const code = (err as { code?: string })?.code;
          if (code !== "SQLITE_BUSY" && code !== "SQLITE_BUSY_RECOVERY") throw err;
          syncWait(Math.min(50 * Math.pow(1.5, j), 2000));
        }
      }
      if (!walSet) {
        try {
          sqlite.close();
        } catch {
          /* ignore */
        }
        throw walErr instanceof Error
          ? walErr
          : new Error(`@opensoftware/db: WAL pragma failed after ${maxAttempts} retries`);
      }
      sqlite.pragma("foreign_keys = ON");
      return sqlite;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (code !== "SQLITE_BUSY" && code !== "SQLITE_BUSY_RECOVERY") throw err;
      syncWait(Math.min(50 * Math.pow(1.5, i), 2000));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`@opensoftware/db: open failed after ${maxAttempts} retries`);
}

export function createDb(dbPath: string, schema: Record<string, unknown>) {
  const sqlite = openWithRetry(dbPath);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export type DbClient = ReturnType<typeof createDb>["db"];
