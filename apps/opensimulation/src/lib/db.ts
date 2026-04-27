/**
 * Convenience re-export of the Drizzle client for route handlers that want
 * to import from `@/lib/db`. Mirrors opencad's src/db/index.ts shape so
 * later refactors can align the two apps 1:1.
 */
export { db, schema } from "../db/index";
