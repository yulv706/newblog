#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

ensure_runtime_env_paths

require_command docker "Install Docker Engine and Docker Compose plugin before running deployment commands."
require_command node "Install the supported Node.js runtime before running deployment commands."
require_command npm "Install npm alongside Node.js before running deployment commands."
require_command python3 "python3 is required for public URL validation."
require_command curl "curl is required for deployment health diagnostics."

load_env_file
ensure_runtime_env_paths
validate_env
validate_native_dependencies
prepare_persistence_dirs

print_info "Deployment preflight passed using ${DEPLOY_ENV_FILE}"
