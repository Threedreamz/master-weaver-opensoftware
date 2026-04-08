import { createDb } from "@opensoftware/db";
import * as schema from "./schema";

const dbPath = process.env.DB_PATH || "opensem.db";
const { db, sqlite } = createDb(dbPath, schema as Record<string, unknown>);

export { db, sqlite, schema };
export type DbClient = typeof db;
