CREATE TABLE `daily_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`location` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE INDEX `daily_entries_public_timeline_idx` ON `daily_entries` (`status`,`is_pinned`,`occurred_at`);
