import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { posts } from "@/lib/db/schema";
import { searchPublishedPosts } from "@/lib/posts";

describe("blog search", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-search-test-"));
    dbPath = path.join(tempDir, "search.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });

    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  beforeEach(() => {
    testDb.delete(posts).run();
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("matches published posts by title or body content", async () => {
    testDb
      .insert(posts)
      .values([
        {
          title: "Search in Next.js",
          slug: "search-nextjs",
          content: "This post explains route segment config.",
          excerpt: "Search basics",
          status: "published",
          createdAt: "2026-03-29T10:00:00.000Z",
          updatedAt: "2026-03-29T10:00:00.000Z",
          publishedAt: "2026-03-29T10:00:00.000Z",
        },
        {
          title: "Rendering patterns",
          slug: "rendering-patterns",
          content: "You can add a server side keyword search over markdown content.",
          status: "published",
          createdAt: "2026-03-28T10:00:00.000Z",
          updatedAt: "2026-03-28T10:00:00.000Z",
          publishedAt: "2026-03-28T10:00:00.000Z",
        },
        {
          title: "Search draft",
          slug: "search-draft",
          content: "Draft content that should never appear.",
          status: "draft",
          createdAt: "2026-03-30T10:00:00.000Z",
          updatedAt: "2026-03-30T10:00:00.000Z",
        },
      ])
      .run();

    const result = await searchPublishedPosts(
      "search",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );

    expect(result.results.map((post) => post.slug)).toEqual([
      "search-nextjs",
      "rendering-patterns",
    ]);
  });

  it("supports Chinese keyword matching for title and body content", async () => {
    testDb
      .insert(posts)
      .values([
        {
          title: "深入理解 React Server Components",
          slug: "rsc-deep-dive",
          content: "本文介绍服务端渲染和流式传输的实践。",
          status: "published",
          createdAt: "2026-03-29T10:00:00.000Z",
          updatedAt: "2026-03-29T10:00:00.000Z",
          publishedAt: "2026-03-29T10:00:00.000Z",
        },
        {
          title: "Tailwind 新特性",
          slug: "tailwind-v4",
          content: "这里没有相关关键词。",
          status: "published",
          createdAt: "2026-03-28T10:00:00.000Z",
          updatedAt: "2026-03-28T10:00:00.000Z",
          publishedAt: "2026-03-28T10:00:00.000Z",
        },
      ])
      .run();

    const byTitle = await searchPublishedPosts(
      "深入理解",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    const byContent = await searchPublishedPosts(
      "服务端渲染",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );

    expect(byTitle.results.map((post) => post.slug)).toEqual(["rsc-deep-dive"]);
    expect(byContent.results.map((post) => post.slug)).toEqual(["rsc-deep-dive"]);
  });

  it("handles special characters safely and does not wildcard-match by default", async () => {
    testDb
      .insert(posts)
      .values({
        title: "Safe search baseline",
        slug: "safe-search-baseline",
        content: "ordinary content without SQL symbols",
        status: "published",
        createdAt: "2026-03-29T10:00:00.000Z",
        updatedAt: "2026-03-29T10:00:00.000Z",
        publishedAt: "2026-03-29T10:00:00.000Z",
      })
      .run();

    const wildcard = await searchPublishedPosts(
      "%",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    const injectionProbe = await searchPublishedPosts(
      "' OR 1=1 --",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    const scriptProbe = await searchPublishedPosts(
      "<script>alert(1)</script>",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );

    expect(wildcard.results).toEqual([]);
    expect(injectionProbe.results).toEqual([]);
    expect(scriptProbe.results).toEqual([]);
  });

  it("returns empty results for empty query", async () => {
    const result = await searchPublishedPosts(
      "   ",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );

    expect(result.normalizedQuery).toBe("");
    expect(result.results).toEqual([]);
  });

  it("makes newly published posts immediately searchable", async () => {
    const before = await searchPublishedPosts(
      "Instant Search",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    expect(before.results).toEqual([]);

    testDb
      .insert(posts)
      .values({
        title: "Instant Search Availability",
        slug: "instant-search-availability",
        content: "newly published content appears in search right away",
        status: "published",
        createdAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:00:00.000Z",
        publishedAt: "2026-03-30T12:00:00.000Z",
      })
      .run();

    const after = await searchPublishedPosts(
      "Instant Search",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );

    expect(after.results.map((post) => post.slug)).toEqual([
      "instant-search-availability",
    ]);
  });
});
