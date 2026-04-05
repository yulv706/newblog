import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as bcryptjs from "bcryptjs";
import * as schema from "@/lib/db/schema";
import { comments, postTags, posts, siteSettings, tags } from "@/lib/db/schema";
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
import { validateAdminCredentials } from "@/lib/admin-auth";
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
    testDb.delete(siteSettings).run();
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

![[Pasted image 20260316162343.png]]
![Remote image](https://example.com/remote.png)
`;

    const parsed = parseMarkdownUpload(markdown);
    expect(parsed.localImageReferences).toEqual(["Pasted image 20260316162343.png"]);

    const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
      parsed.localImageReferences,
      {
        "pasted image 20260316162343.png": "/uploads/images/photo.png",
      }
    );

    expect(unmatchedReferences).toEqual([]);

    const rewrittenContent = rewriteMarkdownImageReferences(parsed.content, replacements);
    expect(rewrittenContent).toContain("![[/uploads/images/photo.png]]");
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

  it("authenticates the configured admin after first deploy and persists the seeded password hash", async () => {
    const originalUsername = process.env.ADMIN_USERNAME;
    const originalPassword = process.env.ADMIN_PASSWORD;

    process.env.ADMIN_USERNAME = "durable-operator";
    process.env.ADMIN_PASSWORD = "PersistentPassword!234";

    try {
      expect(
        await validateAdminCredentials(
          "durable-operator",
          "PersistentPassword!234",
          testDb as unknown as Parameters<typeof validateAdminCredentials>[2]
        )
      ).toBe(true);

      const storedHash = testDb
        .select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, "admin_password_hash"))
        .get();

      expect(storedHash?.value).toBeTypeOf("string");
      expect(storedHash?.value).not.toBe("PersistentPassword!234");
      expect(await bcryptjs.compare("PersistentPassword!234", storedHash!.value)).toBe(true);

      process.env.ADMIN_PASSWORD = "ChangedAfterSeed!678";
      expect(
        await validateAdminCredentials(
          "durable-operator",
          "PersistentPassword!234",
          testDb as unknown as Parameters<typeof validateAdminCredentials>[2]
        )
      ).toBe(true);
      expect(
        await validateAdminCredentials(
          "durable-operator",
          "ChangedAfterSeed!678",
          testDb as unknown as Parameters<typeof validateAdminCredentials>[2]
        )
      ).toBe(false);
    } finally {
      if (originalUsername === undefined) {
        delete process.env.ADMIN_USERNAME;
      } else {
        process.env.ADMIN_USERNAME = originalUsername;
      }

      if (originalPassword === undefined) {
        delete process.env.ADMIN_PASSWORD;
      } else {
        process.env.ADMIN_PASSWORD = originalPassword;
      }
    }
  });

  it("preserves media-backed published content across database and uploads restoration", async () => {
    const uploadsDir = path.join(tempDir, "uploads-fixture");
    fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
    const assetPath = path.join(uploadsDir, "images", "durability-proof.txt");
    fs.writeFileSync(assetPath, "upload-proof");

    const created = await createPost(
      {
        title: "Durability proof post",
        slug: "durability-proof-post",
        date: "2026-04-05",
        content:
          "Published content that references ![](/uploads/images/durability-proof.txt) after restore.",
        excerpt: "proof that restored content still references restored uploads",
        categoryId: "",
        tags: "durability, restore",
        coverImage: "",
        status: "published",
      },
      testDb as unknown as Parameters<typeof createPost>[1]
    );

    const backupDbPath = path.join(tempDir, "durability-backup.db");
    await sqlite.backup(backupDbPath);

    testDb.delete(postTags).run();
    testDb.delete(posts).run();
    fs.rmSync(uploadsDir, { recursive: true, force: true });

    const restoredSqlite = new Database(backupDbPath, { readonly: true });
    restoredSqlite.pragma("foreign_keys = ON");
    const restoredDb = drizzle(restoredSqlite, { schema });
    fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
    fs.writeFileSync(assetPath, "upload-proof");

    const restoredPost = await getPublishedPostDetailBySlug(
      created.slug,
      restoredDb as unknown as Parameters<typeof getPublishedPostDetailBySlug>[1]
    );

    expect(restoredPost?.title).toBe("Durability proof post");
    expect(restoredPost?.content).toContain("/uploads/images/durability-proof.txt");
    expect(fs.readFileSync(assetPath, "utf8")).toBe("upload-proof");

    restoredSqlite.close();
    fs.rmSync(backupDbPath, { force: true });
  });
});
