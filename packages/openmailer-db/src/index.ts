import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const pool = new Pool({
  connectionString: process.env.OPENMAILER_DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export * from "./schema.js";
export type { NodePgDatabase } from "drizzle-orm/node-postgres";
