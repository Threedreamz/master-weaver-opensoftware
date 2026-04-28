/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * MUST live at src/instrumentation.ts (not app-root) because opencam uses
 * the src/ layout — Next.js only picks up the file from one place depending
 * on that. See Grand-Master-Weaver/.claude/rules/known-pitfalls.md →
 * "Next.js instrumentation.ts location with src/ layout".
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date.
 * Safe to run on every container start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/opencam.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[opencam:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    // Next 16 standalone cwd = /app (monorepo root), NOT the app dir — so a
    // bare `drizzle/migrations` relative path would resolve to
    // `/app/drizzle/migrations` which does not exist. The Dockerfile bakes
    // migrations at `/app/apps/opencam/drizzle/migrations`; read the explicit
    // OPENCAM_MIGRATIONS_DIR env var in prod, fall back to cwd-relative in dev.
    const migrationsFolder = process.env.OPENCAM_MIGRATIONS_DIR
      ? resolve(process.env.OPENCAM_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/opencam/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[opencam:boot] running migrations from ${migrationsFolder}`);

    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[opencam:boot] migrations complete`);
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
      // first "already exists" error so any LATER migration silently never
      // runs — that was the prior `console.warn(...)` skip. Recovery: walk
      // _journal.json in order and apply each migration idempotently via raw
      // SQL — CREATE TABLE/INDEX → IF NOT EXISTS, ignore "duplicate column"
      // on ALTER TABLE. See .claude/rules/known-pitfalls.md → 2026-04-28
      // "Drizzle migrate() bails on first 'already exists'".
      console.warn(
        `[opencam:boot] migrate() bailed on existing schema — re-applying pending migrations idempotently`,
      );
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const { sqlite } = await import("./db/index");
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
        console.log(`[opencam:boot] applied migration ${entry.tag} (idempotent path)`);
      }
      console.log(`[opencam:boot] all migrations applied via recovery path`);
    }

    // Seed built-in post-processors (grbl/marlin/fanuc/linuxcnc/haas). Stable
    // IDs ({dialect}-builtin) mean the admin UI can pick a post without first
    // querying the list. Idempotent: skips rows already present.
    try {
      const { seedBuiltinPosts } = await import("./lib/seed/seed-posts");
      const result = await seedBuiltinPosts();
      console.log(
        `[opencam:boot] built-in posts seeded — inserted=${result.inserted} skipped=${result.skipped}`,
      );
    } catch (seedErr) {
      console.error(`[opencam:boot] built-in posts seed FAILED (non-fatal):`, seedErr);
    }

    // Seed default tool library (8 endmills + 4 drills + 2 ball endmills + v-bit)
    // ONLY on first boot when the tools table is empty — never clobbers
    // user-modified tools. Stable IDs (tool-builtin-*) mean operations can
    // FK-reference these tools and survive a re-seed cleanly.
    try {
      const { seedToolLibrary } = await import("./lib/seed/seed-tools");
      const result = await seedToolLibrary();
      if (result.skipped) {
        console.log(`[opencam:boot] default tool library — skipped (table not empty)`);
      } else {
        console.log(`[opencam:boot] default tool library seeded — inserted=${result.inserted}`);
      }
    } catch (seedErr) {
      console.error(`[opencam:boot] default tool library seed FAILED (non-fatal):`, seedErr);
    }
  } catch (err) {
    console.error(`[opencam:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
