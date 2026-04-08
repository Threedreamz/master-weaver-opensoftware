import { createDb, type DbClient } from "@opensoftware/db";
import * as schema from "./schema";

export { schema };

type LazyDb = ReturnType<typeof createDb>;
let _instance: LazyDb | null = null;

function getInstance(): LazyDb {
  if (!_instance) {
    const dbPath = process.env.DB_PATH || "openpipeline.db";
    _instance = createDb(dbPath, schema as Record<string, unknown>);
  }
  return _instance;
}

/** Lazy-initialized DB — avoids SQLite connection during next build */
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    return (getInstance().db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const sqlite = new Proxy({} as LazyDb["sqlite"], {
  get(_target, prop) {
    return (getInstance().sqlite as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type { DbClient };
