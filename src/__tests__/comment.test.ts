import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, sql } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "@/lib/db/schema";
import { comments, posts } from "@/lib/db/schema";
import {
  approveComment,
  createPendingComment,
  deleteComment,
  formatCommentTimestamp,
  getApprovedCommentsForPost,
  sanitizeCommentBody,
} from "@/lib/comments";
import { getDashboardStats } from "@/lib/admin/dashboard";
import { deletePost, getPublishedPostDetailBySlug } from "@/lib/posts";

describe("comment system", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;
  let publishedPostId = 0;
  let draftPostId = 0;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-comment-test-"));
    dbPath = path.join(tempDir, "comment.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });

    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });

    const now = new Date().toISOString();
    const inserted = testDb
      .insert(posts)
      .values([
        {
          title: "Published post",
          slug: "published-post",
          content: "hello",
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
      .returning({ id: posts.id, slug: posts.slug })
      .all();

    publishedPostId = inserted[0]!.id;
    draftPostId = inserted[1]!.id;
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("validates required fields and email format", async () => {
    const result = await createPendingComment(
      {
        postId: publishedPostId,
        nickname: "",
        email: "invalid-email",
        body: "",
      },
      testDb as never
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }

    expect(result.errors.nickname).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.body).toBeTruthy();
  });

  it("creates pending comments for published posts and rejects draft posts", async () => {
    const publishedResult = await createPendingComment(
      {
        postId: publishedPostId,
        nickname: "Visitor",
        email: "visitor@example.com",
        body: "First pending comment",
      },
      testDb as never
    );

    expect(publishedResult.ok).toBe(true);
    if (!publishedResult.ok) {
      throw new Error("Expected pending comment to be created");
    }

    const stored = testDb
      .select({ approved: comments.approved })
      .from(comments)
      .where(eq(comments.id, publishedResult.commentId))
      .get();
    expect(stored?.approved).toBe(false);

    const draftResult = await createPendingComment(
      {
        postId: draftPostId,
        nickname: "Visitor",
        email: "visitor@example.com",
        body: "Should fail",
      },
      testDb as never
    );

    expect(draftResult.ok).toBe(false);
    if (draftResult.ok) {
      throw new Error("Expected draft post submission to fail");
    }
    expect(draftResult.errors.form).toContain("published");
  });

  it("approves comments, hides unapproved comments, and orders approved comments oldest-first", async () => {
    const now = Date.now();
    const insertedComments = testDb
      .insert(comments)
      .values([
        {
          postId: publishedPostId,
          nickname: "Second",
          email: "second@example.com",
          body: "Second body",
          approved: true,
          createdAt: new Date(now + 1_000).toISOString(),
        },
        {
          postId: publishedPostId,
          nickname: "First",
          email: "first@example.com",
          body: "First body",
          approved: true,
          createdAt: new Date(now).toISOString(),
        },
        {
          postId: publishedPostId,
          nickname: "Pending",
          email: "pending@example.com",
          body: "Pending body",
          approved: false,
          createdAt: new Date(now + 2_000).toISOString(),
        },
      ])
      .returning({ id: comments.id })
      .all();

    const approved = await getApprovedCommentsForPost(
      publishedPostId,
      testDb as never
    );
    expect(approved.map((comment) => comment.nickname)).toEqual([
      "First",
      "Second",
    ]);
    expect(approved.some((comment) => comment.nickname === "Pending")).toBe(false);

    const pendingCommentId = insertedComments[2]!.id;
    await approveComment(pendingCommentId, testDb as never);

    const approvedAfterModeration = await getApprovedCommentsForPost(
      publishedPostId,
      testDb as never
    );
    expect(
      approvedAfterModeration.some((comment) => comment.nickname === "Pending")
    ).toBe(true);
  });

  it("deletes comments via moderation action", async () => {
    const inserted = testDb
      .insert(comments)
      .values({
        postId: publishedPostId,
        nickname: "Delete me",
        email: "deleteme@example.com",
        body: "Delete body",
        approved: true,
        createdAt: new Date().toISOString(),
      })
      .returning({ id: comments.id })
      .get();

    if (!inserted) {
      throw new Error("Expected fixture comment");
    }

    await deleteComment(inserted.id, testDb as never);

    const remaining = testDb
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, inserted.id))
      .get();
    expect(remaining).toBeUndefined();
  });

  it("sanitizes comment body and formats human-readable timestamps", () => {
    const sanitized = sanitizeCommentBody(
      `<script>alert("xss")</script><b>safe</b><img src=x onerror=alert(1)>`
    );
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<b>");
    expect(sanitized).toContain('alert("xss")');
    expect(sanitized).toContain("safe");

    const formatted = formatCommentTimestamp("2026-03-29T10:00:00.000Z");
    expect(formatted).not.toContain("T10:00:00");
    expect(formatted.length).toBeGreaterThan(4);
  });

  it("handles long comments and updates pending count", async () => {
    const longComment = "A".repeat(6000);
    const before = await getDashboardStats(testDb as never);

    const result = await createPendingComment(
      {
        postId: publishedPostId,
        nickname: "Long User",
        email: "long@example.com",
        body: longComment,
      },
      testDb as never
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected long comment to be accepted");
    }

    const after = await getDashboardStats(testDb as never);
    expect(after.pendingComments).toBe(before.pendingComments + 1);
  });

  it("exposes approved comment count on published post detail", async () => {
    const detail = await getPublishedPostDetailBySlug(
      "published-post",
      testDb as never
    );

    expect(detail).not.toBeNull();
    expect(detail?.commentCount).toBeGreaterThanOrEqual(1);
  });

  it("deleting a post cascades and removes associated comments", async () => {
    const now = new Date().toISOString();
    const inserted = testDb
      .insert(posts)
      .values({
        title: "Cascade post",
        slug: "cascade-post",
        content: "to be deleted",
        status: "published",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      })
      .returning({ id: posts.id })
      .get();

    if (!inserted) {
      throw new Error("Expected fixture post");
    }

    testDb
      .insert(comments)
      .values({
        postId: inserted.id,
        nickname: "Cascade commenter",
        email: "cascade@example.com",
        body: "bye",
        approved: true,
        createdAt: now,
      })
      .run();

    const beforeDeleteCount = testDb
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, inserted.id))
      .get();
    expect(beforeDeleteCount?.count).toBe(1);

    await deletePost(inserted.id, testDb as never);

    const afterDeleteCount = testDb
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, inserted.id))
      .get();
    expect(afterDeleteCount?.count).toBe(0);
  });
});
