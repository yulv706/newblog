import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";

type DashboardDb = Pick<typeof db, "select">;

export type DashboardStats = {
  totalPosts: number;
  publishedPosts: number;
  totalComments: number;
  pendingComments: number;
  hasData: boolean;
};

export const DASHBOARD_QUICK_ACTIONS = [
  { href: "/admin/posts", label: "New Post" },
  { href: "/blog", label: "View Blog" },
  { href: "/admin/comments", label: "Manage Comments" },
] as const;

function toCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10) || 0;
  }

  return 0;
}

export async function getDashboardStats(
  database: DashboardDb = db
): Promise<DashboardStats> {
  const totalPosts = toCount(
    database
      .select({ count: count() })
      .from(posts)
      .get()?.count
  );
  const publishedPosts = toCount(
    database
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.status, "published"))
      .get()?.count
  );
  const totalComments = toCount(
    database
      .select({ count: count() })
      .from(comments)
      .get()?.count
  );
  const pendingComments = toCount(
    database
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.approved, false))
      .get()?.count
  );

  return {
    totalPosts,
    publishedPosts,
    totalComments,
    pendingComments,
    hasData: totalPosts > 0 || totalComments > 0,
  };
}
