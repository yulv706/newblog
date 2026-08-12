import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { privateEntries } from "@/lib/db/schema";

export const PRIVATE_TITLE_MAX_LENGTH = 120;
export const PRIVATE_CONTENT_MAX_LENGTH = 12_000;
export const PRIVATE_TAG_MAX_LENGTH = 28;
export const PRIVATE_TAG_LIMIT = 8;

export type PrivateEntryKind = "thought" | "goal";
export type PrivateEntryStatus = "active" | "completed" | "archived";
export type PrivateEntryPriority = "low" | "medium" | "high";
export type PrivateEntryView = "all" | "thought" | "goal" | "completed";

type PrivateEntryRow = typeof privateEntries.$inferSelect;
type PrivateDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type PrivateEntry = {
  id: number;
  kind: PrivateEntryKind;
  title: string;
  content: string;
  status: PrivateEntryStatus;
  priority: PrivateEntryPriority;
  progress: number;
  targetDate: string | null;
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PrivateEntryInput = {
  kind: PrivateEntryKind;
  title: string;
  content: string;
  status: PrivateEntryStatus;
  priority: PrivateEntryPriority;
  progress: number;
  targetDate?: string | null;
  tags: string[];
};

export type PrivateEntryQuery = {
  view?: PrivateEntryView;
  search?: string;
};

function isKind(value: string): value is PrivateEntryKind {
  return value === "thought" || value === "goal";
}

function isStatus(value: string): value is PrivateEntryStatus {
  return value === "active" || value === "completed" || value === "archived";
}

function isPriority(value: string): value is PrivateEntryPriority {
  return value === "low" || value === "medium" || value === "high";
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, PRIVATE_TAG_LIMIT);
  } catch {
    return [];
  }
}

function mapEntry(row: PrivateEntryRow): PrivateEntry {
  return {
    id: row.id,
    kind: isKind(row.kind) ? row.kind : "thought",
    title: row.title,
    content: row.content,
    status: isStatus(row.status) ? row.status : "active",
    priority: isPriority(row.priority) ? row.priority : "medium",
    progress: Math.min(100, Math.max(0, row.progress)),
    targetDate: row.targetDate,
    tags: parseTags(row.tags),
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function normalizePrivateTitle(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, PRIVATE_TITLE_MAX_LENGTH);
}

export function normalizePrivateContent(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000\u0001\u0002\u0003]/g, "").trim().slice(0, PRIVATE_CONTENT_MAX_LENGTH);
}

export function normalizePrivateTags(value: string | string[]) {
  const source = Array.isArray(value) ? value : value.split(/[,\uFF0C\n]/u);
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of source) {
    const tag = rawTag
      .replace(/^#+/u, "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, PRIVATE_TAG_MAX_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
    if (tags.length >= PRIVATE_TAG_LIMIT) {
      break;
    }
  }

  return tags;
}

export function normalizePrivateTargetDate(value?: string | null) {
  const targetDate = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/u.test(targetDate) ? targetDate : null;
}

export function normalizePrivateProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getAllEntries(database: PrivateDatabase) {
  return database
    .select()
    .from(privateEntries)
    .orderBy(desc(privateEntries.updatedAt), desc(privateEntries.id))
    .all()
    .map(mapEntry);
}

export async function getPrivateEntries(
  query: PrivateEntryQuery = {},
  database: PrivateDatabase = db
) {
  const view = query.view ?? "all";
  const search = query.search?.trim().toLocaleLowerCase() ?? "";

  return getAllEntries(database).filter((entry) => {
    const matchesView =
      view === "all"
        ? entry.status !== "archived"
        : view === "completed"
          ? entry.status === "completed"
          : entry.kind === view && entry.status !== "archived";
    const haystack = `${entry.title}\n${entry.content}\n${entry.tags.join(" ")}`.toLocaleLowerCase();
    return matchesView && (!search || haystack.includes(search));
  });
}

export async function getPrivateEntryById(id: number, database: PrivateDatabase = db) {
  const row = database.select().from(privateEntries).where(eq(privateEntries.id, id)).get();
  return row ? mapEntry(row) : null;
}

export async function getPrivateEntryStats(database: PrivateDatabase = db) {
  const entries = getAllEntries(database);
  return {
    all: entries.length,
    activeGoals: entries.filter((entry) => entry.kind === "goal" && entry.status === "active").length,
    openThoughts: entries.filter((entry) => entry.kind === "thought" && entry.status === "active").length,
    completed: entries.filter((entry) => entry.status === "completed").length,
  };
}

export function createPrivateEntry(input: PrivateEntryInput, database: PrivateDatabase = db) {
  const now = new Date().toISOString();
  const status = input.status;
  const progress = status === "completed" ? 100 : normalizePrivateProgress(input.progress);
  return database
    .insert(privateEntries)
    .values({
      kind: input.kind,
      title: normalizePrivateTitle(input.title),
      content: normalizePrivateContent(input.content),
      status,
      priority: input.priority,
      progress,
      targetDate: normalizePrivateTargetDate(input.targetDate),
      tags: JSON.stringify(normalizePrivateTags(input.tags)),
      completedAt: status === "completed" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: privateEntries.id })
    .get();
}

export function updatePrivateEntry(
  id: number,
  input: PrivateEntryInput,
  database: PrivateDatabase = db
) {
  const existing = database.select().from(privateEntries).where(eq(privateEntries.id, id)).get();
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const status = input.status;
  const progress = status === "completed" ? 100 : normalizePrivateProgress(input.progress);
  database
    .update(privateEntries)
    .set({
      kind: input.kind,
      title: normalizePrivateTitle(input.title),
      content: normalizePrivateContent(input.content),
      status,
      priority: input.priority,
      progress,
      targetDate: normalizePrivateTargetDate(input.targetDate),
      tags: JSON.stringify(normalizePrivateTags(input.tags)),
      completedAt: status === "completed" ? existing.completedAt ?? now : null,
      updatedAt: now,
    })
    .where(eq(privateEntries.id, id))
    .run();

  return getPrivateEntryById(id, database);
}

export function setPrivateEntryStatus(
  id: number,
  status: PrivateEntryStatus,
  database: PrivateDatabase = db
) {
  const now = new Date().toISOString();
  const existing = database.select().from(privateEntries).where(eq(privateEntries.id, id)).get();
  if (!existing) {
    return null;
  }

  database
    .update(privateEntries)
    .set({
      status,
      progress: status === "completed" ? 100 : existing.progress,
      completedAt: status === "completed" ? now : null,
      updatedAt: now,
    })
    .where(eq(privateEntries.id, id))
    .run();
  return getPrivateEntryById(id, database);
}

export function deletePrivateEntry(id: number, database: PrivateDatabase = db) {
  const existing = database.select().from(privateEntries).where(eq(privateEntries.id, id)).get();
  if (!existing) {
    return null;
  }
  database.delete(privateEntries).where(eq(privateEntries.id, id)).run();
  return mapEntry(existing);
}
