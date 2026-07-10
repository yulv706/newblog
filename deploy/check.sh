#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

ensure_runtime_env_paths

load_env_file
ensure_runtime_env_paths
validate_env
prepare_persistence_dirs

print_info "Deployment preflight passed using ${DEPLOY_ENV_FILE}"
