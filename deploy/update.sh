#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

"${DEPLOY_DIR}/init.sh"

print_info "Rebuilding and restarting compose stack without deleting persisted data"
compose up --build -d
