/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * Must live at src/instrumentation.ts (not app-root) because openslicer uses
 * the src/ layout — Next.js only picks up the file from one place depending
 * on that. Previous root-level copy was silently ignored and every query
 * against slicer_printer_profiles returned 500.
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date,
 * and the seed script checks for an existing "Demo Overhang Test" row before
 * inserting. Safe to run on every container start.
 *
 * Failure mode: any error is logged with [openslicer:boot] prefix and
 * re-thrown so the container crashes loudly instead of serving 500s silently.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/openslicer.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[openslicer:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    // In Next 16 standalone, cwd is `/app` (monorepo root) because the CMD is
    // `node apps/openslicer/server.js` from WORKDIR /app — so a bare
    // `drizzle/migrations` relative path would resolve to `/app/drizzle/migrations`
    // which does NOT exist. The Dockerfile bakes migrations at
    // `/app/apps/openslicer/drizzle/migrations`. Prefer an explicit env var
    // (OPENSLICER_MIGRATIONS_DIR), fall back to the apps/openslicer path in
    // production and the local relative path in dev (cwd = apps/openslicer).
    const migrationsFolder = process.env.OPENSLICER_MIGRATIONS_DIR
      ? resolve(process.env.OPENSLICER_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/openslicer/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[openslicer:boot] running migrations from ${migrationsFolder}`);
    // The Dockerfile regenerates drizzle/migrations via `drizzle-kit generate` on
    // every build, which produces NEW timestamp-prefixed filenames each time.
    // When Railway reuses the persistent SQLite volume across deploys, the
    // __drizzle_migrations journal references old filenames while the bundled
    // migration files are freshly named — so Drizzle thinks every migration is
    // new and tries to re-run CREATE TABLE on already-existing tables.
    // Tolerate "already exists" errors so boot continues; the schema on disk
    // matches the schema in code, so the app is functionally correct.
    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[openslicer:boot] migrations complete`);
    } catch (migErr) {
      const cause = (migErr as { cause?: { code?: string; message?: string } })?.cause;
      const causeMsg = cause?.message ?? "";
      const isAlreadyExists =
        cause?.code === "SQLITE_ERROR" &&
        (causeMsg.includes("already exists") || causeMsg.includes("duplicate column"));
      if (isAlreadyExists) {
        console.warn(
          `[openslicer:boot] migration idempotency skip — schema already present on volume (${causeMsg.split("\n")[0]})`,
        );
      } else {
        throw migErr;
      }
    }

    try {
      const { eq } = await import("drizzle-orm");
      const { slicerModels } = await import("./db/schema");
      const sentinel = (db as never as {
        select: () => {
          from: (t: unknown) => { where: (c: unknown) => { get: () => unknown } };
        };
      })
        .select()
        .from(slicerModels)
        .where(eq((slicerModels as never as { name: unknown }).name, "Demo Overhang Test"))
        .get();

      if (!sentinel) {
        console.log(`[openslicer:boot] sentinel missing, running demo seed`);
        // Import under src/ so Next.js traces + bundles the module into the
        // standalone output. A previous import from "../scripts/seed-demo"
        // was outside the traced tree and failed ERR_MODULE_NOT_FOUND.
        const { seedDemo } = await import("./lib/seed/seed-demo");
        const result = await seedDemo();
        console.log(
          `[openslicer:boot] demo seed complete — model=${result.modelId} ` +
            `printers=${result.printerProfileIds.length} ` +
            `filaments=${result.filamentProfileIds.length} ` +
            `processes=${result.processProfileIds.length}`,
        );
      } else {
        console.log(`[openslicer:boot] sentinel found, skipping seed`);
      }
    } catch (seedErr) {
      console.error(`[openslicer:boot] demo seed FAILED (non-fatal):`, seedErr);
    }
  } catch (err) {
    console.error(`[openslicer:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
