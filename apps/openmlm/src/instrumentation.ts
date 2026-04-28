/**
 * Next.js instrumentation hook — runs once per server process at boot.
 *
 * MUST live at src/instrumentation.ts (not app-root) because openmlm uses the
 * src/ layout. See known-pitfalls 2026-04-20.
 *
 * Idempotent: safe to run on every container start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/openmlm.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[openmlm:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    // Next 16 standalone cwd = /app (monorepo root), NOT the app dir — so a
    // bare `drizzle/migrations` relative path would resolve to
    // `/app/drizzle/migrations` which does not exist. The Dockerfile bakes
    // migrations at `/app/apps/openmlm/drizzle/migrations`.
    const migrationsFolder = process.env.OPENMLM_MIGRATIONS_DIR
      ? resolve(process.env.OPENMLM_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/openmlm/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[openmlm:boot] running migrations from ${migrationsFolder}`);

    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[openmlm:boot] migrations complete`);
    } catch (migErr) {
      const cause = (migErr as { cause?: { code?: string; message?: string } })?.cause;
      const causeMsg = cause?.message ?? "";
      const isAlreadyExists =
        cause?.code === "SQLITE_ERROR" &&
        (causeMsg.includes("already exists") || causeMsg.includes("duplicate column"));
      if (isAlreadyExists) {
        console.warn(
          `[openmlm:boot] migration idempotency skip — schema already present (${causeMsg.split("\n")[0]})`,
        );
      } else {
        throw migErr;
      }
    }
  } catch (err) {
    console.error(`[openmlm:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
