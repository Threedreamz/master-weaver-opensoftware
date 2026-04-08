-- Migration: Add new slicer columns for brim, skirt, fan control, and printer gcode
-- Run with: sqlite3 data/openslicer.db < scripts/migrate-slicer-columns.sql
-- Safe to re-run: uses ALTER TABLE ADD COLUMN which errors on duplicate (harmless)

-- Process profiles: brim, skirt, fan control
ALTER TABLE slicer_process_profiles ADD COLUMN brim_width REAL DEFAULT 0;
ALTER TABLE slicer_process_profiles ADD COLUMN skirt_distance REAL DEFAULT 6;
ALTER TABLE slicer_process_profiles ADD COLUMN skirt_loops INTEGER DEFAULT 1;
ALTER TABLE slicer_process_profiles ADD COLUMN disable_fan_first_layers INTEGER DEFAULT 1;

-- Printer profiles: custom start/end gcode
ALTER TABLE slicer_printer_profiles ADD COLUMN start_gcode TEXT;
ALTER TABLE slicer_printer_profiles ADD COLUMN end_gcode TEXT;
