import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyEntries } from "@/lib/db/schema";
import {
  DAILY_CONTENT_MAX_LENGTH,
  DAILY_IMAGES_MAX_COUNT,
  DAILY_LOCATION_MAX_LENGTH,
  DAILY_PAGE_SIZE,
  type DailyEntryStatus,
} from "@/lib/daily-shared";
export {
  DAILY_CONTENT_MAX_LENGTH,
  DAILY_IMAGES_MAX_COUNT,
  DAILY_LOCATION_MAX_LENGTH,
  DAILY_PAGE_SIZE,
  type DailyEntryStatus,
} from "@/lib/daily-shared";
const DAILY_TIME_ZONE = process.env.NEXT_PUBLIC_DAILY_TIME_ZONE || "Asia/Shanghai";

type DailyEntryRow = typeof dailyEntries.$inferSelect;
type DailyDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type DailyEntry = {
  id: number;
  content: string;
  images: string[];
  location: string | null;
  status: DailyEntryStatus;
  isPinned: boolean;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  tags: string[];
};

export type DailyEntryInput = {
  content: string;
  images: string[];
  location?: string | null;
  status: DailyEntryStatus;
  isPinned: boolean;
  occurredAt: string;
};

export type DailyTimelineQuery = {
  page?: number;
  tag?: string;
  year?: number;
};

export type DailyTimelineData = {
  entries: DailyEntry[];
  totalPublished: number;
  totalFiltered: number;
  availableYears: Array<{ year: number; count: number }>;
  popularTags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  activeYear: number | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

function isDailyEntryStatus(value: string): value is DailyEntryStatus {
  return value === "draft" || value === "published";
}

export function normalizeDailyContent(value: string) {
  return value.replace(/\r\n?/g, "\n").trim().slice(0, DAILY_CONTENT_MAX_LENGTH);
}

export function normalizeDailyLocation(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized ? normalized.slice(0, DAILY_LOCATION_MAX_LENGTH) : null;
}

export function normalizeDailyTag(value?: string | null) {
  return value?.trim().replace(/^#+/, "").toLocaleLowerCase().slice(0, 40) || null;
}

export function extractDailyTags(content: string) {
  const tags = new Map<string, string>();
  const pattern = /(?:^|\s)#([\p{L}\p{N}_-]{1,40})/gu;

  for (const match of content.matchAll(pattern)) {
    const value = match[1]?.trim();
    if (!value) {
      continue;
    }

    const normalized = value.toLocaleLowerCase();
    if (!tags.has(normalized)) {
      tags.set(normalized, value);
    }
  }

  return Array.from(tags.values());
}

function parseImages(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.startsWith("/uploads/daily/"))
      .slice(0, DAILY_IMAGES_MAX_COUNT);
  } catch {
    return [];
  }
}

function mapDailyEntry(row: DailyEntryRow): DailyEntry {
  return {
    id: row.id,
    content: row.content,
    images: parseImages(row.images),
    location: row.location,
    status: isDailyEntryStatus(row.status) ? row.status : "draft",
    isPinned: row.isPinned,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    tags: extractDailyTags(row.content),
  };
}

function getYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: DAILY_TIME_ZONE,
    }).format(date)
  );
  return Number.isInteger(year) ? year : null;
}

function getPublishedRows(database: DailyDatabase) {
  return database
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.status, "published"))
    .orderBy(desc(dailyEntries.isPinned), desc(dailyEntries.occurredAt), desc(dailyEntries.id))
    .all();
}

export async function getDailyTimeline(
  query: DailyTimelineQuery = {},
  database: DailyDatabase = db
): Promise<DailyTimelineData> {
  const allEntries = getPublishedRows(database).map(mapDailyEntry);
  const activeTag = normalizeDailyTag(query.tag);
  const requestedYear =
    Number.isInteger(query.year) && (query.year ?? 0) >= 1900 && (query.year ?? 0) <= 2100
      ? (query.year ?? null)
      : null;
  const availableYears = Array.from(
    allEntries.reduce((counts, entry) => {
      const year = getYear(entry.occurredAt);
      if (year) {
        counts.set(year, (counts.get(year) ?? 0) + 1);
      }
      return counts;
    }, new Map<number, number>())
  )
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => right.year - left.year);
  const popularTags = Array.from(
    allEntries
      .reduce((counts, entry) => {
        for (const tag of entry.tags) {
          const normalized = tag.toLocaleLowerCase();
          const current = counts.get(normalized);
          counts.set(normalized, {
            tag: current?.tag ?? tag,
            count: (current?.count ?? 0) + 1,
          });
        }
        return counts;
      }, new Map<string, { tag: string; count: number }>())
      .values()
  )
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
    .slice(0, 12);
  const filteredEntries = allEntries.filter((entry) => {
    const matchesTag = activeTag
      ? entry.tags.some((tag) => tag.toLocaleLowerCase() === activeTag)
      : true;
    const matchesYear = requestedYear ? getYear(entry.occurredAt) === requestedYear : true;
    return matchesTag && matchesYear;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / DAILY_PAGE_SIZE));
  const requestedPage = Number.isFinite(query.page) ? Math.floor(query.page ?? 1) : 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (currentPage - 1) * DAILY_PAGE_SIZE;

  return {
    entries: filteredEntries.slice(start, start + DAILY_PAGE_SIZE),
    totalPublished: allEntries.length,
    totalFiltered: filteredEntries.length,
    availableYears,
    popularTags,
    activeTag,
    activeYear: requestedYear,
    pagination: {
      currentPage,
      totalPages,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
  };
}

export async function getPublishedDailyEntryById(id: number, database: DailyDatabase = db) {
  const row = database.select().from(dailyEntries).where(eq(dailyEntries.id, id)).get();

  return row?.status === "published" ? mapDailyEntry(row) : null;
}

export async function getAdminDailyEntries(database: DailyDatabase = db) {
  return database
    .select()
    .from(dailyEntries)
    .orderBy(desc(dailyEntries.occurredAt), desc(dailyEntries.id))
    .all()
    .map(mapDailyEntry);
}

export async function getAdminDailyEntryById(id: number, database: DailyDatabase = db) {
  const row = database.select().from(dailyEntries).where(eq(dailyEntries.id, id)).get();
  return row ? mapDailyEntry(row) : null;
}

export async function createDailyEntry(input: DailyEntryInput, database: DailyDatabase = db) {
  const now = new Date().toISOString();
  return database
    .insert(dailyEntries)
    .values({
      content: normalizeDailyContent(input.content),
      images: JSON.stringify(input.images.slice(0, DAILY_IMAGES_MAX_COUNT)),
      location: normalizeDailyLocation(input.location),
      status: input.status,
      isPinned: input.isPinned,
      occurredAt: input.occurredAt,
      createdAt: now,
      updatedAt: now,
      publishedAt: input.status === "published" ? now : null,
    })
    .returning({ id: dailyEntries.id })
    .get();
}

export async function updateDailyEntry(
  id: number,
  input: DailyEntryInput,
  database: DailyDatabase = db
) {
  const existing = await getAdminDailyEntryById(id, database);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  database
    .update(dailyEntries)
    .set({
      content: normalizeDailyContent(input.content),
      images: JSON.stringify(input.images.slice(0, DAILY_IMAGES_MAX_COUNT)),
      location: normalizeDailyLocation(input.location),
      status: input.status,
      isPinned: input.isPinned,
      occurredAt: input.occurredAt,
      updatedAt: now,
      publishedAt:
        input.status === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
    })
    .where(eq(dailyEntries.id, id))
    .run();

  return getAdminDailyEntryById(id, database);
}

export async function deleteDailyEntry(id: number, database: DailyDatabase = db) {
  const existing = await getAdminDailyEntryById(id, database);
  if (!existing) {
    return null;
  }

  database.delete(dailyEntries).where(eq(dailyEntries.id, id)).run();
  return existing;
}

export async function toggleDailyEntryStatus(id: number, database: DailyDatabase = db) {
  const existing = await getAdminDailyEntryById(id, database);
  if (!existing) {
    return null;
  }

  const nextStatus: DailyEntryStatus = existing.status === "published" ? "draft" : "published";
  return updateDailyEntry(id, { ...existing, status: nextStatus }, database);
}

export async function toggleDailyEntryPinned(id: number, database: DailyDatabase = db) {
  const existing = await getAdminDailyEntryById(id, database);
  if (!existing) {
    return null;
  }

  return updateDailyEntry(id, { ...existing, isPinned: !existing.isPinned }, database);
}

export async function getDailySitemapEntries(database: DailyDatabase = db) {
  return getPublishedRows(database).map((row) => ({
    id: row.id,
    updatedAt: row.updatedAt,
  }));
}
