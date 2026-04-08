import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("./db");
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    try {
      migrate(db, { migrationsFolder });
    } catch {
      // Migrations folder may not exist on first boot — schema will be pushed separately
    }
  }
}
