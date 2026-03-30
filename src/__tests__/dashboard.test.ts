import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { comments, posts } from "@/lib/db/schema";
import {
  DASHBOARD_QUICK_ACTIONS,
  getDashboardStats,
} from "@/lib/admin/dashboard";
import {
  ADMIN_SIDEBAR_LINKS,
  isAdminPathActive,
} from "@/lib/admin/navigation";

describe("admin dashboard data", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-dashboard-test-"));
    dbPath = path.join(tempDir, "dashboard.test.db");
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

  it("returns zero counts and empty-state flag for an empty database", async () => {
    const stats = await getDashboardStats(testDb);

    expect(stats).toEqual({
      totalPosts: 0,
      publishedPosts: 0,
      totalComments: 0,
      pendingComments: 0,
      hasData: false,
    });
  });

  it("returns post and comment totals from real database rows", async () => {
    const now = new Date().toISOString();

    const postRows = testDb
      .insert(posts)
      .values([
        {
          title: "Draft post",
          slug: "draft-post",
          content: "draft content",
          status: "draft",
          createdAt: now,
          updatedAt: now,
        },
        {
          title: "Published post",
          slug: "published-post",
          content: "published content",
          status: "published",
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        },
      ])
      .returning({ id: posts.id })
      .all();

    testDb
      .insert(comments)
      .values([
        {
          postId: postRows[0]!.id,
          nickname: "Pending",
          email: "pending@example.com",
          body: "pending comment",
          approved: false,
          createdAt: now,
        },
        {
          postId: postRows[1]!.id,
          nickname: "Approved",
          email: "approved@example.com",
          body: "approved comment",
          approved: true,
          createdAt: now,
        },
      ])
      .run();

    const stats = await getDashboardStats(testDb);

    expect(stats.totalPosts).toBe(2);
    expect(stats.publishedPosts).toBe(1);
    expect(stats.totalComments).toBe(2);
    expect(stats.pendingComments).toBe(1);
    expect(stats.hasData).toBe(true);
  });
});

describe("admin dashboard navigation config", () => {
  it("exposes quick action links for key admin shortcuts", () => {
    expect(DASHBOARD_QUICK_ACTIONS).toEqual(
      expect.arrayContaining([
        { href: "/admin/posts", label: "New Post" },
        { href: "/blog", label: "View Blog" },
        { href: "/admin/comments", label: "Manage Comments" },
      ])
    );
  });

  it("marks sidebar links active based on the current admin path", () => {
    expect(ADMIN_SIDEBAR_LINKS.map((link) => link.label)).toEqual([
      "Dashboard",
      "Posts",
      "Categories/Tags",
      "Comments",
      "About",
    ]);

    expect(isAdminPathActive("/admin", "/admin")).toBe(true);
    expect(isAdminPathActive("/admin/posts", "/admin")).toBe(false);
    expect(isAdminPathActive("/admin/posts/new", "/admin/posts")).toBe(true);
    expect(isAdminPathActive("/admin/comments", "/admin/comments")).toBe(true);
  });
});
