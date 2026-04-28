CREATE TABLE `img_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`input_type` text NOT NULL,
	`input_payload` text NOT NULL,
	`provider_job_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`output_r2_key` text,
	`output_image_url` text,
	`output_width` integer,
	`output_height` integer,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `img_jobs_user_id_idx` ON `img_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `img_jobs_status_idx` ON `img_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `img_jobs_provider_idx` ON `img_jobs` (`provider`);--> statement-breakpoint
CREATE TABLE `quota_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`user_id` text NOT NULL,
	`user_class` text DEFAULT '' NOT NULL,
	`provider` text NOT NULL,
	`period` text NOT NULL,
	`period_key` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quota_usage_unique_idx` ON `quota_usage` (`scope`,`user_id`,`provider`,`period`,`period_key`);
