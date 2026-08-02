# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.12] - 2026-08-02

### Fixed

- Adds direction-aware horizontal swipe navigation to the featured bookshelf,
  featured game stage, and book annotation pages while preserving vertical
  page scrolling on touch devices.
- Keeps daily image gallery swiping available when reduced motion is enabled
  and shares the same distance, velocity, and diagonal-gesture safeguards.

## [1.6.11] - 2026-07-31

### Fixed

- Routes proactive Weixin notifications through a signed loopback webhook on
  the resident Hermes gateway using replay-protected HMAC V2, avoiding
  competing one-shot iLink sessions.
- Applies a six-hour shared protection window when the live Weixin adapter
  rejects delivery, automatically releasing it when a new inbound Weixin
  context is observed while retaining bounded retries for HTTP transport errors.
- Prevents the health monitor from reporting Hermes transport failures through
  the same broken transport and confirms transient integration failures before
  alerting.
- Disables routine recovery notifications by default so brief Steam or network
  incidents do not consume the limited proactive Weixin delivery budget.

## [1.6.10] - 2026-07-29

### Changed

- Serializes every Hermes Weixin delivery across reading reports, evening
  recommendations, registration notices, and health alerts with a shared
  account-level delivery gate.
- Spaces successful messages by at least 45 seconds and persists an exponential
  account cooldown after iLink rate-limit responses so independent services
  cannot create retry bursts.
- Adds idempotency keys for scheduled and registration messages, preventing
  duplicate delivery after process restarts or database acknowledgement races.
- Exposes protective Hermes delivery cooldowns in system health while allowing
  health snapshots to complete even when an alert itself must be deferred.

## [1.6.8] - 2026-07-29

### Fixed

- Supports a Steam-only list of tested IPv4 edge routes, rotating between them
  during retries without changing host, Docker, or system-wide DNS settings.

## [1.6.7] - 2026-07-29

### Fixed

- Serializes the three Steam Web API requests so unstable cross-border routes
  are not hit with concurrent connection and retry bursts.

## [1.6.6] - 2026-07-29

### Fixed

- Retries transient Steam API network, timeout, rate-limit, and server errors
  with bounded backoff while preserving actionable low-level diagnostics.
- Leaves authentication and privacy-related client errors fail-fast so invalid
  configuration remains visible.

## [1.6.5] - 2026-07-28

### Fixed

- Keeps the system-health auto-refresh thumb inside its switch track and
  preserves stable spacing beside the manual refresh button.

## [1.6.4] - 2026-07-28

### Fixed

- Keeps the Hermes heartbeat and delivery-freshness monitor compatible with the
  server's Python 3.6 runtime.

## [1.6.3] - 2026-07-28

### Fixed

- Retries Hermes Weixin deliveries after the iLink cooldown window instead of
  dropping scheduled reading, evening, registration, or health-alert messages
  on the first transient rate-limit response.
- Marks proactive messaging unhealthy when the latest systemd job failed or an
  expected daily delivery is stale, and validates the live Hermes gateway
  heartbeat instead of trusting an old connected-state snapshot.

## [1.6.2] - 2026-07-26

### Fixed

- Shows the same lock indicator beside both Daily and Games for signed-out users
  across desktop and mobile navigation.
- Centralized authenticated navigation metadata so route protection and visual
  affordances cannot drift apart when more private sections are added.

## [1.6.1] - 2026-07-26

### Added

- Added first-class Steam game archive monitoring to the administration status
  page, covering login protection, sync freshness, library counts, and the shared
  18:00 scheduler.
- Routes Steam sync failures, stale snapshots, missing credentials, and access
  control regressions through the existing transition-based Hermes alert flow.

## [1.6.0] - 2026-07-26

### Added

- Added a Steam-connected game archive with owned-game, lifetime playtime,
  recent-session, profile, and platform statistics persisted as a local snapshot.
- Added a cinematic signed-in game experience with featured sessions, recent-play
  history, searchable filters, sorting, pagination, and an accessible,
  drag-dismissible game detail view.
- Added private game curation controls for play status, personal ratings, reviews,
  tags, favorites, featured placement, visibility, and custom artwork.
- Added Steam connection diagnostics, privacy guidance, manual and scheduled sync
  commands, database migrations, localized copy, and regression coverage.

### Changed

- Refreshes the Steam game snapshot serially with the daily 18:00 WeRead job while
  allowing the reading summary to continue when Steam is temporarily unavailable.
- Added resilient artwork selection that rejects blank CDN placeholders, avoids
  stretching low-resolution icons, and recovers images loaded before hydration.

### Security

- Keeps the Steam Web API key server-side and preserves all site-owned editorial
  fields when refreshing source data from Steam.
- Requires an authenticated account for the game archive and its server-side
  artwork fallback, and excludes the private route from indexing and the sitemap.

## [1.5.0] - 2026-07-24

### Added

- Added a private administration status page for application, SMTP registration,
  RSS, database, WeRead, Hermes, scheduled messages, TLS, backups, disk, and memory.
- Added a low-priority five-minute host monitor with cached external checks and a
  public, secret-free health snapshot consumed by the administration interface.
- Added transition-based Hermes incident and recovery notifications with bounded
  repeat alerts so persistent failures remain visible without producing message
  noise.
- Added daily 18:00 reading summaries and contextual 23:00 reflections delivered
  through the owner's bound Weixin conversation.

### Changed

- Moved the daily WeRead synchronization to 18:00 Asia/Shanghai and connected its
  completion state to proactive reading reports.

## [1.4.0] - 2026-07-23

### Added

- Added transactionally queued new-user registration notifications delivered to
  the owner's bound Weixin conversation through Hermes.
- Added registered-user listing and access management to the private management
  API and Hermes MCP bridge.
- Added a lightweight host dispatcher with stale-claim recovery and bounded
  exponential retry so Hermes downtime never blocks registration.

### Security

- Protects the final active administrator from being disabled or demoted through
  the management API.
- Requires explicit confirmation in the Hermes bridge before changing user roles
  or account status, and keeps authentication challenges and sessions outside the
  API response surface.

## [1.3.3] - 2026-07-23

### Changed

- Removed the redundant Daily shortcut from My Account to keep account actions
  focused and visually separated.

## [1.3.2] - 2026-07-23

### Changed

- Replaced the legacy administrator username/password flow with email-code-only
  authentication.
- Added an administration entry to My Account that is rendered only for
  administrator accounts.

### Security

- Invalidates legacy username-based administrator sessions and removes the
  persisted password hash during migration.

## [1.3.1] - 2026-07-23

### Added

- Added persistent reader and administrator account roles.
- Added email-code access to the administration area for administrator accounts,
  while retaining the existing username/password recovery path.

### Security

- Revalidates email administrator role and active status against the database for
  every protected administration layout, API, and server action.
- Clears both reader and email-derived administrator sessions on account logout.

## [1.3.0] - 2026-07-23

### Added

- Added passwordless reader accounts with real SMTP email verification codes,
  persistent sessions, profile settings, resend throttling, and abuse limits.
- Added reader management for administrators, including account status controls.
- Added an optional local Mailpit inbox so the complete email sign-in flow can be
  exercised from Docker without exposing a development SMTP service publicly.

### Changed

- Restricted Daily pages and Daily media to authenticated readers or administrators,
  and removed private Daily URLs from robots and sitemap output.
- Linked new comments to verified reader accounts while preserving historical
  anonymous comments.
- Added account-aware desktop and mobile navigation.

### Security

- Isolated administrator and reader session token types and validated active account
  state against the database for protected content.
- Hashes one-time codes and request IP addresses, expires challenges after ten
  minutes, limits retries, and applies per-email and per-IP request throttles.

## [1.2.2] - 2026-07-23

### Fixed

- Render Daily content as sanitized, compact Markdown so entries created through
  Hermes display emphasis, headings, lists, quotes, links, and code correctly.
- Preserve clickable Daily topic filters and stop bare links at common Chinese
  punctuation without rewriting linked text or inline code.

## [1.2.1] - 2026-07-22

### Fixed

- Added a transactionally consistent SQLite dump fallback for Python 3.6 hosts
  where `sqlite3.Connection.backup()` is unavailable, and verify every snapshot
  with `PRAGMA integrity_check`.

## [1.2.0] - 2026-07-22

### Added

- Added an internal, versioned management API for posts, Daily entries, media, About,
  taxonomy, comments, books, manual reading notes, WeRead sync, audit history, and
  consistent SQLite snapshots.
- Added a typed Hermes MCP bridge and operating skill for managing the blog from
  Weixin without granting host shell or Docker access.
- Added bearer authentication, bounded rate limiting, mutation audit logs,
  idempotency keys, optimistic concurrency, and explicit deletion confirmation.

### Changed

- Blocked the management API at public Nginx so it is only reachable from the private
  Docker network.
- Protected every legacy admin Server Action with an explicit authenticated session
  check.
- Preserved manually added reading notes across subsequent WeRead synchronizations.

## [1.1.0] - 2026-07-22

### Added

- Added a bilingual Daily timeline with drafts, publishing, pinning, topic and year
  filters, pagination, shareable detail pages, and an accessible image lightbox.
- Added a protected Daily composer with validated multi-image uploads and persistent
  media storage.

### Changed

- Added Daily to public and admin navigation, metadata, and sitemap generation.
- Updated Next.js and its ESLint configuration to the latest 15.5 maintenance release.
- Made Docker dependency installation reproducible from the package lockfile.

## [1.0.0] - 2026-07-19

### Added

- Established the first stable release baseline for the blog, bookshelf, WeRead sync,
  RSS, HTTPS deployment, backup, and restore workflows.
- Added traceable application version, source revision, and build time metadata.
- Added immutable version and revision Docker image tags.

[Unreleased]: https://github.com/yulv706/newblog/compare/v1.6.8...HEAD
[1.6.8]: https://github.com/yulv706/newblog/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/yulv706/newblog/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/yulv706/newblog/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/yulv706/newblog/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/yulv706/newblog/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/yulv706/newblog/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/yulv706/newblog/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/yulv706/newblog/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/yulv706/newblog/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/yulv706/newblog/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/yulv706/newblog/compare/v1.3.3...v1.4.0
[1.3.3]: https://github.com/yulv706/newblog/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/yulv706/newblog/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/yulv706/newblog/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/yulv706/newblog/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/yulv706/newblog/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/yulv706/newblog/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/yulv706/newblog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/yulv706/newblog/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yulv706/newblog/releases/tag/v1.0.0
