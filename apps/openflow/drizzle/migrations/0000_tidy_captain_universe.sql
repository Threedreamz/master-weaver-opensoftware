CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_idx` ON `accounts` (`provider`,`providerAccountId`);--> statement-breakpoint
CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`error` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_jobs_flow_idx` ON `ai_jobs` (`flow_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_status_idx` ON `ai_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `ai_jobs_type_idx` ON `ai_jobs` (`type`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);--> statement-breakpoint
CREATE TABLE `asset_references` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`flow_id` text NOT NULL,
	`step_id` text,
	`component_id` text,
	`field_key` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_refs_asset_idx` ON `asset_references` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_refs_flow_idx` ON `asset_references` (`flow_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text DEFAULT 'image' NOT NULL,
	`mime_type` text,
	`size_bytes` integer,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_type_idx` ON `assets` (`type`);--> statement-breakpoint
CREATE INDEX `assets_uploaded_by_idx` ON `assets` (`uploaded_by`);--> statement-breakpoint
CREATE TABLE `component_definitions` (
	`type` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`icon` text NOT NULL,
	`default_config` text NOT NULL,
	`config_schema` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flow_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`step_id` text,
	`component_id` text,
	`author_id` text,
	`author_name` text NOT NULL,
	`author_avatar` text,
	`content` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `flow_comments_flow_idx` ON `flow_comments` (`flow_id`);--> statement-breakpoint
CREATE INDEX `flow_comments_step_idx` ON `flow_comments` (`step_id`);--> statement-breakpoint
CREATE INDEX `flow_comments_resolved_idx` ON `flow_comments` (`resolved`);--> statement-breakpoint
CREATE TABLE `flow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`source_step_id` text NOT NULL,
	`target_step_id` text NOT NULL,
	`condition_type` text DEFAULT 'always' NOT NULL,
	`condition_field_key` text,
	`condition_value` text,
	`label` text,
	`priority` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flow_edges_flow_idx` ON `flow_edges` (`flow_id`);--> statement-breakpoint
CREATE INDEX `flow_edges_source_idx` ON `flow_edges` (`source_step_id`);--> statement-breakpoint
CREATE TABLE `flow_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text,
	`user_avatar` text,
	`action` text NOT NULL,
	`summary` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `flow_edits_flow_idx` ON `flow_edits` (`flow_id`);--> statement-breakpoint
CREATE INDEX `flow_edits_user_idx` ON `flow_edits` (`user_id`);--> statement-breakpoint
CREATE INDEX `flow_edits_created_idx` ON `flow_edits` (`created_at`);--> statement-breakpoint
CREATE TABLE `flow_events` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`type` text NOT NULL,
	`step_id` text,
	`session_id` text,
	`device` text,
	`user_agent` text,
	`referrer` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flow_events_flow_created_idx` ON `flow_events` (`flow_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `flow_events_session_idx` ON `flow_events` (`session_id`);--> statement-breakpoint
CREATE TABLE `flow_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`type` text NOT NULL,
	`config` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flow_notifications_flow_idx` ON `flow_notifications` (`flow_id`);--> statement-breakpoint
CREATE TABLE `flow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`config` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flow_steps_flow_idx` ON `flow_steps` (`flow_id`);--> statement-breakpoint
CREATE TABLE `flow_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`published_at` integer DEFAULT (unixepoch()) NOT NULL,
	`published_by` text,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flow_versions_unique` ON `flow_versions` (`flow_id`,`version`);--> statement-breakpoint
CREATE TABLE `flows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`settings` text,
	`created_by` text,
	`last_edited_by` text,
	`last_edited_at` integer,
	`review_status` text DEFAULT 'none' NOT NULL,
	`review_notes` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_edited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flows_slug_unique` ON `flows` (`slug`);--> statement-breakpoint
CREATE INDEX `flows_slug_idx` ON `flows` (`slug`);--> statement-breakpoint
CREATE INDEX `flows_status_idx` ON `flows` (`status`);--> statement-breakpoint
CREATE INDEX `flows_review_status_idx` ON `flows` (`review_status`);--> statement-breakpoint
CREATE TABLE `qa_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`step_id` text,
	`component_id` text,
	`category` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`message` text NOT NULL,
	`suggestion` text,
	`dismissed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `qa_findings_flow_idx` ON `qa_findings` (`flow_id`);--> statement-breakpoint
CREATE INDEX `qa_findings_severity_idx` ON `qa_findings` (`severity`);--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event_type` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `security_events_user_idx` ON `security_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `security_events_type_idx` ON `security_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `security_events_created_idx` ON `security_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `step_components` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`component_type` text NOT NULL,
	`field_key` text NOT NULL,
	`label` text,
	`config` text NOT NULL,
	`validation` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`visibility_conditions` text,
	`visibility_logic` text DEFAULT 'AND',
	FOREIGN KEY (`step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `step_components_step_idx` ON `step_components` (`step_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`flow_version_id` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`answers` text NOT NULL,
	`metadata` text,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	`last_step_id` text,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flow_version_id`) REFERENCES `flow_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_flow_idx` ON `submissions` (`flow_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `submissions_started_idx` ON `submissions` (`started_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image` text,
	`email_verified` integer,
	`username` text,
	`display_name` text,
	`bio` text,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`password_hash` text,
	`locale` text DEFAULT 'de' NOT NULL,
	`preferences` text,
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
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text,
	`events` text DEFAULT '["submission.completed"]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_flow_idx` ON `webhooks` (`flow_id`);