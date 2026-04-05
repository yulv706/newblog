#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

"${DEPLOY_DIR}/check.sh"

if [[ ! -f "${DEPLOY_DB_PATH}" ]]; then
  print_error "Database file ${DEPLOY_DB_PATH} is missing."
  print_error "Run ./deploy/init.sh before ./deploy/start.sh."
  exit 1
fi

if [[ ! -w "${DEPLOY_DATA_DIR}" || ! -w "${DEPLOY_UPLOADS_DIR}" ]]; then
  print_error "Persistence paths are not writable."
  print_error "Run ./deploy/check.sh to diagnose the persistence root before starting the stack."
  exit 1
fi

print_info "Starting compose stack"
compose up --build -d

if ! wait_for_runtime_health; then
  print_error "Deployment failed to become ready."
  print_error "Inspect the stack with 'docker compose --env-file ${DEPLOY_ENV_FILE} ps' and 'docker compose --env-file ${DEPLOY_ENV_FILE} logs app nginx'."
  exit 1
fi

print_info "Compose stack is running and readiness-gated on ${DEPLOY_HEALTH_PATH}"
