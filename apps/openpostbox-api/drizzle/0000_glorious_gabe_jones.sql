CREATE TABLE `mail_event` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`mail_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`mail_id`) REFERENCES `scanned_mail`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mail_event_mail` ON `mail_event` (`mail_id`);--> statement-breakpoint
CREATE INDEX `idx_mail_event_tenant_type` ON `mail_event` (`tenant_id`,`type`);--> statement-breakpoint
CREATE TABLE `scanned_mail` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`received_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sender_name` text,
	`sender_address` text,
	`subject` text,
	`page_count` integer DEFAULT 0 NOT NULL,
	`blob_url` text NOT NULL,
	`ocr_text` text,
	`classification` text DEFAULT 'unknown' NOT NULL,
	`tags` text DEFAULT (json_array()) NOT NULL,
	`due_date` integer,
	`unread` integer DEFAULT true NOT NULL,
	`shredded` integer DEFAULT false NOT NULL,
	`prev_hash` text,
	`this_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scanned_mail_tenant_received` ON `scanned_mail` (`tenant_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `idx_scanned_mail_tenant_unread` ON `scanned_mail` (`tenant_id`,`unread`);