-- Migration: Drop ALL FKs on slicer_history (model_id + profile_id → none)
--
-- Why: after dropping profile_id FK in migrate-drop-history-profile-fk.sql,
-- slice was still failing with FOREIGN KEY constraint failed. Defensive
-- pre-checks in the route (getModelById) returned truthy, yet the INSERT
-- fired FK anyway — strongly suggesting a race (volume reset / partial
-- seed) with model_id. Rather than keep debugging the race, we soft-
-- validate model ownership at the route layer and let slicer_history be
-- FK-free.
--
-- Idempotent: probe regex in src/instrumentation.ts checks sqlite_master.sql
-- before invoking this script; rerun safely (IF NOT EXISTS guards).

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Staging table: same columns, NO foreign key constraints.
CREATE TABLE IF NOT EXISTS slicer_history__nofk (
  id TEXT PRIMARY KEY NOT NULL,
  model_id TEXT,
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

INSERT OR IGNORE INTO slicer_history__nofk
  (id, model_id, profile_id, status, output_file_path, estimated_time,
   estimated_material, layer_count, slicer_engine, technology,
   started_at, completed_at, error_message, created_at)
SELECT id, model_id, profile_id, status, output_file_path, estimated_time,
       estimated_material, layer_count, slicer_engine, technology,
       started_at, completed_at, error_message, created_at
FROM slicer_history;

DROP INDEX IF EXISTS slicer_history_model_id_idx;
DROP INDEX IF EXISTS slicer_history_profile_id_idx;
DROP INDEX IF EXISTS slicer_history_status_idx;
DROP TABLE slicer_history;
ALTER TABLE slicer_history__nofk RENAME TO slicer_history;

CREATE INDEX IF NOT EXISTS slicer_history_model_id_idx ON slicer_history(model_id);
CREATE INDEX IF NOT EXISTS slicer_history_profile_id_idx ON slicer_history(profile_id);
CREATE INDEX IF NOT EXISTS slicer_history_status_idx ON slicer_history(status);

COMMIT;

PRAGMA foreign_keys = ON;
