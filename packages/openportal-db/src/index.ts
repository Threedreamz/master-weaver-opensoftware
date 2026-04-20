import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cachedDb) return cachedDb;
  const pool = new Pool({
    connectionString: process.env.OPENPORTAL_DATABASE_URL,
  });
  cachedDb = drizzle(pool, { schema });
  return cachedDb;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_t, p) {
    const d = getDb();
    return (d as unknown as Record<string, unknown>)[p as string];
  },
});

export * from "./schema.js";
export { createLocalAdapter } from "./local-adapter.js";
export type { LocalAdapterOptions } from "./local-adapter.js";
export type { NodePgDatabase } from "drizzle-orm/node-postgres";
