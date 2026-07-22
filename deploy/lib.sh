#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-${DEPLOY_DIR}/.env.production}"
DEPLOY_ENV_EXAMPLE="${DEPLOY_DIR}/.env.production.example"
DEPLOY_DATA_DIR="${DEPLOY_DATA_DIR:-${REPO_ROOT}/data}"
DEPLOY_UPLOADS_DIR="${DEPLOY_UPLOADS_DIR:-${REPO_ROOT}/public/uploads}"
DEPLOY_UPLOADS_IMAGES_DIR="${DEPLOY_UPLOADS_DIR}/images"
DEPLOY_DB_PATH="${DEPLOY_DB_PATH:-${DEPLOY_DATA_DIR}/blog.db}"
DEPLOY_BACKUP_DIR="${DEPLOY_BACKUP_DIR:-${REPO_ROOT}/data/backups}"
DEPLOY_BACKUP_BASENAME="${DEPLOY_BACKUP_BASENAME:-blog-backup}"
DEPLOY_BACKUP_LABEL="${DEPLOY_BACKUP_LABEL:-$(date -u +%Y%m%dT%H%M%SZ)}"
DEPLOY_BACKUP_STAGING_DIR="${DEPLOY_BACKUP_STAGING_DIR:-${DEPLOY_BACKUP_DIR}/.${DEPLOY_BACKUP_BASENAME}-${DEPLOY_BACKUP_LABEL}.tmp}"
DEPLOY_BACKUP_OUTPUT="${DEPLOY_BACKUP_OUTPUT:-${DEPLOY_BACKUP_DIR}/${DEPLOY_BACKUP_BASENAME}-${DEPLOY_BACKUP_LABEL}.tar.gz}"
DEPLOY_RESTORE_ARCHIVE="${DEPLOY_RESTORE_ARCHIVE:-}"
DEPLOY_HEALTH_PATH="${DEPLOY_HEALTH_PATH:-/healthz}"
DEPLOY_RUNTIME_HEALTH_URL="${DEPLOY_RUNTIME_HEALTH_URL:-}"
DEPLOY_START_TIMEOUT_SECONDS="${DEPLOY_START_TIMEOUT_SECONDS:-90}"

print_info() {
  printf '[deploy] %s\n' "$*"
}

print_error() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
}

require_command() {
  local command_name="$1"
  local hint="$2"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    print_error "Missing prerequisite '${command_name}'. ${hint}"
    return 1
  fi
}

load_env_file() {
  if [[ ! -f "${DEPLOY_ENV_FILE}" ]]; then
    print_error "Deployment environment file not found at ${DEPLOY_ENV_FILE}."
    print_error "Copy ${DEPLOY_ENV_EXAMPLE} to ${DEPLOY_ENV_FILE} and fill in secure values, then rerun ./deploy/check.sh."
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "${DEPLOY_ENV_FILE}"
  set +a
}

ensure_runtime_env_paths() {
  if [[ -z "${DEPLOY_RUNTIME_HEALTH_URL}" && -n "${NGINX_PORT:-}" ]]; then
    DEPLOY_RUNTIME_HEALTH_URL="http://localhost:${NGINX_PORT}${DEPLOY_HEALTH_PATH}"
  fi

  export DEPLOY_ENV_FILE DEPLOY_DATA_DIR DEPLOY_UPLOADS_DIR DEPLOY_UPLOADS_IMAGES_DIR DEPLOY_DB_PATH DEPLOY_BACKUP_DIR DEPLOY_BACKUP_BASENAME DEPLOY_BACKUP_LABEL DEPLOY_BACKUP_STAGING_DIR DEPLOY_BACKUP_OUTPUT DEPLOY_RESTORE_ARCHIVE DEPLOY_HEALTH_PATH DEPLOY_RUNTIME_HEALTH_URL DEPLOY_START_TIMEOUT_SECONDS
}

append_issue() {
  local key="$1"
  local message="$2"
  VALIDATION_ERRORS+=("${key}: ${message}")
}

validate_tcp_port() {
  local key="$1"
  local value="$2"
  if ! [[ "${value}" =~ ^[0-9]+$ ]]; then
    append_issue "${key}" "must be a numeric TCP port"
  elif (( value < 1 || value > 65535 )); then
    append_issue "${key}" "must be between 1 and 65535"
  fi
}

validate_env() {
  VALIDATION_ERRORS=()

  [[ -n "${AUTH_SECRET:-}" ]] || append_issue "AUTH_SECRET" "is required"
  [[ -n "${ADMIN_USERNAME:-}" ]] || append_issue "ADMIN_USERNAME" "is required"
  [[ -n "${ADMIN_PASSWORD:-}" ]] || append_issue "ADMIN_PASSWORD" "is required"
  [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]] || append_issue "NEXT_PUBLIC_SITE_URL" "is required"
  [[ -n "${NGINX_PORT:-}" ]] || append_issue "NGINX_PORT" "is required"
  [[ -n "${NGINX_SSL_PORT:-}" ]] || append_issue "NGINX_SSL_PORT" "is required"

  case "${AUTH_SECRET:-}" in
    change-me-in-production|development-auth-secret|test-auth-secret|"")
      append_issue "AUTH_SECRET" "must be replaced with a secure, non-placeholder secret"
      ;;
  esac

  local auth_secret_length="${#AUTH_SECRET}"
  if [[ -z "${AUTH_SECRET:-}" ]]; then
    auth_secret_length=0
  fi
  if (( auth_secret_length < 32 )); then
    append_issue "AUTH_SECRET" "must be at least 32 characters long"
  fi

  case "${ADMIN_USERNAME:-}" in
    admin|administrator|root|"")
      append_issue "ADMIN_USERNAME" "must not use a weak default username such as 'admin'"
      ;;
  esac

  case "${ADMIN_PASSWORD:-}" in
    admin123|password|changeme|change-me|secret|"")
      append_issue "ADMIN_PASSWORD" "must not use a weak or placeholder password"
      ;;
  esac

  local admin_password_length="${#ADMIN_PASSWORD}"
  if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
    admin_password_length=0
  fi
  if (( admin_password_length < 12 )); then
    append_issue "ADMIN_PASSWORD" "must be at least 12 characters long"
  fi

  validate_tcp_port "NGINX_PORT" "${NGINX_PORT:-}"
  validate_tcp_port "NGINX_SSL_PORT" "${NGINX_SSL_PORT:-}"

  if ! [[ "${NEXT_PUBLIC_SITE_URL:-}" =~ ^https?://[^/?#[:space:]]+/?$ ]]; then
    append_issue "NEXT_PUBLIC_SITE_URL" "must be an absolute http(s) origin without a path"
  fi

  if (( ${#VALIDATION_ERRORS[@]} > 0 )); then
    for issue in "${VALIDATION_ERRORS[@]}"; do
      print_error "${issue}"
    done
    print_error "Correct the deployment environment in ${DEPLOY_ENV_FILE} and rerun ./deploy/check.sh."
    return 1
  fi
}

prepare_persistence_dirs() {
  local created=()
  local existing=()

  local skip_upload_targets=0
  if [[ "${SKIP_UPLOADS_DIR_PREPARE:-0}" == "1" ]]; then
    skip_upload_targets=1
  fi

  local targets=("${DEPLOY_DATA_DIR}")
  if (( skip_upload_targets == 0 )); then
    targets+=("${DEPLOY_UPLOADS_DIR}" "${DEPLOY_UPLOADS_IMAGES_DIR}")
  fi

  for target in "${targets[@]}"; do
    if [[ -d "${target}" ]]; then
      existing+=("${target}")
    else
      mkdir -p "${target}"
      created+=("${target}")
    fi
  done

  if [[ ! -w "${DEPLOY_DATA_DIR}" ]]; then
    print_error "Persistence path ${DEPLOY_DATA_DIR} is not writable."
    return 1
  fi

  if (( skip_upload_targets == 0 )) && [[ ! -w "${DEPLOY_UPLOADS_DIR}" ]]; then
    print_error "Persistence path ${DEPLOY_UPLOADS_DIR} is not writable."
    return 1
  fi

  local backups_root
  backups_root="$(cd "${DEPLOY_BACKUP_DIR}" 2>/dev/null && pwd || true)"
  local data_root
  data_root="$(cd "${DEPLOY_DATA_DIR}" 2>/dev/null && pwd || true)"
  if [[ -n "${backups_root}" && -n "${data_root}" && "${backups_root}" == "${data_root}" ]]; then
    print_info "backup-storage-present-within-data-root: ${DEPLOY_BACKUP_DIR}"
  fi

  if (( ${#created[@]} > 0 )); then
    print_info "created: ${created[*]}"
  fi
  if (( ${#existing[@]} > 0 )); then
    print_info "already-present: ${existing[*]}"
  fi
}

run_migrations() {
  if [[ "${SKIP_DB_MIGRATIONS:-0}" == "1" ]]; then
    print_info "Skipping DB migrations because SKIP_DB_MIGRATIONS=1"
    return 0
  fi

  require_command docker "Install Docker Engine and the Docker Compose plugin before running migrations."
  print_info "Running database migrations inside the prebuilt app image"
  if ! compose run --rm --no-deps app node scripts/run-migrations.js; then
    print_error "Database migration step failed."
    print_error "Load or build ${APP_IMAGE:-newblog-app:local} before running initialization."
    return 1
  fi
}

compose() {
  (cd "${REPO_ROOT}" && docker compose --env-file "${DEPLOY_ENV_FILE}" "$@")
}

require_file() {
  local file_path="$1"
  local message="$2"
  if [[ ! -f "${file_path}" ]]; then
    print_error "${message}"
    return 1
  fi
}

require_directory() {
  local dir_path="$1"
  local message="$2"
  if [[ ! -d "${dir_path}" ]]; then
    print_error "${message}"
    return 1
  fi
}

copy_sqlite_consistent_snapshot() {
  local source_db_path="$1"
  local destination_db_path="$2"

  python3 - "${source_db_path}" "${destination_db_path}" <<'PY'
import sqlite3
import sys
import os
from pathlib import Path

source = Path(sys.argv[1])
destination = Path(sys.argv[2])
destination.parent.mkdir(parents=True, exist_ok=True)

if not source.exists():
    print(f"source database missing: {source}", file=sys.stderr)
    raise SystemExit(1)

if destination.exists():
    destination.unlink()

src_conn = sqlite3.connect(str(source))
try:
    if hasattr(src_conn, "backup") and os.environ.get("DEPLOY_FORCE_SQLITE_DUMP") != "1":
        dest_conn = sqlite3.connect(str(destination))
        try:
            src_conn.backup(dest_conn)
        finally:
            dest_conn.close()
    else:
        # Python 3.6 lacks Connection.backup(). Hold a read transaction so
        # iterdump observes one WAL snapshot while rebuilding the destination.
        src_conn.execute("BEGIN")
        dest_conn = sqlite3.connect(str(destination))
        try:
            for statement in src_conn.iterdump():
                dest_conn.execute(statement)
        finally:
            dest_conn.close()
            src_conn.rollback()
finally:
    src_conn.close()

check_conn = sqlite3.connect(str(destination))
try:
    result = check_conn.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok":
        raise RuntimeError("SQLite snapshot integrity check failed")
finally:
    check_conn.close()
PY
}

wait_for_runtime_health() {
  local timeout_seconds="${1:-${DEPLOY_START_TIMEOUT_SECONDS}}"
  local started_at
  started_at="$(date +%s)"

  print_info "Waiting for readiness probe ${DEPLOY_RUNTIME_HEALTH_URL} (timeout: ${timeout_seconds}s)"

  while true; do
    if curl -fsS --max-time 5 "${DEPLOY_RUNTIME_HEALTH_URL}" >/tmp/blog-runtime-health.$$ 2>/tmp/blog-runtime-health-error.$$; then
      local body
      body="$(cat /tmp/blog-runtime-health.$$)"
      rm -f /tmp/blog-runtime-health.$$ /tmp/blog-runtime-health-error.$$
      print_info "Readiness probe passed: ${body}"
      return 0
    fi

    local now
    now="$(date +%s)"
    if (( now - started_at >= timeout_seconds )); then
      local curl_error=""
      if [[ -f /tmp/blog-runtime-health-error.$$ ]]; then
        curl_error="$(cat /tmp/blog-runtime-health-error.$$)"
      fi
      rm -f /tmp/blog-runtime-health.$$ /tmp/blog-runtime-health-error.$$
      print_error "Timed out waiting for readiness probe ${DEPLOY_RUNTIME_HEALTH_URL} after ${timeout_seconds}s."
      if [[ -n "${curl_error}" ]]; then
        print_error "Last probe error: ${curl_error}"
      fi
      return 1
    fi

    sleep 2
  done
}
