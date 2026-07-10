#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

load_env_file
ensure_runtime_env_paths

require_command docker "Install Docker Engine and Docker Compose plugin before stopping the compose stack."

print_info "Stopping compose stack"
compose down --remove-orphans
