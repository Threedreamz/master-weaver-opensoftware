// opensem standalone Postgres schema — no longer shares @opensoftware/db (which is SQLite-only).
// Welle 1: extracted Search Intelligence + Organic Intelligence + Paid Ads tables from admin-starter.
export * from "./postgres-schema";
