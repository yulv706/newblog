import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import {
  ManagementApiError,
  getLimit,
  getPage,
} from "@/lib/management/core";
import {
  assertExpectedUpdatedAt,
  optionalEnum,
  optionalString,
} from "@/lib/management/validation";

type ManagementUserDatabase = Pick<typeof db, "select" | "update">;

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function filtersFromUrl(url: URL) {
  const status = url.searchParams.get("status");
  const role = url.searchParams.get("role");
  const query = url.searchParams.get("query")?.trim().slice(0, 120) ?? "";
  const conditions: SQL[] = [];

  if (status && status !== "all") {
    if (status !== "active" && status !== "disabled") {
      throw new ManagementApiError(
        400,
        "invalid_parameter",
        "status must be all, active, or disabled."
      );
    }
    conditions.push(eq(users.status, status));
  }

  if (role && role !== "all") {
    if (role !== "reader" && role !== "admin") {
      throw new ManagementApiError(
        400,
        "invalid_parameter",
        "role must be all, reader, or admin."
      );
    }
    conditions.push(eq(users.role, role));
  }

  if (query) {
    const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(like(users.email, pattern), like(users.displayName, pattern))!
    );
  }

  return conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : and(...conditions);
}

function userProjection() {
  return {
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    status: users.status,
    emailVerifiedAt: users.emailVerifiedAt,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };
}

export async function listManagedUsers(
  url: URL,
  database: ManagementUserDatabase = db
) {
  const page = getPage(url.searchParams.get("page"));
  const limit = getLimit(url.searchParams.get("limit"), 30, 100);
  const where = filtersFromUrl(url);

  const totalRow = database
    .select({ value: count() })
    .from(users)
    .where(where)
    .get();
  const items = database
    .select({
      ...userProjection(),
      commentCount: count(comments.id),
    })
    .from(users)
    .leftJoin(comments, eq(comments.userId, users.id))
    .where(where)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit)
    .offset((page - 1) * limit)
    .all()
    .map((user) => ({
      ...user,
      commentCount: toNumber(user.commentCount),
    }));

  const total = toNumber(totalRow?.value);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getManagedUser(
  userId: number,
  database: ManagementUserDatabase = db
) {
  const user = database
    .select({
      ...userProjection(),
      commentCount: count(comments.id),
    })
    .from(users)
    .leftJoin(comments, eq(comments.userId, users.id))
    .where(eq(users.id, userId))
    .groupBy(users.id)
    .get();

  if (!user) {
    throw new ManagementApiError(404, "user_not_found", "The user does not exist.");
  }

  return {
    ...user,
    commentCount: toNumber(user.commentCount),
  };
}

export async function updateManagedUser(
  userId: number,
  body: Record<string, unknown>,
  database: ManagementUserDatabase = db
) {
  const existing = await getManagedUser(userId, database);
  assertExpectedUpdatedAt(body, existing.updatedAt);

  const displayName = optionalString(body, "displayName", 40, {
    allowEmpty: false,
  });
  const role = optionalEnum(body, "role", ["reader", "admin"] as const);
  const status = optionalEnum(body, "status", ["active", "disabled"] as const);

  if (displayName === undefined && role === undefined && status === undefined) {
    throw new ManagementApiError(
      400,
      "no_changes",
      "Provide displayName, role, or status to update the user."
    );
  }

  const removesActiveAdmin =
    existing.role === "admin" &&
    existing.status === "active" &&
    (role === "reader" || status === "disabled");
  if (removesActiveAdmin) {
    const activeAdminCount = database
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")))
      .get();
    if (toNumber(activeAdminCount?.value) <= 1) {
      throw new ManagementApiError(
        409,
        "last_active_admin",
        "The last active administrator cannot be disabled or demoted."
      );
    }
  }

  database
    .update(users)
    .set({
      ...(displayName === undefined ? {} : { displayName }),
      ...(role === undefined ? {} : { role }),
      ...(status === undefined ? {} : { status }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .run();

  revalidatePath("/account");
  revalidatePath("/admin/users");
  return getManagedUser(userId, database);
}
