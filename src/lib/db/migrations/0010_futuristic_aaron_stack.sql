CREATE TABLE `private_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'thought' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `private_entries_timeline_idx` ON `private_entries` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `private_entries_kind_idx` ON `private_entries` (`kind`,`status`);--> statement-breakpoint
CREATE INDEX `private_entries_target_date_idx` ON `private_entries` (`target_date`);