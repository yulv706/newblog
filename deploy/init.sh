#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

"${DEPLOY_DIR}/check.sh"
run_migrations

if [[ ! -f "${DEPLOY_DB_PATH}" ]]; then
  print_error "Expected database file ${DEPLOY_DB_PATH} was not created during initialization."
  print_error "The migration step must create the SQLite database before startup."
  exit 1
fi

print_info "Initialization complete"
