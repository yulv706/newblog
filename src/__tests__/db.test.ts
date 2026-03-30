import { beforeAll, afterAll, describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import fs from "fs";
import os from "os";
import path from "path";

describe("database", () => {
  let testDbDir = "";
  let testDbPath = "";
  let sqlite: InstanceType<typeof Database>;

  beforeAll(() => {
    testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-db-test-"));
    testDbPath = path.join(testDbDir, "blog.test.db");
    sqlite = new Database(testDbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema });
    migrate(db, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });

    const now = new Date().toISOString();
    const categoryInsert = sqlite
      .prepare(
        "INSERT INTO categories (name, slug, created_at) VALUES (?, ?, ?)"
      )
      .run("Test Category", "test-category", now);
    const categoryId = Number(categoryInsert.lastInsertRowid);

    const tagInsert = sqlite
      .prepare("INSERT INTO tags (name, slug, created_at) VALUES (?, ?, ?)")
      .run("Test Tag", "test-tag", now);
    const tagId = Number(tagInsert.lastInsertRowid);

    const postInsert = sqlite
      .prepare(
        `INSERT INTO posts (
          title, slug, content, excerpt, cover_image, status, category_id, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "Test Post",
        "test-post",
        "# Test content",
        "Test excerpt",
        null,
        "published",
        categoryId,
        now,
        now,
        now
      );
    const postId = Number(postInsert.lastInsertRowid);

    sqlite
      .prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)")
      .run(postId, tagId);

    sqlite
      .prepare(
        "INSERT INTO comments (post_id, nickname, email, body, approved, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(postId, "Test User", "test@example.com", "Test comment", 1, now);

    sqlite
      .prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)")
      .run("admin_password_hash", "dummy-hash", now);
  });

  afterAll(() => {
    sqlite.close();

    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${testDbPath}${suffix}`, { force: true });
    }
    fs.rmSync(testDbDir, { recursive: true, force: true });
  });

  it("connects to isolated SQLite and has all required tables", () => {
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("posts");
    expect(tableNames).toContain("categories");
    expect(tableNames).toContain("tags");
    expect(tableNames).toContain("post_tags");
    expect(tableNames).toContain("comments");
    expect(tableNames).toContain("site_settings");
    expect(testDbPath).not.toBe(path.join(process.cwd(), "data", "blog.db"));
  });

  it("has WAL mode enabled on the isolated test database", () => {
    const result = sqlite.pragma("journal_mode") as { journal_mode: string }[];
    expect(result[0].journal_mode).toBe("wal");
  });

  it("has deterministic test fixture data", () => {
    const postCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM posts").get() as {
      cnt: number;
    };
    expect(postCount.cnt).toBe(1);

    const catCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM categories").get() as {
      cnt: number;
    };
    expect(catCount.cnt).toBe(1);

    const tagCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM tags").get() as {
      cnt: number;
    };
    expect(tagCount.cnt).toBe(1);

    const commentCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM comments").get() as {
      cnt: number;
    };
    expect(commentCount.cnt).toBe(1);
  });
});
