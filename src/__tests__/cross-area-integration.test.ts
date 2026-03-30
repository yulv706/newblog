import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { comments, postTags, posts, tags } from "@/lib/db/schema";
import { getDashboardStats } from "@/lib/admin/dashboard";
import {
  buildImageReferenceReplacements,
  parseMarkdownUpload,
  rewriteMarkdownImageReferences,
} from "@/lib/markdown-upload";
import {
  createPost,
  deletePost,
  getBlogListingData,
  getPublishedPostDetailBySlug,
  getPublishedPosts,
  searchPublishedPosts,
  togglePostStatus,
} from "@/lib/posts";
import { buildRssFeedXml, buildSitemapXml } from "@/lib/seo";

describe("cross-area integration coverage", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-cross-integration-test-"));
    dbPath = path.join(tempDir, "cross-integration.test.db");
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
    testDb.delete(comments).run();
    testDb.delete(posts).run();
    testDb.delete(tags).run();
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("publishes markdown content with rewritten local images and shows it on listing/detail", async () => {
    const markdown = `---
title: Integration markdown post
date: 2026-03-30
tags: [integration, e2e]
excerpt: E2E markdown upload and publish flow
---

## Integration heading

![Local image](./img/photo.png)
![Remote image](https://example.com/remote.png)
`;

    const parsed = parseMarkdownUpload(markdown);
    expect(parsed.localImageReferences).toEqual(["./img/photo.png"]);

    const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
      parsed.localImageReferences,
      {
        "photo.png": "/uploads/images/photo.png",
      }
    );

    expect(unmatchedReferences).toEqual([]);

    const rewrittenContent = rewriteMarkdownImageReferences(parsed.content, replacements);
    expect(rewrittenContent).toContain("/uploads/images/photo.png");
    expect(rewrittenContent).toContain("https://example.com/remote.png");

    const created = await createPost(
      {
        title: "Integration markdown post",
        slug: "integration-markdown-post",
        date: "2026-03-30",
        content: rewrittenContent,
        excerpt: "E2E markdown upload and publish flow",
        categoryId: "",
        tags: "integration, e2e",
        coverImage: "",
        status: "published",
      },
      testDb as unknown as Parameters<typeof createPost>[1]
    );

    const listing = await getBlogListingData(
      { page: 1, perPage: 10 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );
    expect(listing.posts.some((post) => post.slug === created.slug)).toBe(true);

    const detail = await getPublishedPostDetailBySlug(
      created.slug,
      testDb as unknown as Parameters<typeof getPublishedPostDetailBySlug>[1]
    );
    expect(detail?.content).toContain("/uploads/images/photo.png");
  });

  it("draft to published transition updates listing, rss, sitemap, and search", async () => {
    const created = await createPost(
      {
        title: "Draft To Publish Integration",
        slug: "draft-to-publish-integration",
        date: "2026-03-30",
        content: "Integration content for draft publish checks.",
        excerpt: "draft publish integration",
        categoryId: "",
        tags: "integration",
        coverImage: "",
        status: "draft",
      },
      testDb as unknown as Parameters<typeof createPost>[1]
    );

    const slug = created.slug;

    const draftListing = await getBlogListingData(
      { page: 1, perPage: 10 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );
    expect(draftListing.posts.some((post) => post.slug === slug)).toBe(false);

    const draftSearch = await searchPublishedPosts(
      "Draft To Publish Integration",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    expect(draftSearch.results.some((post) => post.slug === slug)).toBe(false);

    const draftPublishedPosts = await getPublishedPosts(
      testDb as unknown as Parameters<typeof getPublishedPosts>[0]
    );
    const draftFeedXml = buildRssFeedXml(draftPublishedPosts);
    const draftSitemapXml = buildSitemapXml(draftPublishedPosts);
    expect(draftFeedXml).not.toContain(`/blog/${slug}`);
    expect(draftSitemapXml).not.toContain(`/blog/${slug}`);

    await togglePostStatus(
      created.postId,
      testDb as unknown as Parameters<typeof togglePostStatus>[1]
    );

    const publishedListing = await getBlogListingData(
      { page: 1, perPage: 10 },
      testDb as unknown as Parameters<typeof getBlogListingData>[1]
    );
    expect(publishedListing.posts.some((post) => post.slug === slug)).toBe(true);

    const publishedSearch = await searchPublishedPosts(
      "Draft To Publish Integration",
      testDb as unknown as Parameters<typeof searchPublishedPosts>[1]
    );
    expect(publishedSearch.results.some((post) => post.slug === slug)).toBe(true);

    const publishedPosts = await getPublishedPosts(
      testDb as unknown as Parameters<typeof getPublishedPosts>[0]
    );
    const publishedFeedXml = buildRssFeedXml(publishedPosts);
    const publishedSitemapXml = buildSitemapXml(publishedPosts);
    expect(publishedFeedXml).toContain(`/blog/${slug}`);
    expect(publishedSitemapXml).toContain(`/blog/${slug}`);
  });

  it("keeps dashboard stats accurate after create, publish toggle, and delete", async () => {
    const initial = await getDashboardStats(
      testDb as unknown as Parameters<typeof getDashboardStats>[0]
    );
    expect(initial.totalPosts).toBe(0);
    expect(initial.publishedPosts).toBe(0);

    const created = await createPost(
      {
        title: "Dashboard Stats Integration",
        slug: "dashboard-stats-integration",
        date: "2026-03-30",
        content: "stats integration content",
        excerpt: "stats integration",
        categoryId: "",
        tags: "",
        coverImage: "",
        status: "draft",
      },
      testDb as unknown as Parameters<typeof createPost>[1]
    );

    const afterCreate = await getDashboardStats(
      testDb as unknown as Parameters<typeof getDashboardStats>[0]
    );
    expect(afterCreate.totalPosts).toBe(1);
    expect(afterCreate.publishedPosts).toBe(0);

    await togglePostStatus(
      created.postId,
      testDb as unknown as Parameters<typeof togglePostStatus>[1]
    );

    const afterPublish = await getDashboardStats(
      testDb as unknown as Parameters<typeof getDashboardStats>[0]
    );
    expect(afterPublish.totalPosts).toBe(1);
    expect(afterPublish.publishedPosts).toBe(1);

    await deletePost(created.postId, testDb as unknown as Parameters<typeof deletePost>[1]);

    const afterDelete = await getDashboardStats(
      testDb as unknown as Parameters<typeof getDashboardStats>[0]
    );
    expect(afterDelete.totalPosts).toBe(0);
    expect(afterDelete.publishedPosts).toBe(0);
  });
});
