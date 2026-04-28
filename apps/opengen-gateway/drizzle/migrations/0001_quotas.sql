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
