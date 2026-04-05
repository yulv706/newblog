import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const repoRoot = process.cwd();
const deployDir = path.join(repoRoot, "deploy");
const envExamplePath = path.join(deployDir, ".env.production.example");
const composePath = path.join(repoRoot, "docker-compose.yml");
const dockerfilePath = path.join(repoRoot, "Dockerfile");
const nginxConfigPath = path.join(repoRoot, "nginx", "default.conf");

const createdDirs: string[] = [];

function makeTempDir() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "blog-deploy-test-"));
  createdDirs.push(tempDir);
  return tempDir;
}

function runScript(
  scriptName: string,
  args: string[],
  env: Record<string, string>,
  cwd = repoRoot
) {
  return spawnSync(path.join(deployDir, scriptName), args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe("canonical deployment entrypoints", () => {
  it("ships canonical repo entrypoints and aligns compose/docker env sourcing", () => {
    const example = readFileSync(envExamplePath, "utf8");
    const compose = readFileSync(composePath, "utf8");
    const dockerfile = readFileSync(dockerfilePath, "utf8");
    const nginxConfig = readFileSync(nginxConfigPath, "utf8");

    expect(example).toContain("AUTH_SECRET=");
    expect(example).toContain("ADMIN_USERNAME=");
    expect(example).toContain("ADMIN_PASSWORD=");
    expect(example).toContain("NEXT_PUBLIC_SITE_URL=");
    expect(example).toContain("NGINX_PORT=");

    expect(compose).toContain("env_file:");
    expect(compose).toContain("- ./deploy/.env.production");
    expect(compose).toContain("${AUTH_SECRET}");
    expect(compose).not.toContain("change-me-in-production");
    expect(compose).not.toContain("admin123");
    expect(compose).toContain("curl -fsS http://localhost:3000/healthz");

    expect(dockerfile).toContain("HEALTHCHECK");
    expect(nginxConfig).toContain("location = /healthz");
    expect(readFileSync(path.join(deployDir, "lib.sh"), "utf8")).toContain(
      'docker compose --env-file "${DEPLOY_ENV_FILE}"'
    );
    expect(readFileSync(path.join(deployDir, "start.sh"), "utf8")).toContain(
      "wait_for_runtime_health"
    );
    expect(readFileSync(path.join(deployDir, "backup.sh"), "utf8")).toContain(
      "copy_sqlite_consistent_snapshot"
    );
    expect(readFileSync(path.join(deployDir, "restore.sh"), "utf8")).toContain(
      "DEPLOY_RESTORE_ARCHIVE"
    );
  });

  it("check reports every invalid env key in one run and exits before startup", () => {
    const tempDir = makeTempDir();
    mkdirSync(path.join(tempDir, "deploy"), { recursive: true });
    writeFileSync(
      path.join(tempDir, "deploy", ".env.production"),
      [
        "AUTH_SECRET=change-me-in-production",
        "ADMIN_USERNAME=administrator",
        "ADMIN_PASSWORD=admin123",
        "NEXT_PUBLIC_SITE_URL=localhost:8080",
        "NGINX_PORT=70000",
      ].join("\n")
    );

    const result = runScript(
      "check.sh",
      [],
      {
        DEPLOY_ENV_FILE: path.join(tempDir, "deploy", ".env.production"),
        DEPLOY_DATA_DIR: path.join(tempDir, "data"),
        DEPLOY_UPLOADS_DIR: path.join(tempDir, "public", "uploads"),
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("AUTH_SECRET");
    expect(result.stderr).toContain("ADMIN_USERNAME");
    expect(result.stderr).toContain("ADMIN_PASSWORD");
    expect(result.stderr).toContain("NEXT_PUBLIC_SITE_URL");
    expect(result.stderr).toContain("NGINX_PORT");
    expect(result.stderr).toContain("Correct the deployment environment");
  });

  it("init is idempotent and preserves existing persistence contents", () => {
    const tempDir = makeTempDir();
    const envFile = path.join(tempDir, "deploy", ".env.production");
    const dataDir = path.join(tempDir, "data");
    const uploadsDir = path.join(tempDir, "public", "uploads");
    mkdirSync(path.dirname(envFile), { recursive: true });
    writeFileSync(
      envFile,
      [
        "AUTH_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef",
        "ADMIN_USERNAME=operator",
        "ADMIN_PASSWORD=StrongerPassword!234",
        "NEXT_PUBLIC_SITE_URL=http://example.com",
        "NGINX_PORT=8080",
      ].join("\n")
    );

    const first = runScript(
      "init.sh",
      [],
      {
        DEPLOY_ENV_FILE: envFile,
        DEPLOY_DATA_DIR: dataDir,
        DEPLOY_UPLOADS_DIR: uploadsDir,
        SKIP_DB_MIGRATIONS: "1",
      }
    );
    expect(first.status).toBe(1);
    expect(first.stdout).toContain("created:");
    expect(first.stderr).toContain("Expected database file");

    writeFileSync(path.join(uploadsDir, "images", "keep.txt"), "preserve-me");

    const second = runScript(
      "init.sh",
      [],
      {
        DEPLOY_ENV_FILE: envFile,
        DEPLOY_DATA_DIR: dataDir,
        DEPLOY_UPLOADS_DIR: uploadsDir,
        SKIP_DB_MIGRATIONS: "1",
      }
    );

    expect(second.status).toBe(1);
    expect(second.stdout).toContain("already-present:");
    expect(readFileSync(path.join(uploadsDir, "images", "keep.txt"), "utf8")).toBe("preserve-me");
  });

  it("backup captures a restorable sqlite snapshot plus uploads and restore fails loudly on bad inputs", () => {
    const tempDir = makeTempDir();
    const envFile = path.join(tempDir, "deploy", ".env.production");
    const dataDir = path.join(tempDir, "data");
    const uploadsDir = path.join(tempDir, "public", "uploads");
    const backupDir = path.join(tempDir, "backups");
    const stagingDbPath = path.join(dataDir, "blog.db");
    mkdirSync(path.dirname(envFile), { recursive: true });
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
    writeFileSync(
      envFile,
      [
        "AUTH_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef",
        "ADMIN_USERNAME=operator-user",
        "ADMIN_PASSWORD=StrongerPassword!234",
        "NEXT_PUBLIC_SITE_URL=http://example.com",
        "NGINX_PORT=8080",
      ].join("\n")
    );

    const sqlite = new Database(stagingDbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(
      "CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, title TEXT NOT NULL);" +
        "INSERT INTO posts (slug, title) VALUES ('recent-write', 'Recent Write');"
    );
    sqlite.close();

    writeFileSync(path.join(uploadsDir, "images", "proof.txt"), "upload-proof");

    const backup = runScript("backup.sh", [], {
      DEPLOY_ENV_FILE: envFile,
      DEPLOY_DATA_DIR: dataDir,
      DEPLOY_UPLOADS_DIR: uploadsDir,
      DEPLOY_BACKUP_DIR: backupDir,
    });

    expect(backup.status).toBe(0);
    expect(backup.stdout).toContain("Backup created at");
    const createdArchive = backup.stdout
      .split("\n")
      .find((line) => line.includes("Backup created at"))!
      .split("Backup created at ")[1]
      .trim();
    expect(existsSync(createdArchive)).toBe(true);

    rmSync(dataDir, { recursive: true, force: true });
    rmSync(uploadsDir, { recursive: true, force: true });
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(uploadsDir, { recursive: true });

    const restore = runScript("restore.sh", [], {
      DEPLOY_ENV_FILE: envFile,
      DEPLOY_DATA_DIR: path.join(tempDir, "restored-data"),
      DEPLOY_UPLOADS_DIR: path.join(tempDir, "restored-public-assets", "uploads"),
      DEPLOY_BACKUP_DIR: backupDir,
      DEPLOY_RESTORE_ARCHIVE: createdArchive,
    });

    expect(restore.status, `stdout: ${restore.stdout}\nstderr: ${restore.stderr}`).toBe(0);
    const restoredUploadsDir = path.join(tempDir, "restored-public-assets", "uploads");
    const restoredDataDir = path.join(tempDir, "restored-data");
    expect(readFileSync(path.join(restoredUploadsDir, "images", "proof.txt"), "utf8")).toBe(
      "upload-proof"
    );

    const restoredDb = new Database(path.join(restoredDataDir, "blog.db"), { readonly: true });
    const restoredRows = restoredDb
      .prepare("SELECT slug, title FROM posts WHERE slug = 'recent-write'")
      .all();
    restoredDb.close();
    expect(restoredRows).toEqual([{ slug: "recent-write", title: "Recent Write" }]);

    const missingArchive = runScript("restore.sh", [], {
      DEPLOY_ENV_FILE: envFile,
      DEPLOY_DATA_DIR: path.join(tempDir, "missing-data"),
      DEPLOY_UPLOADS_DIR: path.join(tempDir, "missing-uploads"),
      DEPLOY_BACKUP_DIR: backupDir,
      DEPLOY_RESTORE_ARCHIVE: path.join(tempDir, "does-not-exist.tar.gz"),
    });
    expect(missingArchive.status).not.toBe(0);
    expect(missingArchive.stderr).toContain("does not exist");

    const backupMissingUploads = runScript("backup.sh", [], {
      DEPLOY_ENV_FILE: envFile,
      DEPLOY_DATA_DIR: restoredDataDir,
      DEPLOY_UPLOADS_DIR: path.join(tempDir, "missing-uploads-dir"),
      DEPLOY_BACKUP_DIR: backupDir,
      SKIP_UPLOADS_DIR_PREPARE: "1",
    });
    expect(backupMissingUploads.status).not.toBe(0);
    expect(backupMissingUploads.stderr).toContain("uploads directory");
  });

  it("restore refuses to overwrite a populated workspace", () => {
    const tempDir = makeTempDir();
    const envFile = path.join(tempDir, "deploy", ".env.production");
    const dataDir = path.join(tempDir, "data");
    const uploadsDir = path.join(tempDir, "public", "uploads");
    const archiveDir = path.join(tempDir, "archive");
    mkdirSync(path.dirname(envFile), { recursive: true });
    mkdirSync(path.join(archiveDir, "data"), { recursive: true });
    mkdirSync(path.join(archiveDir, "public", "uploads", "images"), { recursive: true });
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
    writeFileSync(
      envFile,
      [
        "AUTH_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef",
        "ADMIN_USERNAME=operator-user",
        "ADMIN_PASSWORD=StrongerPassword!234",
        "NEXT_PUBLIC_SITE_URL=http://example.com",
        "NGINX_PORT=8080",
      ].join("\n")
    );
    writeFileSync(path.join(archiveDir, "backup-manifest.txt"), "ok");
    writeFileSync(path.join(archiveDir, "data", "blog.db"), "sqlite");
    writeFileSync(path.join(archiveDir, "public", "uploads", "images", "proof.txt"), "asset");
    writeFileSync(path.join(dataDir, "keep.db"), "existing");

    const archivePath = path.join(tempDir, "fixture.tar.gz");
    const tarResult = spawnSync(
      "tar",
      ["-C", archiveDir, "-czf", archivePath, "."],
      { encoding: "utf8" }
    );
    expect(tarResult.status).toBe(0);

    const restore = runScript("restore.sh", [], {
      DEPLOY_ENV_FILE: envFile,
      DEPLOY_DATA_DIR: dataDir,
      DEPLOY_UPLOADS_DIR: uploadsDir,
      DEPLOY_RESTORE_ARCHIVE: archivePath,
    });

    expect(restore.status).not.toBe(0);
    expect(restore.stderr).toContain("is not empty");
    expect(readFileSync(path.join(dataDir, "keep.db"), "utf8")).toBe("existing");
  });
});
