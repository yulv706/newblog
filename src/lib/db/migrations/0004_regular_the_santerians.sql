CREATE TABLE `management_api_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`request_hash` text NOT NULL,
	`status_code` integer NOT NULL,
	`response_body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `management_api_requests_created_at_idx` ON `management_api_requests` (`created_at`);--> statement-breakpoint
CREATE TABLE `management_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`status` text NOT NULL,
	`summary` text DEFAULT '{}' NOT NULL,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `management_audit_logs_created_at_idx` ON `management_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `management_audit_logs_resource_idx` ON `management_audit_logs` (`resource_type`,`resource_id`);