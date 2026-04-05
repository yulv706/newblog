# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Supported Deployment Variables

| Variable | Required | Purpose | Notes |
|----------|----------|---------|-------|
| `AUTH_SECRET` | Yes | Session/JWT signing secret | Must be non-placeholder in any supported deployment flow |
| `ADMIN_USERNAME` | Yes | Admin login username | Username comes from env; password state is persisted in DB after first initialization/login flow |
| `ADMIN_PASSWORD` | Yes | Initial/admin credential input | Must not use weak defaults in supported deployment flow |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical public origin | Drives robots/sitemap/absolute URLs; must match the public deployment origin |
| `NGINX_PORT` | Optional | Published HTTP port for nginx | Validation flows use `8080`; production docs may describe overriding this |

## Configuration Semantics

- The mission target is a **single canonical environment source** shared by operator automation and runtime startup.
- Avoid split-brain configuration where one file drives compose startup and another drives application behavior.
- Fallback defaults currently exist in code/config; mission work is expected to guard or replace them in the supported deployment path.

## Persistence Notes

- SQLite database path: `./data/blog.db`
- Upload persistence root: `./public/uploads`
- The app currently enables SQLite WAL mode; backup/restore tooling must account for SQLite-consistent recovery semantics.
- `ADMIN_PASSWORD` is not a simple always-live runtime value: the password hash is persisted in database state after initialization, so restore/credential documentation must treat DB state as authoritative.

## External Dependencies

- Docker + Docker Compose are the only intended infrastructure dependencies for this mission.
- No external database, cache, or cloud service should be introduced.

## Platform Notes

- Current environment: WSL2/Linux with Docker available.
- Current machine profile observed during planning: 20 CPU cores, ~7.8 GB RAM.
- For browser-based validation, `agent-browser` may require `LD_LIBRARY_PATH="/home/kongyu/miniconda3/lib:$LD_LIBRARY_PATH"` in this environment.

## Dependency Notes

- `better-sqlite3` is a native addon and may require rebuilds if the Node runtime changes.
- Production image/build work must preserve compatibility for `better-sqlite3`.
- `shiki` may add some build-time latency on cold builds.
