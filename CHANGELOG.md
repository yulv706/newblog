# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yulv706/newblog/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/yulv706/newblog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/yulv706/newblog/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yulv706/newblog/releases/tag/v1.0.0
