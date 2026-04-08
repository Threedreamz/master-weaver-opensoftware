import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

/**
 * Creates an in-memory SQLite database for testing.
 * Returns the drizzle instance and a cleanup function.
 */
export function createTestDb(schema: Record<string, unknown>) {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    cleanup: () => sqlite.close(),
  };
}

/**
 * Run raw SQL to create tables for testing.
 * Since we use drizzle-kit push for real DBs, we need manual CREATE TABLE for in-memory tests.
 */
export function execRawSql(sqlite: Database.Database, statements: string) {
  sqlite.exec(statements);
}
