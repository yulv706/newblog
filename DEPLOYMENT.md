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

| Variable                      | Required         | Purpose                           | Notes                                                                    |
| ----------------------------- | ---------------- | --------------------------------- | ------------------------------------------------------------------------ |
| `AUTH_SECRET`                 | Yes              | Session signing secret            | Must be non-placeholder and at least 32 chars                            |
| `NEXT_PUBLIC_SITE_URL`        | Yes              | Public site origin                | Must be an absolute `http(s)` origin with no path                        |
| `SMTP_HOST`                   | For registration | Verification mail server          | Use the host provided by the mail provider                               |
| `SMTP_PORT`                   | For registration | SMTP port                         | Normally `465` or `587`                                                  |
| `SMTP_SECURE`                 | For registration | TLS from connection start         | Normally `true` on port `465`                                            |
| `SMTP_REQUIRE_TLS`            | Recommended      | Require STARTTLS                  | Normally `true` on port `587`                                            |
| `SMTP_USER` / `SMTP_PASSWORD` | Production       | SMTP credentials                  | The password is normally an application authorization code               |
| `SMTP_FROM`                   | For registration | Message sender                    | Must be allowed by the SMTP provider                                     |
| `NGINX_PORT`                  | No               | Published HTTP port               | Defaults to `8080`; mission validation uses `8080`                       |
| `WEREAD_API_KEY`              | No               | Official WeRead Skill API key     | Optional; enables `/admin/books` and `npm run sync:weread` sync          |
| `WEREAD_SYNC_PROGRESS_LIMIT`  | No               | Per-sync progress lookup limit    | Defaults to `80`                                                         |
| `WEREAD_SYNC_DETAIL_LIMIT`    | No               | Per-sync book detail lookup limit | Defaults to `80`                                                         |
| `WEREAD_SYNC_HIGHLIGHTS`      | No               | Sync highlight text content       | Defaults to `0`; keep disabled if you only want progress and note counts |

Production safety constraints enforced by `./deploy/check.sh`:

- placeholder or short `AUTH_SECRET` values are rejected
- malformed `NEXT_PUBLIC_SITE_URL` values are rejected
- invalid or privileged `NGINX_PORT` values are rejected

## Reader email registration

Reader accounts use a unified passwordless flow. A first successful email code
verification creates the account; later verifications sign in to it. Codes expire
after ten minutes and only their hashes are persisted.

For local end-to-end testing, point SMTP at `mailpit:1025`, set
`SMTP_SECURE=false` and `SMTP_REQUIRE_TLS=false`, leave SMTP credentials empty,
and start the local inbox:

```bash
docker compose --env-file deploy/.env.production --profile local-mail up -d
```

Open `http://localhost:8025` to read the messages actually sent by the app. The
Mailpit web port is bound to `127.0.0.1` and is not a production mail service.
Production should use an authenticated TLS SMTP provider. Both `/daily` and
`/uploads/daily/` require an active reader or administrator session.

## WeRead bookshelf sync

The public `/books` page reads a local SQLite snapshot. To sync from WeRead:

1. Open [WeRead Skills](https://weread.qq.com/r/weread-skills), sign in, and copy the `wrk-...` API Key.
2. Add `WEREAD_API_KEY=wrk-...` to `deploy/.env.production`.
3. Restart the app with `./deploy/update.sh` or `docker compose --env-file deploy/.env.production up --no-build -d --force-recreate`.
4. Open `/admin/books` and click sync, or run:

```bash
docker compose --env-file deploy/.env.production exec app npm run sync:weread
```

Private WeRead entries are stored with a private flag and excluded from the public bookshelf. Highlight text is not synced unless `WEREAD_SYNC_HIGHLIGHTS=1`.

## First deploy on a new Linux host

From a clean checkout:

```bash
cp deploy/.env.production.example deploy/.env.production
# edit deploy/.env.production with secure values
# Build on a capable machine, or load a previously exported newblog-app image.
docker compose --env-file deploy/.env.production build app
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
```

On a small production server, build the image elsewhere, transfer it with
`docker save` / `docker load`, and then run the three deploy scripts. The
scripts deliberately use `--no-build` so deployment cannot trigger native
dependency compilation on the server.

What these do:

- `check.sh` validates Docker, env values, and persistence paths
- `init.sh` runs `check.sh` and executes migrations inside the prebuilt app image to create/update `data/blog.db`
- `start.sh` refuses to launch if init artifacts are missing, then starts the prebuilt compose stack and waits for readiness

No manual database creation or ad hoc migration command is required on the supported path.

## Health verification after deploy

Verify the stack with these commands:

```bash
set -a; source deploy/.env.production; set +a
curl -i "http://localhost:${NGINX_PORT}/healthz"
curl -i "http://localhost:${NGINX_PORT}/"
curl -i "http://localhost:${NGINX_PORT}/robots.txt"
curl -i "http://localhost:${NGINX_PORT}/sitemap.xml"
curl -i "http://localhost:${NGINX_PORT}/api/admin/session"
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
  Change `NGINX_PORT` to an available port and rerun `./deploy/check.sh`.
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

Update to a prebuilt newer image without erasing persisted content:

```bash
git pull
# Load the matching APP_IMAGE before this step when it was built elsewhere.
./deploy/update.sh
```

`update.sh` reruns initialization and restarts the compose stack with `--no-build` while preserving `./data` and `./public/uploads`.

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

## Administrator access after deploy or restore

Administration uses the same passwordless email-code flow as reader accounts.
Only an active user whose persisted role is `admin` receives an administrator
session. Username/password authentication and its deployment variables are not
supported.

After restoring a backup, administrator access follows the restored `users.role`
and `users.status` values. Ensure SMTP remains correctly configured so an
administrator can receive a new verification code.

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
