CREATE TABLE `steam_games` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon_hash` text,
	`playtime_forever` integer DEFAULT 0 NOT NULL,
	`playtime_two_weeks` integer DEFAULT 0 NOT NULL,
	`playtime_windows` integer DEFAULT 0 NOT NULL,
	`playtime_mac` integer DEFAULT 0 NOT NULL,
	`playtime_linux` integer DEFAULT 0 NOT NULL,
	`playtime_deck` integer DEFAULT 0 NOT NULL,
	`last_played_at` text,
	`status` text DEFAULT 'unplayed' NOT NULL,
	`personal_rating` integer,
	`review` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`custom_cover_url` text,
	`custom_hero_url` text,
	`is_owned` integer DEFAULT true NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`raw_payload` text,
	`synced_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `steam_games_public_idx` ON `steam_games` (`is_owned`,`is_visible`,`is_featured`,`last_played_at`);--> statement-breakpoint
CREATE INDEX `steam_games_status_idx` ON `steam_games` (`status`);--> statement-breakpoint
CREATE INDEX `steam_games_playtime_idx` ON `steam_games` (`playtime_forever`);--> statement-breakpoint
CREATE TABLE `steam_profile` (
	`key` text PRIMARY KEY NOT NULL,
	`steam_id` text NOT NULL,
	`persona_name` text DEFAULT '' NOT NULL,
	`real_name` text,
	`profile_url` text,
	`avatar` text,
	`avatar_medium` text,
	`avatar_full` text,
	`persona_state` integer DEFAULT 0 NOT NULL,
	`visibility_state` integer DEFAULT 0 NOT NULL,
	`country_code` text,
	`game_count` integer DEFAULT 0 NOT NULL,
	`total_playtime_minutes` integer DEFAULT 0 NOT NULL,
	`last_logoff_at` text,
	`account_created_at` text,
	`raw_payload` text,
	`synced_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `steam_sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`message` text,
	`total_games` integer DEFAULT 0 NOT NULL,
	`recently_played` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`finished_at` text,
	`payload` text
);
