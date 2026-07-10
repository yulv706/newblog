CREATE TABLE `reading_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`cover` text,
	`category` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`rating` integer,
	`pages` integer DEFAULT 0 NOT NULL,
	`year` integer,
	`word_count` integer DEFAULT 0 NOT NULL,
	`note_count` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`bookmark_count` integer DEFAULT 0 NOT NULL,
	`reading_seconds` integer DEFAULT 0 NOT NULL,
	`latest_note` text,
	`deep_link` text,
	`is_private` integer DEFAULT false NOT NULL,
	`is_top` integer DEFAULT false NOT NULL,
	`read_updated_at` text,
	`finished_at` text,
	`archived_at` text,
	`raw_payload` text,
	`synced_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_books_source_id_unique` ON `reading_books` (`source_id`);--> statement-breakpoint
CREATE INDEX `reading_books_public_idx` ON `reading_books` (`archived_at`,`is_private`,`status`);--> statement-breakpoint
CREATE INDEX `reading_books_read_updated_at_idx` ON `reading_books` (`read_updated_at`);--> statement-breakpoint
CREATE TABLE `reading_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`book_source_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`abstract` text,
	`chapter_title` text,
	`created_at` text,
	`raw_payload` text,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`book_source_id`) REFERENCES `reading_books`(`source_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_notes_source_id_unique` ON `reading_notes` (`source_id`);--> statement-breakpoint
CREATE INDEX `reading_notes_book_source_id_idx` ON `reading_notes` (`book_source_id`);--> statement-breakpoint
CREATE INDEX `reading_notes_created_at_idx` ON `reading_notes` (`created_at`);--> statement-breakpoint
CREATE TABLE `reading_sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`message` text,
	`total_books` integer DEFAULT 0 NOT NULL,
	`total_notes` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`finished_at` text,
	`payload` text
);
