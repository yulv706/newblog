# Deployment Guide

This guide documents the **canonical operator workflow** for running this blog on a single Linux host with Docker, local-disk persistence, and the committed deployment scripts in `./deploy/`.

## Canonical commands

Use these repo-committed entrypoints only:

- `./deploy/check.sh`
- `./deploy/init.sh`
- `./deploy/start.sh`
- `./deploy/stop.sh`
- `./deploy/update.sh`
- `./deploy/backup.sh`
- `./deploy/restore.sh`

They all use the same runtime environment file: `deploy/.env.production`.

## What persists vs. what is disposable

Persisted operator state:

- `./data` — SQLite database, including the stored admin password hash
- `./public/uploads` — uploaded media served at `/uploads/...`

Disposable artifacts:

- Docker images and containers
- Next.js build output inside containers
- Anything recreated by `docker compose up --build`

Do **not** delete `./data` or `./public/uploads` during normal updates.

## Host prerequisites

Install these before deploying:

- Docker Engine with Docker Compose plugin
- Node.js and `npm`
- `python3`
- `curl`

`./deploy/check.sh` verifies these prerequisites before making runtime changes.

## Environment setup

Create the runtime env file from the example:

```bash
cp deploy/.env.production.example deploy/.env.production
```

Set these values:

| Variable | Required | Purpose | Notes |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Yes | Session signing secret | Must be non-placeholder and at least 32 chars |
| `ADMIN_USERNAME` | Yes | Admin login username | Avoid weak defaults like `admin` |
| `ADMIN_PASSWORD` | Yes | First-run admin password seed | Must be strong; only seeds when no stored hash exists |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public site origin | Must be an absolute `http(s)` origin with no path |
| `NGINX_PORT` | No | Published HTTP port | Defaults to `8080`; mission validation uses `8080` |

Production safety constraints enforced by `./deploy/check.sh`:

- placeholder or short `AUTH_SECRET` values are rejected
- weak `ADMIN_USERNAME` / `ADMIN_PASSWORD` values are rejected
- malformed `NEXT_PUBLIC_SITE_URL` values are rejected
- invalid or privileged `NGINX_PORT` values are rejected

## First deploy on a new Linux host

From a clean checkout:

```bash
cp deploy/.env.production.example deploy/.env.production
# edit deploy/.env.production with secure values
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
```

What these do:

- `check.sh` validates prerequisites, env values, native dependencies, and persistence paths
- `init.sh` runs `check.sh`, prepares persistence directories idempotently, and runs migrations to create/update `data/blog.db`
- `start.sh` refuses to launch if init artifacts are missing, then starts the compose stack and waits for readiness

No manual database creation or ad hoc migration command is required on the supported path.

## Health verification after deploy

Verify the stack with these commands:

```bash
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/
curl -i http://localhost:8080/robots.txt
curl -i http://localhost:8080/sitemap.xml
curl -i http://localhost:8080/api/admin/session
docker compose --env-file deploy/.env.production ps
docker compose --env-file deploy/.env.production logs app nginx
```

Expected behavior:

- `/healthz` returns success only when the app and DB are ready
- `/` returns real application HTML through nginx
- `/robots.txt` and `/sitemap.xml` use `NEXT_PUBLIC_SITE_URL`
- `/api/admin/session` is transport-reachable even when unauthenticated

## Logs and troubleshooting

Inspect status and logs:

```bash
docker compose --env-file deploy/.env.production ps
docker compose --env-file deploy/.env.production logs app nginx
```

Common issues:

- **`deploy/.env.production` missing**  
  Copy `deploy/.env.production.example`, fill in secure values, rerun `./deploy/check.sh`.
- **Bad env values rejected**  
  `./deploy/check.sh` lists every invalid key in one run; fix them and rerun.
- **Port conflict on the published port**  
  Change `NGINX_PORT` to an available unprivileged port and rerun `./deploy/check.sh`.
- **Database file missing when starting**  
  Run `./deploy/init.sh` before `./deploy/start.sh`.
- **Readiness timeout or unhealthy stack**  
  Inspect `docker compose ... logs app nginx`; the start script prints the exact log commands.
- **Missing uploads after restore or migration**  
  Verify that `./public/uploads` exists and that backup/restore was run through the canonical scripts.

## Stopping and updating

Stop the stack:

```bash
./deploy/stop.sh
```

Update to newer code without erasing persisted content:

```bash
git pull
./deploy/update.sh
```

`update.sh` reruns initialization and rebuilds/restarts the compose stack while preserving `./data` and `./public/uploads`.

## Backup and restore

Create a backup:

```bash
./deploy/backup.sh
```

This writes a timestamped archive under `./data/backups/` containing:

- a SQLite-consistent snapshot of `data/blog.db`
- uploaded media from `public/uploads`
- a backup manifest

SQLite consistency note: the backup script creates a real SQLite snapshot instead of only copying filenames, so WAL-backed state is restorable.

Restore onto an empty replacement workspace:

```bash
DEPLOY_RESTORE_ARCHIVE=./data/backups/<archive-name>.tar.gz ./deploy/restore.sh
./deploy/start.sh
```

Restore rules:

- restore expects an empty target workspace for persisted data
- missing archive contents fail loudly
- restore does **not** silently fall through to a fresh empty site

## Admin credential behavior after deploy or restore

`ADMIN_PASSWORD` is **not** a continuously authoritative runtime password.

Behavior:

- on first initialization/login flow, if no stored admin hash exists in the database, the app hashes `ADMIN_PASSWORD` and stores that hash in `./data/blog.db`
- after that, the persisted DB hash is authoritative
- after backup/restore, admin authentication follows the restored database hash, not a newly changed `ADMIN_PASSWORD` value

Operational implication:

- changing `ADMIN_PASSWORD` in `deploy/.env.production` does **not** reset an already-seeded or restored admin password
- if you restore onto a replacement host, keep using the password that matches the restored database state unless you intentionally perform an in-app/admin credential reset workflow

## Fresh-host happy-path checklist

For a brand-new operator host, the supported path is:

```bash
cp deploy/.env.production.example deploy/.env.production
# edit secure values
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/
```

If these pass, the public site is up through nginx using only the documented, committed deployment surface.
