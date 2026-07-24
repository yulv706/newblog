# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yulv706/newblog/compare/v1.5.0...HEAD
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
