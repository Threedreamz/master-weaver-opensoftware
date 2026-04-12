export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DOCKER_BUILD) {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const path = await import("path");
    const { db } = await import("./db");
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    try {
      migrate(db, { migrationsFolder });
    } catch {
      // Migrations folder may not exist on first boot
    }
  }
}
