#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

export SKIP_UPLOADS_DIR_PREPARE=1
"${DEPLOY_DIR}/check.sh"

if [[ -z "${DEPLOY_RESTORE_ARCHIVE}" ]]; then
  print_error "DEPLOY_RESTORE_ARCHIVE is required. Point it to a backup archive created by ./deploy/backup.sh."
  exit 1
fi

require_file "${DEPLOY_RESTORE_ARCHIVE}" "Restore archive ${DEPLOY_RESTORE_ARCHIVE} does not exist."

rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"
mkdir -p "${DEPLOY_BACKUP_STAGING_DIR}"

print_info "Extracting restore archive ${DEPLOY_RESTORE_ARCHIVE}"
tar -C "${DEPLOY_BACKUP_STAGING_DIR}" -xzf "${DEPLOY_RESTORE_ARCHIVE}"

require_file "${DEPLOY_BACKUP_STAGING_DIR}/backup-manifest.txt" "Restore archive is missing backup-manifest.txt and cannot be trusted."
require_file "${DEPLOY_BACKUP_STAGING_DIR}/data/blog.db" "Restore archive is missing data/blog.db and cannot restore database state."
require_directory "${DEPLOY_BACKUP_STAGING_DIR}/public/uploads" "Restore archive is missing public/uploads and cannot restore uploaded media."

mkdir -p "${DEPLOY_DATA_DIR}"
mkdir -p "$(dirname "${DEPLOY_UPLOADS_DIR}")"
mkdir -p "${DEPLOY_UPLOADS_DIR}"

backup_dir_inside_data_root=0
case "${DEPLOY_BACKUP_DIR}" in
  "${DEPLOY_DATA_DIR}"|${DEPLOY_DATA_DIR}/*)
    backup_dir_inside_data_root=1
    ;;
esac

data_entries=()
while IFS= read -r entry; do
  data_entries+=("${entry}")
done < <(find "${DEPLOY_DATA_DIR}" -mindepth 1 -maxdepth 1 -print)

for entry in "${data_entries[@]}"; do
  if (( backup_dir_inside_data_root == 1 )) && [[ "${entry}" == "${DEPLOY_BACKUP_DIR}" ]]; then
    continue
  fi
  print_error "Restore target ${DEPLOY_DATA_DIR} is not empty. Restore only supports an empty workspace to avoid overwriting existing persisted data."
  rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"
  exit 1
done

if find "${DEPLOY_UPLOADS_DIR}" -mindepth 1 -print -quit | grep -q .; then
  print_error "Restore target ${DEPLOY_UPLOADS_DIR} is not empty. Remove existing uploads before restoring."
  rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"
  exit 1
fi

rm -rf "${DEPLOY_UPLOADS_DIR}"

print_info "Restoring database into ${DEPLOY_DB_PATH}"
cp "${DEPLOY_BACKUP_STAGING_DIR}/data/blog.db" "${DEPLOY_DB_PATH}"
chmod 600 "${DEPLOY_DB_PATH}" || true

print_info "Restoring uploads into ${DEPLOY_UPLOADS_DIR}"
cp -a "${DEPLOY_BACKUP_STAGING_DIR}/public/uploads" "${DEPLOY_UPLOADS_DIR}"

rm -rf "${DEPLOY_BACKUP_STAGING_DIR}"

print_info "Restore completed. Run ./deploy/start.sh to boot the restored site."
