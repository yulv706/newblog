import React from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { renderToStaticMarkup } from "react-dom/server";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { CoverMedia } from "@/components/blog/cover-media";
import * as schema from "@/lib/db/schema";
import { categories, postTags, posts, tags } from "@/lib/db/schema";
import {
  extractTableOfContents,
  renderMarkdownToHtml,
  renderPostMarkdownToHtml,
} from "@/lib/markdown";
import {
  getAdjacentPublishedPosts,
  getPublishedPostDetailBySlug,
} from "@/lib/posts";

describe("post-detail markdown pipeline", () => {
  it("renders heading ids, auto-links, and highlighted code block metadata", async () => {
    const html = await renderPostMarkdownToHtml(`## Intro

### Setup

\`\`\`ts
const answer = 42;
\`\`\`
`);

    expect(html).toContain('id="intro"');
    expect(html).toContain("heading-anchor");
    expect(html).toContain('data-language="ts"');
    expect(html).toContain("data-line");
    expect(html).not.toContain("<script");
  });

  it("renders Obsidian wiki-image embeds as standard images", async () => {
    const html = await renderPostMarkdownToHtml(
      [
        "# Obsidian",
        "",
        "![[/uploads/images/pasted-image-20260316162343.png]]",
      ].join("\n")
    );

    expect(html).toContain(
      '<img src="/uploads/images/pasted-image-20260316162343.png" alt="pasted-image-20260316162343"'
    );
    expect(html).not.toContain("![[/uploads/images/pasted-image-20260316162343.png]]");
  });

  it("renders inline Obsidian wiki-image embeds when mixed with paragraph text", async () => {
    const html = await renderPostMarkdownToHtml(
      "今天打开飞书就看到了这个 不错不错hhhhh ![[/uploads/images/pasted-image-20260316162343.png]]"
    );

    expect(html).toContain("今天打开飞书就看到了这个");
    expect(html).toContain(
      '<img src="/uploads/images/pasted-image-20260316162343.png" alt="pasted-image-20260316162343"'
    );
    expect(html).not.toContain("![[/uploads/images/pasted-image-20260316162343.png]]");
  });

  it("renders inline Obsidian wiki-image embeds in the admin preview pipeline", async () => {
    const html = await renderMarkdownToHtml(
      "今天打开飞书就看到了这个 不错不错hhhhh ![[/uploads/images/pasted-image-20260316162343.png]]"
    );

    expect(html).toContain("今天打开飞书就看到了这个");
    expect(html).toContain(
      '<img src="/uploads/images/pasted-image-20260316162343.png" alt="pasted-image-20260316162343"'
    );
    expect(html).not.toContain("![[/uploads/images/pasted-image-20260316162343.png]]");
  });
});

describe("post-detail table of contents", () => {
  it("extracts h2/h3 headings with stable slug ids", () => {
    const toc = extractTableOfContents(`## Intro
### Setup
## Intro
`);

    expect(toc).toEqual([
      { id: "intro", text: "Intro", depth: 2 },
      { id: "setup", text: "Setup", depth: 3 },
      { id: "intro-1", text: "Intro", depth: 2 },
    ]);
  });
});

describe("post-detail data", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-post-detail-test-"));
    dbPath = path.join(tempDir, "post-detail.test.db");
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

  it("returns post metadata with category/tag slugs and adjacent published posts", async () => {
    const now = Date.now();
    const frontendCategory = testDb
      .insert(categories)
      .values({ name: "Frontend", slug: "frontend" })
      .returning({ id: categories.id })
      .get();
    const reactTag = testDb
      .insert(tags)
      .values({ name: "React", slug: "react" })
      .returning({ id: tags.id })
      .get();

    const firstPost = testDb
      .insert(posts)
      .values({
        title: "First Post",
        slug: "first-post",
        content: "## First",
        status: "published",
        categoryId: frontendCategory?.id,
        createdAt: new Date(now - 3000).toISOString(),
        updatedAt: new Date(now - 3000).toISOString(),
        publishedAt: new Date(now - 3000).toISOString(),
      })
      .returning({ id: posts.id })
      .get();
    const middlePost = testDb
      .insert(posts)
      .values({
        title: "Middle Post",
        slug: "middle-post",
        content: "## Middle",
        status: "published",
        categoryId: frontendCategory?.id,
        createdAt: new Date(now - 2000).toISOString(),
        updatedAt: new Date(now - 2000).toISOString(),
        publishedAt: new Date(now - 2000).toISOString(),
      })
      .returning({ id: posts.id })
      .get();
    testDb
      .insert(posts)
      .values({
        title: "Draft Post",
        slug: "draft-post",
        content: "## Draft",
        status: "draft",
        createdAt: new Date(now - 1000).toISOString(),
        updatedAt: new Date(now - 1000).toISOString(),
      })
      .run();
    const lastPost = testDb
      .insert(posts)
      .values({
        title: "Last Post",
        slug: "last-post",
        content: "## Last",
        status: "published",
        categoryId: frontendCategory?.id,
        createdAt: new Date(now - 500).toISOString(),
        updatedAt: new Date(now - 500).toISOString(),
        publishedAt: new Date(now - 500).toISOString(),
      })
      .returning({ id: posts.id })
      .get();

    if (middlePost && reactTag) {
      testDb
        .insert(postTags)
        .values({
          postId: middlePost.id,
          tagId: reactTag.id,
        })
        .run();
    }

    const database = testDb as unknown as Parameters<
      typeof getPublishedPostDetailBySlug
    >[1];

    const detail = await getPublishedPostDetailBySlug("middle-post", database);
    expect(detail?.category?.slug).toBe("frontend");
    expect(detail?.tags).toEqual([{ name: "React", slug: "react" }]);

    if (!middlePost || !firstPost || !lastPost) {
      throw new Error("Failed to set up post fixtures");
    }

    const adjacent = await getAdjacentPublishedPosts(middlePost.id, database);
    expect(adjacent.previous?.slug).toBe("first-post");
    expect(adjacent.next?.slug).toBe("last-post");

    const firstAdjacent = await getAdjacentPublishedPosts(firstPost.id, database);
    expect(firstAdjacent.previous).toBeNull();
    expect(firstAdjacent.next?.slug).toBe("middle-post");

    const lastAdjacent = await getAdjacentPublishedPosts(lastPost.id, database);
    expect(lastAdjacent.previous?.slug).toBe("middle-post");
    expect(lastAdjacent.next).toBeNull();
  });

  it("renders polished detail fallback media when a cover image is missing", () => {
    const markup = renderToStaticMarkup(
      <CoverMedia
        src={null}
        alt="Missing cover fallback"
        title="Refined Detail Cover"
        className="h-auto max-h-[460px] w-full object-cover"
        fallbackClassName="min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]"
        fallbackAccentClassName="top-6 inset-x-6"
        loading="eager"
      />
    );

    expect(markup).toContain("Article");
    expect(markup).toContain("RD");
    expect(markup).not.toContain("暂无封面图");
    expect(markup).not.toContain("No Cover Image");
  });

  it("renders remote detail covers without using the Next optimizer", () => {
    const markup = renderToStaticMarkup(
      <CoverMedia
        src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
        alt="Allowed remote cover"
        title="Remote Detail Cover"
        className="h-auto max-h-[460px] w-full object-cover"
        fallbackClassName="min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]"
        fallbackAccentClassName="top-6 inset-x-6"
        loading="eager"
      />
    );

    expect(markup).toContain("images.unsplash.com");
    expect(markup).toContain('src="https://images.unsplash.com/');
    expect(markup).not.toContain("/_next/image");
    expect(markup).not.toContain("Article");
  });

  it("falls back on detail pages when the cover path is not root-relative or absolute", () => {
    const markup = renderToStaticMarkup(
      <CoverMedia
        src="img/cover.png"
        alt="Broken cover path"
        title="Broken Detail Cover"
        className="h-auto max-h-[460px] w-full object-cover"
        fallbackClassName="min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]"
        fallbackAccentClassName="top-6 inset-x-6"
        loading="eager"
      />
    );

    expect(markup).toContain("Article");
    expect(markup).toContain("BD");
    expect(markup).not.toContain('src="img/cover.png"');
  });
});
