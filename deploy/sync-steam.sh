#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

LOCK_FILE="${STEAM_SYNC_LOCK_FILE:-/run/lock/newblog-steam-sync.lock}"
TIMEOUT_SECONDS="${STEAM_SYNC_TIMEOUT_SECONDS:-300}"

require_command docker "Install Docker Engine and the Docker Compose plugin before scheduling Steam sync."
require_command flock "Install util-linux before scheduling Steam sync."
require_command timeout "Install GNU coreutils before scheduling Steam sync."
load_env_file

if [[ -z "${STEAM_WEB_API_KEY:-}" || -z "${STEAM_ID64:-}" ]]; then
  print_error "Steam sync requires both STEAM_WEB_API_KEY and STEAM_ID64 in ${DEPLOY_ENV_FILE}."
  exit 1
fi

if ! [[ "${TIMEOUT_SECONDS}" =~ ^[1-9][0-9]*$ ]]; then
  print_error "STEAM_SYNC_TIMEOUT_SECONDS must be a positive integer."
  exit 1
fi

mkdir -p "$(dirname "${LOCK_FILE}")"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  print_info "A Steam sync is already running; skipping this invocation."
  exit 0
fi

if [[ "$(docker inspect --format '{{.State.Health.Status}}' blog-app 2>/dev/null || true)" != "healthy" ]]; then
  print_error "blog-app is not healthy; refusing to run the scheduled Steam sync."
  exit 1
fi

print_info "Starting scheduled Steam sync"
timeout --signal=TERM --kill-after=30 "${TIMEOUT_SECONDS}" \
  docker compose --env-file "${DEPLOY_ENV_FILE}" \
  --project-directory "${REPO_ROOT}" \
  exec -T app npm run sync:steam
print_info "Scheduled Steam sync completed"
