import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "@/lib/db/schema";
import { comments, postTags, posts, tags } from "@/lib/db/schema";
import { getPublishedPosts, updatePost } from "@/lib/posts";
import {
  SITE_NAME,
  buildBlogPostingJsonLd,
  buildRssFeedXml,
  buildSitemapXml,
  getAbsoluteUrl,
} from "@/lib/seo";

describe("seo feeds and structured data", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-seo-test-"));
    dbPath = path.join(tempDir, "seo.test.db");
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

  it("seo rss feed xml includes only published posts with absolute links and RFC822 pubDate", async () => {
    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    testDb
      .insert(posts)
      .values([
        {
          title: "Published Post",
          slug: "published-post",
          content: "published",
          excerpt: "Published excerpt",
          status: "published",
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Draft Post",
          slug: "draft-post",
          content: "draft",
          excerpt: "Draft excerpt",
          status: "draft",
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
        },
      ])
      .run();

    const published = await getPublishedPosts(
      testDb as unknown as Parameters<typeof getPublishedPosts>[0]
    );
    const xml = buildRssFeedXml(published);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain(`<link>${getAbsoluteUrl("/blog/published-post")}</link>`);
    expect(xml).not.toContain("draft-post");

    const pubDateMatch = xml.match(/<pubDate>([^<]+)<\/pubDate>/);
    expect(pubDateMatch).not.toBeNull();
    expect(pubDateMatch?.[1]).toMatch(
      /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/
    );
    expect(Number.isNaN(Date.parse(pubDateMatch?.[1] ?? ""))).toBe(false);
  });

  it("seo rss feed xml stays valid with zero published posts", () => {
    const xml = buildRssFeedXml([]);

    expect(xml).toContain("<channel>");
    expect(xml).toContain(`<title>${SITE_NAME}</title>`);
    expect(xml).not.toContain("<item>");
  });

  it("seo sitemap xml includes static pages and published posts with lastmod, excluding drafts", async () => {
    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    testDb
      .insert(posts)
      .values([
        {
          title: "Published Post",
          slug: "published-post",
          content: "published",
          status: "published",
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
        {
          title: "Draft Post",
          slug: "draft-post",
          content: "draft",
          status: "draft",
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
        },
      ])
      .run();

    const published = await getPublishedPosts(
      testDb as unknown as Parameters<typeof getPublishedPosts>[0]
    );
    const xml = buildSitemapXml(published);

    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${getAbsoluteUrl("/")}</loc>`);
    expect(xml).toContain(`<loc>${getAbsoluteUrl("/about")}</loc>`);
    expect(xml).toContain(`<loc>${getAbsoluteUrl("/blog/published-post")}</loc>`);
    expect(xml).toContain("<lastmod>");
    expect(xml).not.toContain("draft-post");
  });

  it("seo slug updates remove old url references from rss and sitemap", async () => {
    const now = new Date("2026-03-30T12:00:00.000Z").toISOString();
    const inserted = testDb
      .insert(posts)
      .values({
        title: "Old Slug Title",
        slug: "old-slug",
        content: "content",
        excerpt: "excerpt",
        status: "published",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      })
      .returning({ id: posts.id })
      .get();

    await updatePost(
      inserted.id,
      {
        title: "New Slug Title",
        slug: "new-slug",
        content: "content",
        excerpt: "excerpt",
        categoryId: "",
        tags: "",
        coverImage: "",
        status: "published",
        date: "",
      },
      testDb as unknown as Parameters<typeof updatePost>[2]
    );

    const published = await getPublishedPosts(
      testDb as unknown as Parameters<typeof getPublishedPosts>[0]
    );
    const rssXml = buildRssFeedXml(published);
    const sitemapXml = buildSitemapXml(published);

    expect(rssXml).toContain(getAbsoluteUrl("/blog/new-slug"));
    expect(rssXml).not.toContain(getAbsoluteUrl("/blog/old-slug"));
    expect(sitemapXml).toContain(getAbsoluteUrl("/blog/new-slug"));
    expect(sitemapXml).not.toContain(getAbsoluteUrl("/blog/old-slug"));
  });

  it("seo blogposting structured data includes required fields", () => {
    const jsonLd = buildBlogPostingJsonLd({
      title: "Structured Data Post",
      slug: "structured-data-post",
      excerpt: "Structured data excerpt",
      createdAt: "2026-03-30T12:00:00.000Z",
      updatedAt: "2026-03-30T13:00:00.000Z",
      publishedAt: "2026-03-30T12:00:00.000Z",
      coverImage: null,
    });

    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe("Structured Data Post");
    expect(jsonLd.datePublished).toBe("2026-03-30T12:00:00.000Z");
    expect(jsonLd.author.name).toBe(SITE_NAME);
  });
});
