CREATE TABLE `opencam_gcode` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`post_id` text NOT NULL,
	`line_count` integer NOT NULL,
	`estimated_duration_sec` real NOT NULL,
	`storage_key` text,
	`gcode_text` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencam_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `opencam_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `opencam_gcode_project_idx` ON `opencam_gcode` (`project_id`);--> statement-breakpoint
CREATE INDEX `opencam_gcode_post_idx` ON `opencam_gcode` (`post_id`);--> statement-breakpoint
CREATE TABLE `opencam_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`tool_id` text,
	`feed_mm_min` real NOT NULL,
	`spindle_rpm` real NOT NULL,
	`stepover_mm` real,
	`stepdown_mm` real,
	`params_json` text NOT NULL,
	`toolpath_json` text,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `opencam_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `opencam_tools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `opencam_ops_project_idx` ON `opencam_operations` (`project_id`);--> statement-breakpoint
CREATE INDEX `opencam_ops_tool_idx` ON `opencam_operations` (`tool_id`);--> statement-breakpoint
CREATE INDEX `opencam_ops_order_idx` ON `opencam_operations` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `opencam_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`dialect` text NOT NULL,
	`template_gcode` text NOT NULL,
	`built_in` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opencam_posts_user_idx` ON `opencam_posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `opencam_posts_dialect_idx` ON `opencam_posts` (`dialect`);--> statement-breakpoint
CREATE TABLE `opencam_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`stock_bbox_json` text,
	`part_geometry_hash` text,
	`linked_opencad_project_id` text,
	`linked_opencad_version_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `opencam_projects_user_id_idx` ON `opencam_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `opencam_projects_linked_idx` ON `opencam_projects` (`linked_opencad_project_id`);--> statement-breakpoint
CREATE INDEX `opencam_projects_deleted_at_idx` ON `opencam_projects` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `opencam_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`diameter_mm` real NOT NULL,
	`flute_count` integer NOT NULL,
	`length_mm` real NOT NULL,
	`material` text,
	`shop_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opencam_tools_user_idx` ON `opencam_tools` (`user_id`);--> statement-breakpoint
CREATE INDEX `opencam_tools_kind_idx` ON `opencam_tools` (`kind`);