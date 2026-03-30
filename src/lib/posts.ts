import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, postTags, posts, tags } from "@/lib/db/schema";
import { createSlug } from "@/lib/slug";

type PostDatabase = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete" | "transaction"
>;

type PostStatus = "draft" | "published";

export type AdminPostListItem = {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type PostFormInput = {
  title: string;
  slug: string;
  date: string;
  content: string;
  excerpt: string;
  categoryId: string;
  tags: string;
  coverImage: string;
  status: string;
};

export type PersistedPostResult = {
  postId: number;
  slug: string;
  slugAdjusted: boolean;
};

function normalizeStatus(status: string): PostStatus {
  return status === "published" ? "published" : "draft";
}

function parseOptionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseOptionalDate(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseCategoryId(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseTagNames(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

async function upsertPostTags(
  postId: number,
  rawTags: string,
  database: PostDatabase
) {
  const tagNames = parseTagNames(rawTags);

  database.delete(postTags).where(eq(postTags.postId, postId)).run();

  if (tagNames.length === 0) {
    return;
  }

  for (const tagName of tagNames) {
    const tagSlug = createSlug(tagName);

    database
      .insert(tags)
      .values({
        name: tagName,
        slug: tagSlug,
      })
      .onConflictDoUpdate({
        target: tags.slug,
        set: {
          name: tagName,
        },
      })
      .run();

    const tagRow = database
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, tagSlug))
      .get();

    if (!tagRow) {
      continue;
    }

    database
      .insert(postTags)
      .values({
        postId,
        tagId: tagRow.id,
      })
      .run();
  }
}

export async function ensureUniqueSlug(
  rawSlug: string,
  database: PostDatabase = db,
  excludePostId?: number
) {
  const baseSlug = createSlug(rawSlug);

  const matchingRows = database
    .select({ slug: posts.slug })
    .from(posts)
    .where(
      excludePostId
        ? and(ne(posts.id, excludePostId), eq(posts.slug, baseSlug))
        : eq(posts.slug, baseSlug)
    )
    .all();

  if (matchingRows.length === 0) {
    return baseSlug;
  }

  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    candidate = `${baseSlug}-${suffix}`;
    const existing = database
      .select({ id: posts.id })
      .from(posts)
      .where(
        excludePostId
          ? and(ne(posts.id, excludePostId), eq(posts.slug, candidate))
          : eq(posts.slug, candidate)
      )
      .get();

    if (!existing) {
      return candidate;
    }

    suffix += 1;
  }
}

export async function getAdminPosts(
  sortDirection: "asc" | "desc" = "desc",
  database: PostDatabase = db
) {
  const orderBy = sortDirection === "asc" ? asc(posts.createdAt) : desc(posts.createdAt);

  const rows = database
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      categoryName: categories.name,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(orderBy)
    .all();

  return rows as AdminPostListItem[];
}

export async function getPostCategories(database: PostDatabase = db) {
  return database
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .orderBy(asc(categories.name))
    .all();
}

export async function getPostForEdit(postId: number, database: PostDatabase = db) {
  const post = database
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      content: posts.content,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      status: posts.status,
      categoryId: posts.categoryId,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .get();

  if (!post) {
    return null;
  }

  const postTagRows = database
    .select({
      name: tags.name,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, postId))
    .orderBy(asc(tags.name))
    .all();

  return {
    ...post,
    tags: postTagRows.map((tag) => tag.name),
  };
}

export async function createPost(
  input: PostFormInput,
  database: PostDatabase = db
): Promise<PersistedPostResult> {
  const baseSlug = createSlug(input.slug || input.title);
  const finalSlug = await ensureUniqueSlug(baseSlug, database);
  const status = normalizeStatus(input.status);
  const now = new Date().toISOString();
  const parsedDate = parseOptionalDate(input.date);
  const createdAt = parsedDate ?? now;

  const inserted = database
    .insert(posts)
    .values({
      title: input.title.trim(),
      slug: finalSlug,
      content: input.content,
      excerpt: parseOptionalText(input.excerpt),
      coverImage: parseOptionalText(input.coverImage),
      status,
      categoryId: parseCategoryId(input.categoryId),
      createdAt,
      updatedAt: now,
      publishedAt: status === "published" ? parsedDate ?? now : null,
    })
    .returning({ id: posts.id })
    .get();

  if (!inserted) {
    throw new Error("Failed to create post");
  }

  await upsertPostTags(inserted.id, input.tags, database);

  return {
    postId: inserted.id,
    slug: finalSlug,
    slugAdjusted: finalSlug !== baseSlug,
  };
}

export async function updatePost(
  postId: number,
  input: PostFormInput,
  database: PostDatabase = db
): Promise<PersistedPostResult | null> {
  const existingPost = database
    .select({
      id: posts.id,
      status: posts.status,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .get();

  if (!existingPost) {
    return null;
  }

  const baseSlug = createSlug(input.slug || input.title);
  const finalSlug = await ensureUniqueSlug(baseSlug, database, postId);
  const status = normalizeStatus(input.status);
  const now = new Date().toISOString();
  const parsedDate = parseOptionalDate(input.date);
  const nextPublishedAt =
    status === "published"
      ? parsedDate ?? existingPost.publishedAt ?? now
      : null;

  const updatePayload = {
    title: input.title.trim(),
    slug: finalSlug,
    content: input.content,
    excerpt: parseOptionalText(input.excerpt),
    coverImage: parseOptionalText(input.coverImage),
    status,
    categoryId: parseCategoryId(input.categoryId),
    updatedAt: now,
    publishedAt: nextPublishedAt,
  };

  database.update(posts).set(updatePayload).where(eq(posts.id, postId)).run();
  await upsertPostTags(postId, input.tags, database);

  return {
    postId,
    slug: finalSlug,
    slugAdjusted: finalSlug !== baseSlug,
  };
}

export async function deletePost(postId: number, database: PostDatabase = db) {
  const post = database
    .select({
      slug: posts.slug,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .get();

  if (!post) {
    return null;
  }

  database.delete(posts).where(eq(posts.id, postId)).run();
  return post.slug;
}

export async function togglePostStatus(postId: number, database: PostDatabase = db) {
  const post = database
    .select({
      status: posts.status,
      slug: posts.slug,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .get();

  if (!post) {
    return null;
  }

  const nextStatus: PostStatus = post.status === "published" ? "draft" : "published";
  database
    .update(posts)
    .set({
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      publishedAt:
        nextStatus === "published"
          ? new Date().toISOString()
          : null,
    })
    .where(eq(posts.id, postId))
    .run();

  return {
    slug: post.slug,
    status: nextStatus,
  };
}

export async function getPublishedPosts(database: PostDatabase = db) {
  return database
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      categoryName: categories.name,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .all();
}

export async function getPublishedPostBySlug(
  slug: string,
  database: PostDatabase = db
) {
  const post = database
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      content: posts.content,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      categoryName: categories.name,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .get();

  if (!post) {
    return null;
  }

  const postTagRows = database
    .select({
      name: tags.name,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, post.id))
    .orderBy(asc(tags.name))
    .all();

  return {
    ...post,
    tags: postTagRows.map((tag) => tag.name),
  };
}

export { createSlug, resolveDuplicateSlug } from "@/lib/slug";
