/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * MUST live at src/instrumentation.ts (not app-root) because opengen-gateway
 * uses the src/ layout — Next.js only picks up the file from one place
 * depending on that. See Grand-Master-Weaver/.claude/rules/known-pitfalls.md →
 * "Next.js instrumentation.ts location with src/ layout".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/opengen-gateway.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[opengen-gateway:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    const migrationsFolder = process.env.OPENGEN_GATEWAY_MIGRATIONS_DIR
      ? resolve(process.env.OPENGEN_GATEWAY_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/opengen-gateway/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[opengen-gateway:boot] running migrations from ${migrationsFolder}`);

    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[opengen-gateway:boot] migrations complete`);
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
      // first "already exists" error so any LATER migration (e.g. 0001_quotas)
      // never runs. Recovery: walk _journal.json in order and apply each
      // migration idempotently via raw SQL — CREATE TABLE/INDEX → IF NOT EXISTS,
      // ignore "duplicate column" on ALTER TABLE.
      console.warn(
        `[opengen-gateway:boot] migrate() bailed on existing schema — re-applying pending migrations idempotently`,
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
        console.log(`[opengen-gateway:boot] applied migration ${entry.tag} (idempotent path)`);
      }
      console.log(`[opengen-gateway:boot] all migrations applied via recovery path`);
    }
  } catch (err) {
    console.error(`[opengen-gateway:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
