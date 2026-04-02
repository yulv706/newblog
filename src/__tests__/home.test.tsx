import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { renderToStaticMarkup } from "react-dom/server";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { HomePostCard } from "@/components/blog/home-post-card";
import * as schema from "@/lib/db/schema";
import { categories, postTags, posts, tags } from "@/lib/db/schema";
import { getHomepageData } from "@/lib/posts";

describe("homepage data", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-homepage-test-"));
    dbPath = path.join(tempDir, "home.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });

    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  beforeEach(() => {
    testDb.delete(postTags).run();
    testDb.delete(posts).run();
    testDb.delete(categories).run();
    testDb.delete(tags).run();
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns featured + latest posts from published posts only", async () => {
    const [frontendCategory, backendCategory, draftOnlyCategory] = testDb
      .insert(categories)
      .values([
        { name: "Frontend", slug: "frontend" },
        { name: "Backend", slug: "backend" },
        { name: "Drafts", slug: "drafts" },
      ])
      .returning()
      .all();

    const [reactTag, typescriptTag] = testDb
      .insert(tags)
      .values([
        { name: "React", slug: "react" },
        { name: "TypeScript", slug: "typescript" },
      ])
      .returning()
      .all();

    const now = new Date("2026-03-30T12:00:00.000Z");
    const [featuredPost, latestPost] = testDb
      .insert(posts)
      .values([
        {
          title: "Featured Post",
          slug: "featured-post",
          content: "featured",
          excerpt: "featured excerpt",
          coverImage: "https://example.com/featured.jpg",
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: new Date(now.getTime() - 10_000).toISOString(),
          updatedAt: now.toISOString(),
          publishedAt: now.toISOString(),
        },
        {
          title: "Latest Post",
          slug: "latest-post",
          content: "latest",
          excerpt: "latest excerpt",
          status: "published",
          categoryId: backendCategory.id,
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
          publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          title: "Older Post",
          slug: "older-post",
          content: "older",
          excerpt: null,
          status: "published",
          categoryId: null,
          createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
          publishedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .returning()
      .all();

    testDb
      .insert(posts)
      .values({
        title: "Draft Post",
        slug: "draft-post",
        content: "draft",
        status: "draft",
        categoryId: draftOnlyCategory.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: null,
      })
      .run();

    testDb
      .insert(postTags)
      .values([
        { postId: featuredPost.id, tagId: reactTag.id },
        { postId: featuredPost.id, tagId: typescriptTag.id },
        { postId: latestPost.id, tagId: reactTag.id },
      ])
      .run();

    const data = await getHomepageData(
      testDb as unknown as Parameters<typeof getHomepageData>[0]
    );

    expect(data.featuredPost?.slug).toBe("featured-post");
    expect(data.featuredPost?.tags).toEqual(["React", "TypeScript"]);

    expect(data.latestPosts.map((post) => post.slug)).toEqual([
      "latest-post",
      "older-post",
    ]);
    expect(data.latestPosts[0]?.tags).toEqual(["React"]);
    expect(data.latestPosts[1]?.tags).toEqual([]);

    expect(data.categories).toEqual([
      { name: "Backend", slug: "backend" },
      { name: "Frontend", slug: "frontend" },
    ]);
  });

  it("returns empty homepage sections when there are no published posts", async () => {
    const data = await getHomepageData(
      testDb as unknown as Parameters<typeof getHomepageData>[0]
    );

    expect(data.featuredPost).toBeNull();
    expect(data.latestPosts).toEqual([]);
    expect(data.categories).toEqual([]);
  });

  it("renders a polished fallback tile instead of raw missing-cover text", () => {
    const markup = renderToStaticMarkup(
      <HomePostCard
        post={{
          id: 1,
          title: "Elegant Missing Cover",
          slug: "elegant-missing-cover",
          excerpt: "A post without a cover image.",
          coverImage: null,
          createdAt: "2026-03-30T12:00:00.000Z",
          publishedAt: "2026-03-30T12:00:00.000Z",
          categoryName: "Design",
          categorySlug: "design",
          tags: [],
        }}
        locale="en"
        dictionary={{
          uncategorizedLabel: "Uncategorized",
          coverImageAltTemplate: "{title} cover image",
          dateFallbackLabel: "—",
        }}
      />
    );

    expect(markup).not.toContain("No Cover Image");
    expect(markup).toContain("Article");
    expect(markup).toContain("EM");
  });
});
