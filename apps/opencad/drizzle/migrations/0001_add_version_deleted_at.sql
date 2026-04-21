-- The `deleted_at` column is already created by 0000_drawings_assemblies.sql.
-- Only the secondary index is still needed; the ALTER TABLE was redundant
-- and always failed on fresh volumes ("duplicate column name: deleted_at").
CREATE INDEX IF NOT EXISTS `opencad_pv_deleted_at_idx` ON `opencad_project_versions` (`deleted_at`);
