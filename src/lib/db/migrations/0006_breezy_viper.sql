ALTER TABLE `users` ADD `role` text DEFAULT 'reader' NOT NULL;--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);