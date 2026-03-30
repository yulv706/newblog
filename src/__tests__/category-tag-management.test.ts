import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createCategory,
  deleteTagIfUnused,
} from "@/lib/admin/category-tags";
import { createPost, updatePost } from "@/lib/posts";
import { categories, postTags, posts, tags } from "@/lib/db/schema";

describe("category and tag management", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-category-tag-test-"));
    dbPath = path.join(tempDir, "category-tag.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite);

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

  it("creates categories with auto-generated unique slugs", async () => {
    const first = await createCategory("Web Development", testDb);
    const second = await createCategory("Web Development!", testDb);

    expect(first.slug).toBe("web-development");
    expect(second.slug).toBe("web-development-1");
  });

  it("deleting a category leaves existing posts uncategorized", async () => {
    const category = await createCategory("Infrastructure", testDb);
    const postDb = testDb as unknown as Parameters<typeof createPost>[1];
    const created = await createPost(
      {
        title: "A post with category",
        slug: "a-post-with-category",
        date: "",
        content: "hello",
        excerpt: "",
        categoryId: String(category.id),
        tags: "",
        coverImage: "",
        status: "published",
      },
      postDb
    );

    testDb.delete(categories).where(eq(categories.id, category.id)).run();

    const updatedPost = testDb
      .select({ categoryId: posts.categoryId })
      .from(posts)
      .where(eq(posts.id, created.postId))
      .get();

    expect(updatedPost?.categoryId).toBeNull();
  });

  it("only deletes tags that are no longer assigned to posts", async () => {
    const postDb = testDb as unknown as Parameters<typeof createPost>[1];
    const created = await createPost(
      {
        title: "Tagged post",
        slug: "tagged-post",
        date: "",
        content: "hello",
        excerpt: "",
        categoryId: "",
        tags: "React",
        coverImage: "",
        status: "published",
      },
      postDb
    );

    const reactTag = testDb
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, "react"))
      .get();

    expect(reactTag).toBeDefined();

    const blockedDelete = await deleteTagIfUnused(reactTag!.id, testDb);
    expect(blockedDelete.deleted).toBe(false);

    await updatePost(
      created.postId,
      {
        title: "Tagged post",
        slug: "tagged-post",
        date: "",
        content: "hello",
        excerpt: "",
        categoryId: "",
        tags: "",
        coverImage: "",
        status: "published",
      },
      postDb
    );

    const tagLinks = testDb
      .select({ id: postTags.id })
      .from(postTags)
      .where(eq(postTags.tagId, reactTag!.id))
      .all();

    expect(tagLinks).toHaveLength(0);

    const deleteResult = await deleteTagIfUnused(reactTag!.id, testDb);
    expect(deleteResult.deleted).toBe(true);
  });
});
