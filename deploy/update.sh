#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

"${DEPLOY_DIR}/init.sh"
load_env_file
ensure_runtime_env_paths

require_command docker "Install Docker Engine and Docker Compose plugin before updating the compose stack."
require_command curl "curl is required for deployment health diagnostics."

print_info "Restarting compose stack from the prebuilt ${APP_IMAGE:-newblog-app:local} image without deleting persisted data"
print_info "Forcing service recreation so nginx and app pick up updated runtime configuration"
compose up --no-build -d --force-recreate

if ! wait_for_runtime_health; then
  print_error "Updated deployment failed to become ready."
  print_error "Inspect the stack with 'docker compose --env-file ${DEPLOY_ENV_FILE} ps' and 'docker compose --env-file ${DEPLOY_ENV_FILE} logs app nginx'."
  exit 1
fi

print_info "Updated compose stack is ready on ${DEPLOY_HEALTH_PATH}"
