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
      if (isAlreadyExists) {
        console.warn(
          `[opengen-gateway:boot] migration idempotency skip — schema already present on volume (${causeMsg.split("\n")[0]})`,
        );
      } else {
        throw migErr;
      }
    }
  } catch (err) {
    console.error(`[opengen-gateway:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
