CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_idx` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `integration_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`app_name` text NOT NULL,
	`service_name` text NOT NULL,
	`workspace_id` text,
	`credentials` text NOT NULL,
	`auth_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_sync_at` integer,
	`last_error_at` integer,
	`last_error_message` text,
	`config` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ic_app_service_idx` ON `integration_connections` (`app_name`,`service_name`);--> statement-breakpoint
CREATE INDEX `ic_status_idx` ON `integration_connections` (`status`);--> statement-breakpoint
CREATE TABLE `integration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`event_type` text NOT NULL,
	`direction` text,
	`payload` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ie_connection_idx` ON `integration_events` (`connection_id`);--> statement-breakpoint
CREATE INDEX `ie_type_idx` ON `integration_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `integration_webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`endpoint_path` text NOT NULL,
	`secret` text NOT NULL,
	`events` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `iw_connection_idx` ON `integration_webhooks` (`connection_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image` text,
	`email_verified` integer,
	`username` text,
	`display_name` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`locale` text DEFAULT 'de' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `opencad_assemblies` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`tree_json` text NOT NULL,
	`solved_poses_json` text,
	`motion_study_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_asm_project_idx` ON `opencad_assemblies` (`project_id`);--> statement-breakpoint
CREATE TABLE `opencad_assembly_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`part_project_id` text NOT NULL,
	`instance_name` text NOT NULL,
	`transform_json` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `opencad_assemblies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `opencad_asm_parts_asm_idx` ON `opencad_assembly_parts` (`assembly_id`);--> statement-breakpoint
CREATE TABLE `opencad_drawings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`sheet_width_mm` real DEFAULT 297 NOT NULL,
	`sheet_height_mm` real DEFAULT 210 NOT NULL,
	`sheet_title` text NOT NULL,
	`sheet_author` text,
	`sheet_revision` text,
	`views_json` text NOT NULL,
	`dimensions_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_drawings_project_idx` ON `opencad_drawings` (`project_id`);--> statement-breakpoint
CREATE TABLE `opencad_features` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`params_json` text NOT NULL,
	`parent_ids` text NOT NULL,
	`output_geometry_hash` text,
	`order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_features_project_id_idx` ON `opencad_features` (`project_id`);--> statement-breakpoint
CREATE INDEX `opencad_features_geom_hash_idx` ON `opencad_features` (`output_geometry_hash`);--> statement-breakpoint
CREATE INDEX `opencad_features_order_idx` ON `opencad_features` (`project_id`,`order`);--> statement-breakpoint
CREATE TABLE `opencad_gcode_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`dialect` text NOT NULL,
	`config_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opencad_posts_user_idx` ON `opencad_gcode_posts` (`user_id`);--> statement-breakpoint
CREATE TABLE `opencad_imported_bodies` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_format` text NOT NULL,
	`original_filename` text NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_imported_project_idx` ON `opencad_imported_bodies` (`project_id`);--> statement-breakpoint
CREATE TABLE `opencad_mates` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`part_a_id` text NOT NULL,
	`part_b_id` text NOT NULL,
	`type` text NOT NULL,
	`params_json` text,
	FOREIGN KEY (`assembly_id`) REFERENCES `opencad_assemblies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_a_id`) REFERENCES `opencad_assembly_parts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_b_id`) REFERENCES `opencad_assembly_parts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_mates_asm_idx` ON `opencad_mates` (`assembly_id`);--> statement-breakpoint
CREATE TABLE `opencad_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`tool_id` text,
	`stock_json` text NOT NULL,
	`params_json` text NOT NULL,
	`toolpath_json` text,
	`gcode_key` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `opencad_tools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `opencad_ops_project_idx` ON `opencad_operations` (`project_id`);--> statement-breakpoint
CREATE INDEX `opencad_ops_tool_idx` ON `opencad_operations` (`tool_id`);--> statement-breakpoint
CREATE TABLE `opencad_project_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`parent_version_id` text,
	`label` text,
	`feature_tree_json` text NOT NULL,
	`thumbnail_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_pv_project_id_idx` ON `opencad_project_versions` (`project_id`);--> statement-breakpoint
CREATE INDEX `opencad_pv_parent_idx` ON `opencad_project_versions` (`parent_version_id`);--> statement-breakpoint
CREATE TABLE `opencad_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `opencad_projects_user_id_idx` ON `opencad_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `opencad_projects_deleted_at_idx` ON `opencad_projects` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `opencad_sketches` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`plane_ref` text NOT NULL,
	`constraints_json` text NOT NULL,
	`entities_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencad_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opencad_sketches_project_id_idx` ON `opencad_sketches` (`project_id`);--> statement-breakpoint
CREATE TABLE `opencad_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`diameter` real NOT NULL,
	`flutes` integer NOT NULL,
	`type` text NOT NULL,
	`feed_rate` real,
	`spindle_rpm` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opencad_tools_user_idx` ON `opencad_tools` (`user_id`);