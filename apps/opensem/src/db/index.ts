// opensem standalone Postgres DB client.
//
// opensem is the OpenSoftware AppStore service for Search Intelligence + Organic
// Intelligence + Paid Ads. It owns its own Postgres schema (no longer shares
// @opensoftware/db, which is SQLite-only). Schema is in ./postgres-schema.ts.
//
// Lazy-initialized via Proxy so module evaluation never crashes during
// `next build` page-data collection (Turbopack workers without DATABASE_URL
// would otherwise blow up at import time).

import * as schema from "./postgres-schema";

export { schema };

type DbType = any;

let _db: DbType | null = null;
let _initError: Error | null = null;
let _loggedInitFailure = false;

function getDbPostgres(): DbType {
  try {
    const { drizzle } = require("drizzle-orm/node-postgres");
    const { Pool } = require("pg");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required (postgresql:// connection string)");
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      ssl: { rejectUnauthorized: false },
    });

    _db = drizzle(pool, { schema });
    _initError = null;
    return _db;
  } catch (err) {
    _initError = err instanceof Error ? err : new Error(String(err));
    if (!_loggedInitFailure) {
      _loggedInitFailure = true;
      console.error(`[opensem:db] initialization failed: ${_initError.message}`);
    }
    return makeNullDb(() => _initError?.message ?? "not initialized");
  }
}

function makeNullDb(reason: () => string): DbType {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        return (_resolve: any, reject: any) => {
          const err = new Error(`[opensem:db] unavailable: ${reason()}`);
          if (typeof reject === "function") reject(err);
          return Promise.reject(err);
        };
      }
      if (prop === "catch") {
        return (onRejected: any) => {
          const err = new Error(`[opensem:db] unavailable: ${reason()}`);
          try {
            const out = typeof onRejected === "function" ? onRejected(err) : err;
            return Promise.resolve(out);
          } catch (e) {
            return Promise.reject(e);
          }
        };
      }
      if (prop === "finally") {
        return (onFinally: any) => {
          try {
            if (typeof onFinally === "function") onFinally();
          } catch {}
          return Promise.reject(new Error(`[opensem:db] unavailable: ${reason()}`));
        };
      }
      return (..._args: any[]) => proxy;
    },
    apply() {
      return proxy;
    },
  };
  const proxy: any = new Proxy(function () {} as any, handler);
  return proxy;
}

function getDb(): DbType {
  if (!_db) return getDbPostgres();
  return _db;
}

// During Docker build, export a stub that won't crash DrizzleAdapter
const isBuild = !!process.env.DOCKER_BUILD;

export const db: DbType = isBuild
  ? (new Proxy({}, { get: () => () => [] }) as unknown as DbType)
  : new Proxy({} as DbType, {
      get(_t, prop, receiver) {
        try {
          return Reflect.get(getDb(), prop, receiver);
        } catch (err) {
          _initError = err instanceof Error ? err : new Error(String(err));
          if (!_loggedInitFailure) {
            _loggedInitFailure = true;
            console.error(`[opensem:db] proxy access failed: ${_initError.message}`);
          }
          const nullDb = makeNullDb(() => _initError?.message ?? "not initialized");
          return Reflect.get(nullDb, prop, receiver);
        }
      },
    });

export type DbClient = typeof db;

export { getDb };
