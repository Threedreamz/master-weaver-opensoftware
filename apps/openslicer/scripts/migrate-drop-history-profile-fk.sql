-- Migration: Drop FK on slicer_history.profile_id
-- Reason: profile_id is polymorphic (references either slicer_profiles.id OR
--   slicer_process_profiles.id). The slice route falls through from legacy
--   profiles to process profiles and passes the matched UUID regardless of
--   which table it came from — the FK to slicer_profiles blocks every slice
--   whose profileId is a process-profile UUID with:
--     "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed"
--
-- SQLite has no ALTER TABLE DROP CONSTRAINT — rebuild the table.
-- Idempotent: no-op on fresh volumes (new CREATE TABLE already lacks the FK).
-- Safe to re-run: wrapped in a transaction + existence check.
--
-- Run via: sqlite3 data/openslicer.db < scripts/migrate-drop-history-profile-fk.sql
-- Or auto-invoked from src/instrumentation.ts on boot.

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Only rebuild if the current slicer_history CREATE statement still references slicer_profiles.
-- This keeps the script a true no-op on databases already migrated or built fresh.
CREATE TABLE IF NOT EXISTS slicer_history__migrate_probe (x INTEGER);
DROP TABLE slicer_history__migrate_probe;

-- 1. Copy existing rows to a staging table with the new (FK-free) shape.
CREATE TABLE IF NOT EXISTS slicer_history__new (
  id TEXT PRIMARY KEY NOT NULL,
  model_id TEXT REFERENCES slicer_models(id),
  profile_id TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  output_file_path TEXT,
  estimated_time INTEGER,
  estimated_material REAL,
  layer_count INTEGER,
  slicer_engine TEXT,
  technology TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  error_message TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

INSERT OR IGNORE INTO slicer_history__new
  (id, model_id, profile_id, status, output_file_path, estimated_time,
   estimated_material, layer_count, slicer_engine, technology,
   started_at, completed_at, error_message, created_at)
SELECT id, model_id, profile_id, status, output_file_path, estimated_time,
       estimated_material, layer_count, slicer_engine, technology,
       started_at, completed_at, error_message, created_at
FROM slicer_history;

-- 2. Drop old table and indexes, rename staging into place.
DROP INDEX IF EXISTS slicer_history_model_id_idx;
DROP INDEX IF EXISTS slicer_history_profile_id_idx;
DROP INDEX IF EXISTS slicer_history_status_idx;
DROP TABLE slicer_history;
ALTER TABLE slicer_history__new RENAME TO slicer_history;

-- 3. Recreate indexes (match drizzle schema names).
CREATE INDEX IF NOT EXISTS slicer_history_model_id_idx ON slicer_history(model_id);
CREATE INDEX IF NOT EXISTS slicer_history_profile_id_idx ON slicer_history(profile_id);
CREATE INDEX IF NOT EXISTS slicer_history_status_idx ON slicer_history(status);

COMMIT;

PRAGMA foreign_keys = ON;
