/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * Boot-order assumption:
 *   Next 16 standalone server starts → instrumentation.ts `register()` runs
 *   → we open the SQLite handle, ensure /app/data exists, run drizzle
 *     migrations from the baked-in /app/apps/openslicer/drizzle/migrations
 *     folder, then run the demo seed if a sentinel row is missing.
 *   Only after this completes does Next.js start accepting requests, so any
 *   route hitting `db` is guaranteed to see a migrated + seeded schema.
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date,
 * and the seed script checks for an existing "Demo Overhang Test" row before
 * inserting. Safe to run on every container start.
 *
 * Failure mode: any error is logged with [openslicer:boot] prefix and
 * re-thrown so the container crashes loudly instead of serving 500s silently.
 */
export async function register() {
  // Only run on the Node.js server runtime (not Edge, not browser).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Lazy-require so this file stays Edge-safe at parse time.
  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/openslicer.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    // 1. Ensure data dir exists (Railway volume mount target = /app/data).
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[openslicer:boot] created data dir ${dataDir}`);
    }

    // 2. Open db AFTER dir exists. Importing src/db/index also runs mkdirSync
    //    but we want to be explicit about ordering here.
    const { db } = await import("./src/db/index");

    // 3. Run drizzle migrations. The Dockerfile bakes generated SQL into
    //    /app/apps/openslicer/drizzle/migrations during the builder stage.
    //    In dev (`next dev`) cwd is apps/openslicer, so a relative path works
    //    in both environments.
    const migrationsFolder = resolve(process.cwd(), "drizzle/migrations");
    console.log(`[openslicer:boot] running migrations from ${migrationsFolder}`);
    migrate(db as never, { migrationsFolder });
    console.log(`[openslicer:boot] migrations complete`);

    // 4. Demo seed — only if sentinel row is missing. Wrapped in try/catch so
    //    a seed failure doesn't kill the whole process; migrations succeeding
    //    is the critical path for /api/* endpoints to stop returning 500.
    try {
      const { eq } = await import("drizzle-orm");
      const { slicerModels } = await import("./src/db/schema");
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
        // Dynamic import keeps the seed script (and its tsx-only deps) out
        // of the build graph in environments where the file may be absent.
        await import("./scripts/seed-demo");
        console.log(`[openslicer:boot] demo seed complete`);
      } else {
        console.log(`[openslicer:boot] sentinel found, skipping seed`);
      }
    } catch (seedErr) {
      console.error(`[openslicer:boot] demo seed FAILED (non-fatal):`, seedErr);
    }
  } catch (err) {
    console.error(`[openslicer:boot] FATAL — db init failed:`, err);
    throw err; // crash loudly, do not serve 500s silently
  }
}
