CREATE TABLE `email_auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`code_hash` text NOT NULL,
	`request_ip_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_auth_challenges_email_created_idx` ON `email_auth_challenges` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_auth_challenges_ip_created_idx` ON `email_auth_challenges` (`request_ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_auth_challenges_expires_idx` ON `email_auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email_verified_at` text NOT NULL,
	`last_login_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `comments_user_id_idx` ON `comments` (`user_id`);