CREATE TABLE `gen_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`input_type` text NOT NULL,
	`input_payload` text NOT NULL,
	`provider_job_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`output_r2_key` text,
	`output_glb_url` text,
	`output_triangle_count` integer,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `gen_jobs_user_id_idx` ON `gen_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `gen_jobs_status_idx` ON `gen_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `gen_jobs_provider_idx` ON `gen_jobs` (`provider`);
