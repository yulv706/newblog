import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "@/lib/db/schema";
import { categories, postTags, posts, tags } from "@/lib/db/schema";
import { getBlogListingData } from "@/lib/posts";

describe("blog listing data", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-listing-test-"));
    dbPath = path.join(tempDir, "listing.test.db");
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

  it("paginates published posts with 10 items per page", async () => {
    const frontendCategory = testDb
      .insert(categories)
      .values({ name: "Frontend", slug: "frontend" })
      .returning()
      .get();

    const now = new Date("2026-03-30T12:00:00.000Z");
    for (let index = 1; index <= 12; index += 1) {
      testDb
        .insert(posts)
        .values({
          title: `Post ${index}`,
          slug: `post-${index}`,
          content: `content ${index}`,
          excerpt: `excerpt ${index}`,
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: new Date(now.getTime() - index * 1000).toISOString(),
          updatedAt: now.toISOString(),
          publishedAt: new Date(now.getTime() - index * 1000).toISOString(),
        })
        .run();
    }

    testDb
      .insert(posts)
      .values({
        title: "Draft Post",
        slug: "draft-post",
        content: "draft",
        status: "draft",
        categoryId: frontendCategory.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: null,
      })
      .run();

    const pageOne = await getBlogListingData(
      { page: 1 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );
    const pageTwo = await getBlogListingData(
      { page: 2 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );

    expect(pageOne.posts).toHaveLength(10);
    expect(pageOne.posts[0]?.slug).toBe("post-1");
    expect(pageOne.posts[9]?.slug).toBe("post-10");
    expect(pageOne.pagination).toEqual({
      currentPage: 1,
      totalPages: 2,
      totalItems: 12,
      perPage: 10,
      hasPrevPage: false,
      hasNextPage: true,
    });

    expect(pageTwo.posts).toHaveLength(2);
    expect(pageTwo.posts.map((post) => post.slug)).toEqual(["post-11", "post-12"]);
    expect(pageTwo.pagination.currentPage).toBe(2);
    expect(pageTwo.pagination.hasPrevPage).toBe(true);
    expect(pageTwo.pagination.hasNextPage).toBe(false);
  });

  it("filters posts by category slug", async () => {
    const [frontendCategory, backendCategory] = testDb
      .insert(categories)
      .values([
        { name: "Frontend", slug: "frontend" },
        { name: "Backend", slug: "backend" },
      ])
      .returning()
      .all();

    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    testDb
      .insert(posts)
      .values([
        {
          title: "Frontend Post",
          slug: "frontend-post",
          content: "frontend",
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Backend Post",
          slug: "backend-post",
          content: "backend",
          status: "published",
          categoryId: backendCategory.id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
      ])
      .run();

    const data = await getBlogListingData(
      { category: "frontend" },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );

    expect(data.posts.map((post) => post.slug)).toEqual(["frontend-post"]);
    expect(data.activeCategory?.slug).toBe("frontend");
    expect(data.pagination.totalItems).toBe(1);
  });

  it("filters posts by tag slug", async () => {
    const [frontendCategory] = testDb
      .insert(categories)
      .values([{ name: "Frontend", slug: "frontend" }])
      .returning()
      .all();

    const [reactTag, nodeTag] = testDb
      .insert(tags)
      .values([
        { name: "React", slug: "react" },
        { name: "Node", slug: "node" },
      ])
      .returning()
      .all();

    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    const [reactOnlyPost, nodeOnlyPost, mixedPost] = testDb
      .insert(posts)
      .values([
        {
          title: "React Only",
          slug: "react-only",
          content: "react",
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Node Only",
          slug: "node-only",
          content: "node",
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Mixed",
          slug: "mixed",
          content: "mixed",
          status: "published",
          categoryId: frontendCategory.id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
      ])
      .returning()
      .all();

    testDb
      .insert(postTags)
      .values([
        { postId: reactOnlyPost.id, tagId: reactTag.id },
        { postId: nodeOnlyPost.id, tagId: nodeTag.id },
        { postId: mixedPost.id, tagId: reactTag.id },
        { postId: mixedPost.id, tagId: nodeTag.id },
      ])
      .run();

    const data = await getBlogListingData(
      { tag: "react" },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );

    expect(data.posts.map((post) => post.slug)).toEqual(["react-only", "mixed"]);
    expect(data.activeTag?.slug).toBe("react");
    expect(data.pagination.totalItems).toBe(2);
  });

  it("returns an empty result set when no posts match filters", async () => {
    const frontendCategory = testDb
      .insert(categories)
      .values({ name: "Frontend", slug: "frontend" })
      .returning()
      .get();

    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    testDb
      .insert(posts)
      .values({
        title: "Frontend Post",
        slug: "frontend-post",
        content: "frontend",
        status: "published",
        categoryId: frontendCategory.id,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      })
      .run();

    const data = await getBlogListingData(
      { category: "non-existent-category" },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );

    expect(data.posts).toEqual([]);
    expect(data.activeCategory).toBeNull();
    expect(data.pagination).toEqual({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 10,
      hasPrevPage: false,
      hasNextPage: false,
    });
  });

  it("does not show pagination controls when only one post matches", async () => {
    const frontendCategory = testDb
      .insert(categories)
      .values({ name: "Frontend", slug: "frontend" })
      .returning()
      .get();

    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    testDb
      .insert(posts)
      .values({
        title: "Single Post",
        slug: "single-post",
        content: "single",
        status: "published",
        categoryId: frontendCategory.id,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      })
      .run();

    const data = await getBlogListingData(
      { page: 1 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );

    expect(data.posts).toHaveLength(1);
    expect(data.pagination.totalPages).toBe(1);
    expect(data.pagination.hasPrevPage).toBe(false);
    expect(data.pagination.hasNextPage).toBe(false);
  });
});
