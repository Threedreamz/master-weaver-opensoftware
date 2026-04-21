/**
 * Next.js instrumentation hook. Runs once when the server boots.
 *
 * We use it to apply Drizzle migrations against the local SQLite database
 * before any request handler runs. The migrations folder is baked into the
 * Docker image at `/app/apps/openpostbox-api/drizzle` (see Dockerfile
 * stage 3). Skipped during `next build` in Docker so the build doesn't
 * need a writable DB.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DOCKER_BUILD) {
    try {
      const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
      const path = await import("path");
      const { getDb } = await import("./db/client");
      const migrationsFolder = path.join(process.cwd(), "drizzle");
      migrate(getDb(), { migrationsFolder });
    } catch (err) {
      console.warn("[openpostbox-api] Auto-migration skipped:", (err as Error).message);
    }
  }
}
