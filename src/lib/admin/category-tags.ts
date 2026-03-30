import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, postTags, posts, tags } from "@/lib/db/schema";
import { createSlug } from "@/lib/slug";

type CategoryTagDb = Pick<typeof db, "select" | "insert" | "delete">;

export type AdminCategorySummary = {
  id: number;
  name: string;
  slug: string;
  postCount: number;
};

export type AdminTagSummary = {
  id: number;
  name: string;
  slug: string;
  postCount: number;
};

export type DeleteTagResult =
  | { deleted: true }
  | { deleted: false; reason: string };

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

async function ensureUniqueCategorySlug(
  rawSlug: string,
  database: CategoryTagDb
) {
  const baseSlug = createSlug(rawSlug);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = database
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, candidate))
      .get();

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createCategory(name: string, database: CategoryTagDb = db) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const existingByName = database
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, normalizedName))
    .get();

  if (existingByName) {
    throw new Error("Category already exists.");
  }

  const slug = await ensureUniqueCategorySlug(normalizedName, database);
  const inserted = database
    .insert(categories)
    .values({
      name: normalizedName,
      slug,
    })
    .returning({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .get();

  if (!inserted) {
    throw new Error("Failed to create category.");
  }

  return inserted;
}

export async function getAdminCategorySummaries(database: CategoryTagDb = db) {
  const rows = database
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      postCount: count(posts.id),
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(asc(categories.name))
    .all();

  return rows.map((row) => ({
    ...row,
    postCount: toCount(row.postCount),
  })) as AdminCategorySummary[];
}

export async function getAdminTagSummaries(database: CategoryTagDb = db) {
  const rows = database
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id, tags.name, tags.slug)
    .orderBy(asc(tags.name))
    .all();

  return rows.map((row) => ({
    ...row,
    postCount: toCount(row.postCount),
  })) as AdminTagSummary[];
}

export async function getTagOptions(database: CategoryTagDb = db) {
  return database
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .orderBy(asc(tags.name))
    .all();
}

export async function deleteCategoryById(
  categoryId: number,
  database: CategoryTagDb = db
) {
  database.delete(categories).where(eq(categories.id, categoryId)).run();
}

export async function deleteTagIfUnused(
  tagId: number,
  database: CategoryTagDb = db
): Promise<DeleteTagResult> {
  const usageCount = toCount(
    database
      .select({ count: count() })
      .from(postTags)
      .where(eq(postTags.tagId, tagId))
      .get()?.count
  );

  if (usageCount > 0) {
    return {
      deleted: false,
      reason: "Tag is still assigned to one or more posts.",
    };
  }

  const result = database.delete(tags).where(eq(tags.id, tagId)).run();
  if (!result.changes) {
    return {
      deleted: false,
      reason: "Tag not found.",
    };
  }

  return { deleted: true };
}
