import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { readingBooks, readingNotes } from "@/lib/db/schema";
import { ManagementApiError, getLimit, getPage } from "@/lib/management/core";
import {
  assertExpectedUpdatedAt,
  optionalBoolean,
  optionalEnum,
  optionalIsoDate,
  optionalNumber,
  optionalString,
  requiredString,
} from "@/lib/management/validation";
import { runWereadSync } from "@/lib/weread-sync";

type ReadingBookUpdate = Partial<typeof readingBooks.$inferInsert>;

function mapBook(row: typeof readingBooks.$inferSelect) {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    author: row.author,
    cover: row.cover,
    category: row.category,
    status: row.status,
    progress: row.progress,
    rating: row.rating === null ? null : row.rating / 10,
    pages: row.pages,
    year: row.year,
    wordCount: row.wordCount,
    noteCount: row.noteCount,
    reviewCount: row.reviewCount,
    bookmarkCount: row.bookmarkCount,
    readingSeconds: row.readingSeconds,
    latestNote: row.latestNote,
    deepLink: row.deepLink,
    isPrivate: row.isPrivate,
    isTop: row.isTop,
    readUpdatedAt: row.readUpdatedAt,
    finishedAt: row.finishedAt,
    archivedAt: row.archivedAt,
    syncedAt: row.syncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listManagedBooks(url: URL) {
  const page = getPage(url.searchParams.get("page"));
  const limit = getLimit(url.searchParams.get("limit"));
  const status = url.searchParams.get("status");
  const visibility = url.searchParams.get("visibility") ?? "all";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  if (status && !["reading", "finished", "queued"].includes(status)) {
    throw new ManagementApiError(400, "invalid_parameter", "Invalid reading status.");
  }
  if (!["all", "public", "private"].includes(visibility)) {
    throw new ManagementApiError(400, "invalid_parameter", "Invalid visibility filter.");
  }

  const rows = db
    .select()
    .from(readingBooks)
    .orderBy(desc(readingBooks.isTop), desc(readingBooks.readUpdatedAt), desc(readingBooks.updatedAt))
    .all()
    .filter((row) => includeArchived || !row.archivedAt)
    .filter((row) => !status || row.status === status)
    .filter((row) => visibility === "all" || (visibility === "private" ? row.isPrivate : !row.isPrivate));
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;

  return {
    items: rows.slice(start, start + limit).map(mapBook),
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

export async function getManagedBook(sourceId: string) {
  const row = db.select().from(readingBooks).where(eq(readingBooks.sourceId, sourceId)).get();
  if (!row) {
    throw new ManagementApiError(404, "not_found", "Book not found.");
  }
  const notes = db
    .select({
      sourceId: readingNotes.sourceId,
      type: readingNotes.type,
      content: readingNotes.content,
      abstract: readingNotes.abstract,
      chapterTitle: readingNotes.chapterTitle,
      createdAt: readingNotes.createdAt,
      syncedAt: readingNotes.syncedAt,
    })
    .from(readingNotes)
    .where(eq(readingNotes.bookSourceId, sourceId))
    .orderBy(desc(readingNotes.createdAt), desc(readingNotes.syncedAt))
    .all();
  return { ...mapBook(row), notes };
}

export async function updateManagedBook(sourceId: string, body: Record<string, unknown>) {
  const existing = await getManagedBook(sourceId);
  assertExpectedUpdatedAt(body, existing.updatedAt);
  const update: ReadingBookUpdate = { updatedAt: new Date().toISOString() };

  const title = optionalString(body, "title", 300, { allowEmpty: false });
  const author = optionalString(body, "author", 300);
  const cover = optionalString(body, "cover", 2_000, { nullable: true });
  const category = optionalString(body, "category", 120, { nullable: true });
  const status = optionalEnum(body, "status", ["reading", "finished", "queued"] as const);
  const progress = optionalNumber(body, "progress", { minimum: 0, maximum: 100, integer: true });
  const rating = optionalNumber(body, "rating", { minimum: 0, maximum: 5, nullable: true });
  const pages = optionalNumber(body, "pages", { minimum: 0, maximum: 1_000_000, integer: true });
  const year = optionalNumber(body, "year", { minimum: 0, maximum: 3000, integer: true, nullable: true });
  const readingSeconds = optionalNumber(body, "readingSeconds", {
    minimum: 0,
    maximum: 2_147_483_647,
    integer: true,
  });
  const latestNote = optionalString(body, "latestNote", 10_000, { nullable: true });
  const deepLink = optionalString(body, "deepLink", 2_000, { nullable: true });
  const isPrivate = optionalBoolean(body, "isPrivate");
  const isTop = optionalBoolean(body, "isTop");
  const archived = optionalBoolean(body, "archived");
  const readUpdatedAt = optionalIsoDate(body, "readUpdatedAt", { nullable: true });
  const finishedAt = optionalIsoDate(body, "finishedAt", { nullable: true });

  if (title !== undefined) update.title = title;
  if (author !== undefined) update.author = author;
  if (cover !== undefined) update.cover = cover;
  if (category !== undefined) update.category = category;
  if (status !== undefined) update.status = status;
  if (progress !== undefined) update.progress = progress;
  if (rating !== undefined) update.rating = rating === null ? null : Math.round(rating * 10);
  if (pages !== undefined) update.pages = pages;
  if (year !== undefined) update.year = year;
  if (readingSeconds !== undefined) update.readingSeconds = readingSeconds;
  if (latestNote !== undefined) update.latestNote = latestNote;
  if (deepLink !== undefined) update.deepLink = deepLink;
  if (isPrivate !== undefined) update.isPrivate = isPrivate;
  if (isTop !== undefined) update.isTop = isTop;
  if (archived !== undefined) update.archivedAt = archived ? new Date().toISOString() : null;
  if (readUpdatedAt !== undefined) update.readUpdatedAt = readUpdatedAt;
  if (finishedAt !== undefined) update.finishedAt = finishedAt;

  db.update(readingBooks).set(update).where(eq(readingBooks.sourceId, sourceId)).run();
  revalidatePath("/books");
  revalidatePath("/admin/books");
  return getManagedBook(sourceId);
}

export async function createManagedBookNote(sourceId: string, body: Record<string, unknown>) {
  await getManagedBook(sourceId);
  const type = optionalEnum(body, "type", ["highlight", "review"] as const) ?? "review";
  const content = requiredString(body, "content", 10_000);
  const abstract = optionalString(body, "thought", 5_000, { nullable: true }) ?? null;
  const chapterTitle = optionalString(body, "chapterTitle", 500, { nullable: true }) ?? null;
  const createdAt = optionalIsoDate(body, "createdAt") ?? new Date().toISOString();
  const now = new Date().toISOString();
  const noteSourceId = `manual:${randomUUID()}`;

  db.insert(readingNotes)
    .values({
      sourceId: noteSourceId,
      bookSourceId: sourceId,
      type,
      content,
      abstract,
      chapterTitle,
      createdAt,
      rawPayload: null,
      syncedAt: now,
    })
    .run();
  db.update(readingBooks)
    .set({ latestNote: content, updatedAt: now })
    .where(eq(readingBooks.sourceId, sourceId))
    .run();
  revalidatePath("/books");

  return {
    sourceId: noteSourceId,
    bookSourceId: sourceId,
    type,
    content,
    thought: abstract,
    chapterTitle,
    createdAt,
  };
}

export async function deleteManagedBookNote(sourceId: string, noteSourceId: string) {
  const note = db
    .select({ sourceId: readingNotes.sourceId })
    .from(readingNotes)
    .where(
      and(
        eq(readingNotes.sourceId, noteSourceId),
        eq(readingNotes.bookSourceId, sourceId)
      )
    )
    .get();
  if (!note) {
    throw new ManagementApiError(404, "not_found", "Book note not found.");
  }
  const result = db
    .delete(readingNotes)
    .where(
      and(
        eq(readingNotes.sourceId, noteSourceId),
        eq(readingNotes.bookSourceId, sourceId)
      )
    )
    .run();
  if (!result.changes) {
    throw new ManagementApiError(404, "not_found", "Book note not found.");
  }
  revalidatePath("/books");
  return { sourceId: noteSourceId, bookSourceId: sourceId, deleted: true };
}

export async function syncManagedWeread() {
  const result = await runWereadSync();
  if (!result.ok) {
    throw new ManagementApiError(502, "weread_sync_failed", result.error ?? "WeRead sync failed.");
  }
  revalidatePath("/books");
  revalidatePath("/admin/books");
  return result;
}
