import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "@/lib/db/schema";
import { posts } from "@/lib/db/schema";
import {
  createSlug,
  getPublishedPostBySlug,
  getPublishedPosts,
  resolveDuplicateSlug,
} from "@/lib/posts";
import { renderMarkdownToHtml } from "@/lib/markdown";

describe("post slug helpers", () => {
  it("creates url-safe slugs from titles", () => {
    expect(createSlug("Hello, World! 你好")).toBe("hello-world");
    expect(createSlug("  already-slugged  ")).toBe("already-slugged");
  });

  it("appends numeric suffix for duplicate slugs", () => {
    expect(resolveDuplicateSlug("my-post", ["my-post"])).toBe("my-post-1");
    expect(resolveDuplicateSlug("my-post", ["my-post", "my-post-1"])).toBe(
      "my-post-2"
    );
  });
});

describe("markdown sanitation", () => {
  it("renders markdown while stripping executable script tags", async () => {
    const html = await renderMarkdownToHtml(
      "# Hello\n\n**bold**\n\n<script>alert('xss')</script>"
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).not.toContain("<script");
  });
});

describe("public post visibility", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-post-feature-test-"));
    dbPath = path.join(tempDir, "post-feature.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });

    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns only published posts in public listing and detail lookup", async () => {
    const now = new Date().toISOString();
    testDb
      .insert(posts)
      .values([
        {
          title: "Published post",
          slug: "published-post",
          content: "hello",
          excerpt: "excerpt",
          status: "published",
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Draft post",
          slug: "draft-post",
          content: "hidden",
          status: "draft",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();

    const database = testDb as unknown as Parameters<typeof getPublishedPosts>[0];
    const published = await getPublishedPosts(database);
    expect(published.map((post) => post.slug)).toEqual(["published-post"]);

    const publishedPost = await getPublishedPostBySlug("published-post", database);
    const draftPost = await getPublishedPostBySlug("draft-post", database);
    expect(publishedPost?.title).toBe("Published post");
    expect(draftPost).toBeNull();
  });
});
