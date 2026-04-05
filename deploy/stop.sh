#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

load_env_file
ensure_runtime_env_paths

print_info "Stopping compose stack"
compose down --remove-orphans
