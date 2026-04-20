export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DOCKER_BUILD) {
    try {
      const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
      const path = await import("path");
      const { db } = await import("./db");
      const migrationsFolder = path.join(process.cwd(), "drizzle");
      migrate(db, { migrationsFolder });
    } catch (err) {
      // Non-fatal: migrations folder may not exist or better-sqlite3 may not load
      console.warn("[opensem] Auto-migration skipped:", (err as Error).message);
    }
  }
}
