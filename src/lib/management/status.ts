import { count, eq } from "drizzle-orm";
import { getAppVersionInfo } from "@/lib/app-version";
import { db } from "@/lib/db";
import {
  comments,
  dailyEntries,
  posts,
  readingBooks,
  users,
} from "@/lib/db/schema";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getManagementStatus() {
  const postCount = db.select({ value: count() }).from(posts).get();
  const dailyCount = db.select({ value: count() }).from(dailyEntries).get();
  const pendingCommentCount = db
    .select({ value: count() })
    .from(comments)
    .where(eq(comments.approved, false))
    .get();
  const bookCount = db.select({ value: count() }).from(readingBooks).get();
  const userCount = db.select({ value: count() }).from(users).get();
  const activeUserCount = db
    .select({ value: count() })
    .from(users)
    .where(eq(users.status, "active"))
    .get();
  const adminUserCount = db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();

  return {
    service: "personal-blog-management-api",
    apiVersion: "v1",
    application: getAppVersionInfo(),
    counts: {
      posts: toNumber(postCount?.value),
      dailyEntries: toNumber(dailyCount?.value),
      pendingComments: toNumber(pendingCommentCount?.value),
      books: toNumber(bookCount?.value),
      users: toNumber(userCount?.value),
      activeUsers: toNumber(activeUserCount?.value),
      administrators: toNumber(adminUserCount?.value),
    },
    capabilities: [
      "posts:read-write-publish-delete",
      "daily:read-write-publish-delete",
      "media:upload",
      "about:read-write",
      "taxonomy:read-write-delete",
      "comments:moderate-delete",
      "users:read-update-access",
      "books:read-write-sync-notes",
      "backups:create-list",
      "audit:read",
    ],
    safeguards: [
      "bearer-authentication",
      "mutation-audit-log",
      "idempotency-keys",
      "optimistic-concurrency",
      "explicit-delete-confirmation",
      "rate-limiting",
    ],
    timestamp: new Date().toISOString(),
  };
}
