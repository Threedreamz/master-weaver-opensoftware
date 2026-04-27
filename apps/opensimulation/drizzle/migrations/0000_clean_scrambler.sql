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
CREATE TABLE `opensimulation_boundary_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`kind` text NOT NULL,
	`anchor_points_json` text NOT NULL,
	`magnitude_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `opensimulation_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opensim_bc_run_id_idx` ON `opensimulation_boundary_conditions` (`run_id`);--> statement-breakpoint
CREATE TABLE `opensimulation_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`density` real NOT NULL,
	`young_modulus` real NOT NULL,
	`poisson` real NOT NULL,
	`thermal_conductivity` real NOT NULL,
	`specific_heat` real NOT NULL,
	`yield_strength` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opensim_materials_user_id_idx` ON `opensimulation_materials` (`user_id`);--> statement-breakpoint
CREATE TABLE `opensimulation_meshes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`geometry_hash` text NOT NULL,
	`kind` text NOT NULL,
	`vertex_count` integer NOT NULL,
	`element_count` integer NOT NULL,
	`storage_key` text NOT NULL,
	`source` text NOT NULL,
	`source_ref` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opensimulation_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opensim_meshes_project_id_idx` ON `opensimulation_meshes` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `opensim_meshes_hash_uq` ON `opensimulation_meshes` (`geometry_hash`);--> statement-breakpoint
CREATE TABLE `opensimulation_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `opensim_projects_user_id_idx` ON `opensimulation_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `opensim_projects_deleted_at_idx` ON `opensimulation_projects` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `opensimulation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`domain` text NOT NULL,
	`status` text NOT NULL,
	`triggered_by` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text,
	`duration_ms` integer,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opensimulation_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opensim_runs_project_id_idx` ON `opensimulation_runs` (`project_id`);--> statement-breakpoint
CREATE INDEX `opensim_runs_status_idx` ON `opensimulation_runs` (`status`);--> statement-breakpoint
CREATE INDEX `opensim_runs_domain_idx` ON `opensimulation_runs` (`domain`);--> statement-breakpoint
CREATE INDEX `opensim_runs_created_at_idx` ON `opensimulation_runs` (`created_at`);