import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";

type AdminUserDatabase = Pick<typeof db, "select" | "update">;

function toCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

export function getUsersForAdmin(database: AdminUserDatabase = db) {
  return database
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      commentCount: count(comments.id),
    })
    .from(users)
    .leftJoin(comments, eq(comments.userId, users.id))
    .groupBy(
      users.id,
      users.email,
      users.displayName,
      users.role,
      users.status,
      users.createdAt,
      users.lastLoginAt
    )
    .orderBy(desc(users.createdAt))
    .all()
    .map((user) => ({
      ...user,
      commentCount: toCount(user.commentCount),
    }));
}

export function setUserStatus(
  userId: number,
  status: "active" | "disabled",
  database: AdminUserDatabase = db
) {
  const result = database
    .update(users)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();

  return result.changes > 0;
}
