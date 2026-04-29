/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * MUST live at src/instrumentation.ts (not app-root) because openflow uses
 * the src/ layout — Next.js only picks up the file from one place depending
 * on that. See Grand-Master-Weaver/.claude/rules/known-pitfalls.md →
 * "Next.js instrumentation.ts location with src/ layout".
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date.
 * If the volume has schema from a prior boot but the tracker is out of sync,
 * fall through to the journal-walk recovery path below. See known-pitfalls
 * 2026-04-28 "Drizzle migrate() bails on first 'already exists'".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DOCKER_BUILD) return;

  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const path = await import("path");
  const { db } = await import("./db");

  // openflow drizzle.config.ts uses `out: "./drizzle/migrations"` — SQL files
  // live at <app>/drizzle/migrations/<tag>.sql, _journal.json at
  // <app>/drizzle/migrations/meta/_journal.json. Dockerfile sets
  // WORKDIR=/app/apps/openflow at runtime so process.cwd() resolves correctly
  // in prod. dev runs from the same dir.
  const migrationsFolder = path.join(process.cwd(), "drizzle", "migrations");
  console.log(`[openflow:boot] running migrations from ${migrationsFolder}`);

  try {
    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[openflow:boot] migrations complete`);
    } catch (migErr) {
      const cause = (migErr as { cause?: { code?: string; message?: string } })?.cause;
      const causeMsg = cause?.message ?? "";
      const isAlreadyExists =
        cause?.code === "SQLITE_ERROR" &&
        (causeMsg.includes("already exists") || causeMsg.includes("duplicate column"));
      if (!isAlreadyExists) {
        throw migErr;
      }
      // Volume has schema from a prior boot but `__drizzle_migrations` tracker
      // was never seeded (or is out of sync). Drizzle's migrate() bails on the
      // first "already exists" error so any LATER migration never runs.
      // Recovery: walk _journal.json in order and apply each migration
      // idempotently via raw SQL — CREATE TABLE/INDEX → IF NOT EXISTS, ignore
      // "duplicate column" on ALTER TABLE.
      console.warn(
        `[openflow:boot] migrate() bailed on existing schema — re-applying pending migrations idempotently`,
      );
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      // openflow's src/db/index.ts directly opens better-sqlite3 but does not
      // export the raw sqlite handle. We open a sibling read/write handle here
      // for the journal-walk recovery path. The handle is short-lived (only
      // the lifetime of register()) and uses the same DATABASE_URL env var.
      const Database = (await import("better-sqlite3")).default;
      const dbPath = (process.env.DATABASE_URL || "./data/openflow.db").replace(/^file:/, "");
      const sqlite = new Database(dbPath, { timeout: 10_000 });
      sqlite.pragma("busy_timeout = 10000");
      try {
        const journal = JSON.parse(
          readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
        ) as { entries: Array<{ idx: number; tag: string }> };
        sqlite.exec(
          "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)",
        );
        for (const entry of journal.entries) {
          const rawSql = readFileSync(join(migrationsFolder, entry.tag + ".sql"), "utf8");
          const idempotent = rawSql
            .replace(/CREATE TABLE\s+`/gi, "CREATE TABLE IF NOT EXISTS `")
            .replace(/CREATE UNIQUE INDEX\s+`/gi, "CREATE UNIQUE INDEX IF NOT EXISTS `")
            .replace(/CREATE INDEX\s+(?!IF NOT EXISTS)`/gi, "CREATE INDEX IF NOT EXISTS `");
          const statements = idempotent
            .split(/-->\s*statement-breakpoint/i)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          for (const stmt of statements) {
            try {
              sqlite.exec(stmt);
            } catch (e) {
              const m = (e as Error).message ?? "";
              if (m.includes("duplicate column")) continue;
              throw e;
            }
          }
          console.log(`[openflow:boot] applied migration ${entry.tag} (idempotent path)`);
        }
        console.log(`[openflow:boot] all migrations applied via recovery path`);
      } finally {
        try {
          sqlite.close();
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    // Non-fatal at this layer: log but allow boot to proceed so the app can
    // surface the inconsistency via /api/health. Throwing here would put the
    // service into a Railway crash-loop with no observability.
    console.warn("[openflow:boot] Auto-migration failed:", (err as Error).message);
  }
}
