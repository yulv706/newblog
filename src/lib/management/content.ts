import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategoryById,
  deleteTagIfUnused,
  getAdminCategorySummaries,
  getAdminTagSummaries,
} from "@/lib/admin/category-tags";
import {
  approveComment,
  deleteComment,
  getApprovedCommentsForAdmin,
  getPendingCommentsForAdmin,
} from "@/lib/comments";
import {
  DAILY_CONTENT_MAX_LENGTH,
  DAILY_IMAGES_MAX_COUNT,
  DAILY_LOCATION_MAX_LENGTH,
  createDailyEntry,
  deleteDailyEntry,
  getAdminDailyEntries,
  getAdminDailyEntryById,
  updateDailyEntry,
} from "@/lib/daily";
import { deleteDailyImages, isManagedDailyImage } from "@/lib/daily-media";
import { db } from "@/lib/db";
import { comments, siteSettings } from "@/lib/db/schema";
import { ManagementApiError, getLimit, getPage } from "@/lib/management/core";
import {
  assertExpectedUpdatedAt,
  hasField,
  optionalBoolean,
  optionalEnum,
  optionalIsoDate,
  optionalNumber,
  optionalString,
  optionalStringArray,
  requiredString,
} from "@/lib/management/validation";
import {
  createPost,
  deletePost,
  getAdminPosts,
  getPostForEdit,
  updatePost,
} from "@/lib/posts";
import { ABOUT_CONTENT_KEY, getAboutContent, saveAboutContent } from "@/lib/site-settings";

function paginated<T>(items: T[], page: number, limit: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      limit,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
  };
}

function validateCoverImage(value: string | null | undefined) {
  if (!value) {
    return;
  }
  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) {
    throw new ManagementApiError(
      400,
      "invalid_field",
      "coverImage must be an absolute HTTP(S) URL or a root-relative path."
    );
  }
}

function getTags(body: Record<string, unknown>, fallback: string[]) {
  if (!hasField(body, "tags")) {
    return fallback;
  }
  if (typeof body.tags === "string") {
    const values = body.tags.split(",").map((value) => value.trim()).filter(Boolean);
    if (values.length > 20 || values.some((value) => value.length > 50)) {
      throw new ManagementApiError(400, "invalid_field", "tags contains too many or oversized values.");
    }
    return Array.from(new Set(values));
  }
  return optionalStringArray(body, "tags", { maximumItems: 20, maximumLength: 50 }) ?? fallback;
}

async function buildPostInput(
  body: Record<string, unknown>,
  existing?: NonNullable<Awaited<ReturnType<typeof getPostForEdit>>>
) {
  const title = existing
    ? optionalString(body, "title", 200, { allowEmpty: false }) ?? existing.title
    : requiredString(body, "title", 200);
  const content = existing
    ? optionalString(body, "content", 400_000, { allowEmpty: false }) ?? existing.content
    : requiredString(body, "content", 400_000);
  const slug = optionalString(body, "slug", 200) ?? existing?.slug ?? title;
  const requestedExcerpt = optionalString(body, "excerpt", 1_000, { nullable: true });
  const excerpt =
    requestedExcerpt === undefined ? existing?.excerpt ?? "" : requestedExcerpt ?? "";
  const requestedCoverImage = optionalString(body, "coverImage", 2_000, { nullable: true });
  const coverImage =
    requestedCoverImage === undefined
      ? existing?.coverImage ?? ""
      : requestedCoverImage ?? "";
  validateCoverImage(coverImage);
  const status = optionalEnum(body, "status", ["draft", "published"] as const) ?? existing?.status ?? "draft";
  const categoryId = optionalNumber(body, "categoryId", {
    minimum: 1,
    maximum: 2_147_483_647,
    integer: true,
    nullable: true,
  });
  const publishedAt = optionalIsoDate(body, "publishedAt", { nullable: true });

  return {
    title,
    slug,
    content,
    excerpt: excerpt ?? "",
    coverImage: coverImage ?? "",
    status,
    categoryId:
      categoryId === undefined
        ? existing?.categoryId
          ? String(existing.categoryId)
          : ""
        : categoryId === null
          ? ""
          : String(categoryId),
    tags: getTags(body, existing?.tags ?? []).join(","),
    date:
      publishedAt === undefined
        ? existing?.publishedAt ?? ""
        : publishedAt ?? "",
  };
}

export async function listManagedPosts(url: URL) {
  const page = getPage(url.searchParams.get("page"));
  const limit = getLimit(url.searchParams.get("limit"));
  const status = url.searchParams.get("status");
  if (status && status !== "draft" && status !== "published") {
    throw new ManagementApiError(400, "invalid_parameter", "status must be draft or published.");
  }
  const rows = (await getAdminPosts()).filter((post) => !status || post.status === status);
  return paginated(rows, page, limit);
}

export async function getManagedPost(id: number) {
  const post = await getPostForEdit(id);
  if (!post) {
    throw new ManagementApiError(404, "not_found", "Post not found.");
  }
  return post;
}

export async function createManagedPost(body: Record<string, unknown>) {
  const input = await buildPostInput(body);
  const created = await createPost(input);
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${created.slug}`);
  return getManagedPost(created.postId);
}

export async function updateManagedPost(id: number, body: Record<string, unknown>) {
  const existing = await getManagedPost(id);
  assertExpectedUpdatedAt(body, existing.updatedAt);
  const input = await buildPostInput(body, existing);
  const updated = await updatePost(id, input);
  if (!updated) {
    throw new ManagementApiError(404, "not_found", "Post not found.");
  }
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath(`/blog/${updated.slug}`);
  return getManagedPost(id);
}

export async function deleteManagedPost(id: number) {
  const existing = await getManagedPost(id);
  await deletePost(id);
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  return { id, slug: existing.slug, deleted: true };
}

function validateDailyImages(images: string[]) {
  if (images.length > DAILY_IMAGES_MAX_COUNT || images.some((image) => !isManagedDailyImage(image))) {
    throw new ManagementApiError(
      400,
      "invalid_field",
      `images must contain at most ${DAILY_IMAGES_MAX_COUNT} managed daily image URLs.`
    );
  }
}

function buildDailyInput(
  body: Record<string, unknown>,
  existing?: NonNullable<Awaited<ReturnType<typeof getAdminDailyEntryById>>>
) {
  const content = existing
    ? optionalString(body, "content", DAILY_CONTENT_MAX_LENGTH, { allowEmpty: false }) ?? existing.content
    : requiredString(body, "content", DAILY_CONTENT_MAX_LENGTH);
  const images = optionalStringArray(body, "images", {
    maximumItems: DAILY_IMAGES_MAX_COUNT,
    maximumLength: 200,
  }) ?? existing?.images ?? [];
  validateDailyImages(images);
  const requestedLocation = optionalString(body, "location", DAILY_LOCATION_MAX_LENGTH, {
    nullable: true,
  });
  const location =
    requestedLocation === undefined ? existing?.location ?? null : requestedLocation;
  const status = optionalEnum(body, "status", ["draft", "published"] as const) ?? existing?.status ?? "draft";
  const isPinned = optionalBoolean(body, "isPinned") ?? existing?.isPinned ?? false;
  const occurredAt = optionalIsoDate(body, "occurredAt") ?? existing?.occurredAt ?? new Date().toISOString();

  return { content, images, location, status, isPinned, occurredAt };
}

function revalidateDaily(id?: number) {
  revalidatePath("/daily");
  revalidatePath("/admin/daily");
  revalidatePath("/sitemap.xml");
  if (id) {
    revalidatePath(`/daily/${id}`);
  }
}

export async function listManagedDaily(url: URL) {
  const page = getPage(url.searchParams.get("page"));
  const limit = getLimit(url.searchParams.get("limit"));
  const status = url.searchParams.get("status");
  if (status && status !== "draft" && status !== "published") {
    throw new ManagementApiError(400, "invalid_parameter", "status must be draft or published.");
  }
  const rows = (await getAdminDailyEntries()).filter((entry) => !status || entry.status === status);
  return paginated(rows, page, limit);
}

export async function getManagedDaily(id: number) {
  const entry = await getAdminDailyEntryById(id);
  if (!entry) {
    throw new ManagementApiError(404, "not_found", "Daily entry not found.");
  }
  return entry;
}

export async function createManagedDaily(body: Record<string, unknown>) {
  const created = await createDailyEntry(buildDailyInput(body));
  revalidateDaily(created.id);
  return getManagedDaily(created.id);
}

export async function updateManagedDaily(id: number, body: Record<string, unknown>) {
  const existing = await getManagedDaily(id);
  assertExpectedUpdatedAt(body, existing.updatedAt);
  const updated = await updateDailyEntry(id, buildDailyInput(body, existing));
  if (!updated) {
    throw new ManagementApiError(404, "not_found", "Daily entry not found.");
  }
  const removedImages = existing.images.filter((image) => !updated.images.includes(image));
  try {
    await deleteDailyImages(removedImages);
  } catch (error) {
    console.error("Unable to clean up replaced management daily images", error);
  }
  revalidateDaily(id);
  return updated;
}

export async function deleteManagedDaily(id: number) {
  const deleted = await deleteDailyEntry(id);
  if (!deleted) {
    throw new ManagementApiError(404, "not_found", "Daily entry not found.");
  }
  try {
    await deleteDailyImages(deleted.images);
  } catch (error) {
    console.error("Unable to clean up deleted management daily images", error);
  }
  revalidateDaily(id);
  return { id, deleted: true };
}

export async function getManagedAbout() {
  const row = db
    .select({ value: siteSettings.value, updatedAt: siteSettings.updatedAt })
    .from(siteSettings)
    .where(eq(siteSettings.key, ABOUT_CONTENT_KEY))
    .get();
  return { content: row?.value ?? (await getAboutContent()) ?? "", updatedAt: row?.updatedAt ?? null };
}

export async function updateManagedAbout(body: Record<string, unknown>) {
  const existing = await getManagedAbout();
  if (existing.updatedAt) {
    assertExpectedUpdatedAt(body, existing.updatedAt);
  }
  const content = requiredString(body, "content", 400_000, { allowEmpty: true });
  await saveAboutContent(content);
  revalidatePath("/about");
  revalidatePath("/admin/about");
  return getManagedAbout();
}

export async function getManagedTaxonomy() {
  const [categories, tags] = await Promise.all([
    getAdminCategorySummaries(),
    getAdminTagSummaries(),
  ]);
  return { categories, tags };
}

export async function createManagedCategory(body: Record<string, unknown>) {
  const result = await createCategory(requiredString(body, "name", 80));
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  return result;
}

export async function deleteManagedCategory(id: number) {
  const existing = (await getAdminCategorySummaries()).find((item) => item.id === id);
  if (!existing) {
    throw new ManagementApiError(404, "not_found", "Category not found.");
  }
  await deleteCategoryById(id);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  return { id, deleted: true, detachedPosts: existing.postCount };
}

export async function deleteManagedTag(id: number) {
  const result = await deleteTagIfUnused(id);
  if (!result.deleted) {
    throw new ManagementApiError(409, "tag_in_use", result.reason);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/blog");
  return { id, deleted: true };
}

export async function listManagedComments(url: URL) {
  const status = url.searchParams.get("status") ?? "pending";
  const limit = getLimit(url.searchParams.get("limit"), 30);
  if (status === "pending") {
    return { items: (await getPendingCommentsForAdmin()).slice(0, limit), status };
  }
  if (status === "approved") {
    return { items: await getApprovedCommentsForAdmin(undefined, limit), status };
  }
  throw new ManagementApiError(400, "invalid_parameter", "status must be pending or approved.");
}

export async function updateManagedComment(id: number, body: Record<string, unknown>) {
  const approved = optionalBoolean(body, "approved");
  if (approved === undefined) {
    throw new ManagementApiError(400, "invalid_field", "approved is required.");
  }
  const existing = db.select().from(comments).where(eq(comments.id, id)).get();
  if (!existing) {
    throw new ManagementApiError(404, "not_found", "Comment not found.");
  }
  if (approved) {
    await approveComment(id);
  } else {
    db.update(comments).set({ approved: false }).where(eq(comments.id, id)).run();
  }
  revalidatePath("/admin/comments");
  revalidatePath("/blog");
  return { id, approved };
}

export async function deleteManagedComment(id: number) {
  const deleted = await deleteComment(id);
  if (!deleted) {
    throw new ManagementApiError(404, "not_found", "Comment not found.");
  }
  revalidatePath("/admin/comments");
  revalidatePath("/blog");
  return { id, deleted: true };
}
