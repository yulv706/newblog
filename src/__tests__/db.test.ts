import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import path from "path";

describe("database", () => {
  it("connects to SQLite and has all required tables", () => {
    const dbPath = path.join(process.cwd(), "data", "blog.db");
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });

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

    sqlite.close();

    // Ensure db variable is used
    expect(db).toBeDefined();
  });

  it("has WAL mode enabled", () => {
    const dbPath = path.join(process.cwd(), "data", "blog.db");
    const sqlite = new Database(dbPath);
    const result = sqlite.pragma("journal_mode") as { journal_mode: string }[];
    expect(result[0].journal_mode).toBe("wal");
    sqlite.close();
  });

  it("has seed data", () => {
    const dbPath = path.join(process.cwd(), "data", "blog.db");
    const sqlite = new Database(dbPath);

    const postCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM posts").get() as {
      cnt: number;
    };
    expect(postCount.cnt).toBeGreaterThanOrEqual(5);

    const catCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM categories").get() as {
      cnt: number;
    };
    expect(catCount.cnt).toBeGreaterThanOrEqual(2);

    const tagCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM tags").get() as {
      cnt: number;
    };
    expect(tagCount.cnt).toBeGreaterThanOrEqual(5);

    const commentCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM comments").get() as {
      cnt: number;
    };
    expect(commentCount.cnt).toBeGreaterThanOrEqual(3);

    sqlite.close();
  });
});
