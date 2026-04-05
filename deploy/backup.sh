#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

"${DEPLOY_DIR}/check.sh"

require_file "${DEPLOY_DB_PATH}" "Cannot create backup because database file ${DEPLOY_DB_PATH} is missing."
require_directory "${DEPLOY_UPLOADS_DIR}" "Cannot create backup because uploads directory ${DEPLOY_UPLOADS_DIR} is missing."

mkdir -p "${DEPLOY_BACKUP_DIR}"
rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"
mkdir -p "${DEPLOY_BACKUP_STAGING_DIR}/data" "${DEPLOY_BACKUP_STAGING_DIR}/public"

print_info "Capturing SQLite-consistent snapshot from ${DEPLOY_DB_PATH}"
copy_sqlite_consistent_snapshot "${DEPLOY_DB_PATH}" "${DEPLOY_BACKUP_STAGING_DIR}/data/blog.db"

for suffix in -wal -shm; do
  staged_file="${DEPLOY_BACKUP_STAGING_DIR}/data/blog.db${suffix}"
  if [[ -e "${staged_file}" ]]; then
    rm -f "${staged_file}"
  fi
done

print_info "Copying uploads from ${DEPLOY_UPLOADS_DIR}"
cp -a "${DEPLOY_UPLOADS_DIR}" "${DEPLOY_BACKUP_STAGING_DIR}/public/uploads"

print_info "Writing backup manifest"
cat >"${DEPLOY_BACKUP_STAGING_DIR}/backup-manifest.txt" <<EOF
backup_label=${DEPLOY_BACKUP_LABEL}
created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
database_path=data/blog.db
uploads_path=public/uploads
EOF

tar -C "${DEPLOY_BACKUP_STAGING_DIR}" -czf "${DEPLOY_BACKUP_OUTPUT}" .
rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"

print_info "Backup created at ${DEPLOY_BACKUP_OUTPUT}"
