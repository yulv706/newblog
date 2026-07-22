import Database from "better-sqlite3";
import fs from "node:fs/promises";
import path from "node:path";

const DATABASE_PATH = path.join(process.cwd(), "data", "blog.db");
const BACKUP_DIRECTORY = path.join(process.cwd(), "data", "backups", "management");
const BACKUP_RETENTION = 12;

function sanitizeLabel(value?: string | null) {
  const label = value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return label?.slice(0, 40) || "snapshot";
}

export async function listManagementBackups() {
  await fs.mkdir(BACKUP_DIRECTORY, { recursive: true });
  const names = (await fs.readdir(BACKUP_DIRECTORY)).filter((name) => /^management-.+\.db$/.test(name));
  const rows = await Promise.all(
    names.map(async (name) => {
      const stat = await fs.stat(path.join(BACKUP_DIRECTORY, name));
      return {
        name,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
  );
  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createManagementBackup(label?: string | null) {
  await fs.mkdir(BACKUP_DIRECTORY, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `management-${timestamp}-${sanitizeLabel(label)}.db`;
  const destination = path.join(BACKUP_DIRECTORY, name);
  const source = new Database(DATABASE_PATH, { readonly: true, fileMustExist: true });

  try {
    await source.backup(destination);
  } finally {
    source.close();
  }

  const backups = await listManagementBackups();
  await Promise.all(
    backups.slice(BACKUP_RETENTION).map((backup) =>
      fs.rm(path.join(BACKUP_DIRECTORY, backup.name), { force: true })
    )
  );

  const stat = await fs.stat(destination);
  return {
    name,
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
  };
}
