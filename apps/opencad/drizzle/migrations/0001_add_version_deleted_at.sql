ALTER TABLE `opencad_project_versions` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `opencad_pv_deleted_at_idx` ON `opencad_project_versions` (`deleted_at`);
