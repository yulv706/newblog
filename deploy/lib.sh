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
DEPLOY_RUNTIME_HEALTH_URL="${DEPLOY_RUNTIME_HEALTH_URL:-http://localhost:${NGINX_PORT:-8080}/healthz}"

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
  export DEPLOY_ENV_FILE DEPLOY_DATA_DIR DEPLOY_UPLOADS_DIR DEPLOY_UPLOADS_IMAGES_DIR DEPLOY_DB_PATH
}

append_issue() {
  local key="$1"
  local message="$2"
  VALIDATION_ERRORS+=("${key}: ${message}")
}

validate_env() {
  VALIDATION_ERRORS=()

  [[ -n "${AUTH_SECRET:-}" ]] || append_issue "AUTH_SECRET" "is required"
  [[ -n "${ADMIN_USERNAME:-}" ]] || append_issue "ADMIN_USERNAME" "is required"
  [[ -n "${ADMIN_PASSWORD:-}" ]] || append_issue "ADMIN_PASSWORD" "is required"
  [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]] || append_issue "NEXT_PUBLIC_SITE_URL" "is required"
  [[ -n "${NGINX_PORT:-}" ]] || append_issue "NGINX_PORT" "is required"

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

  if ! [[ "${NGINX_PORT:-}" =~ ^[0-9]+$ ]]; then
    append_issue "NGINX_PORT" "must be a numeric TCP port"
  elif (( NGINX_PORT < 1024 || NGINX_PORT > 65535 )); then
    append_issue "NGINX_PORT" "must be between 1024 and 65535"
  fi

  if ! python3 - <<'PY' >/dev/null 2>&1
import os, sys
from urllib.parse import urlparse
value = os.environ.get("NEXT_PUBLIC_SITE_URL", "").strip()
parsed = urlparse(value)
if parsed.scheme not in {"http", "https"}:
    sys.exit(1)
if not parsed.netloc:
    sys.exit(1)
if parsed.path not in {"", "/"}:
    sys.exit(1)
sys.exit(0)
PY
  then
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

validate_native_dependencies() {
  if ! node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1; then
    print_error "Native dependency better-sqlite3 is unusable with the current Node runtime."
    print_error "Run 'npm rebuild better-sqlite3 --update-binary' (or reinstall dependencies with the supported Node version) before deployment."
    return 1
  fi
}

prepare_persistence_dirs() {
  local created=()
  local existing=()

  for target in "${DEPLOY_DATA_DIR}" "${DEPLOY_UPLOADS_DIR}" "${DEPLOY_UPLOADS_IMAGES_DIR}"; do
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

  if [[ ! -w "${DEPLOY_UPLOADS_DIR}" ]]; then
    print_error "Persistence path ${DEPLOY_UPLOADS_DIR} is not writable."
    return 1
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

  print_info "Running database migrations"
  if ! (cd "${REPO_ROOT}" && node scripts/run-migrations.js); then
    print_error "Database migration step failed."
    return 1
  fi
}

compose() {
  (cd "${REPO_ROOT}" && docker compose "$@")
}
