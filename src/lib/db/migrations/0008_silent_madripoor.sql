CREATE TABLE `user_registration_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`claimed_at` text,
	`sent_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_registration_notifications_user_id_unique` ON `user_registration_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_registration_notifications_dispatch_idx` ON `user_registration_notifications` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `user_registration_notifications_created_at_idx` ON `user_registration_notifications` (`created_at`);