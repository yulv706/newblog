import { revalidatePath } from "next/cache";
import {
  createPrivateEntry,
  deletePrivateEntry,
  getPrivateEntries,
  getPrivateEntryById,
  getPrivateEntryStats,
  normalizePrivateTags,
  setPrivateEntryStatus,
  updatePrivateEntry,
  type PrivateEntry,
  type PrivateEntryInput,
  type PrivateEntryStatus,
  type PrivateEntryView,
} from "@/lib/private-notes";
import { ManagementApiError, getLimit, getPage } from "@/lib/management/core";
import {
  assertExpectedUpdatedAt,
  hasField,
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalStringArray,
  requiredString,
} from "@/lib/management/validation";

const PRIVATE_NOTE_VIEWS = ["all", "thought", "goal", "completed"] as const;
const PRIVATE_NOTE_STATUSES = ["active", "completed", "archived"] as const;
const PRIVATE_NOTE_PRIORITIES = ["low", "medium", "high"] as const;

function revalidatePrivateNotes() {
  revalidatePath("/admin/private");
}

function parseTargetDate(body: Record<string, unknown>, fallback: string | null) {
  if (!hasField(body, "targetDate")) {
    return fallback;
  }
  const value = optionalString(body, "targetDate", 10, { nullable: true });
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ManagementApiError(400, "invalid_field", "targetDate must be YYYY-MM-DD.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ManagementApiError(400, "invalid_field", "targetDate must be a valid calendar date.");
  }
  return value;
}

function parseTags(body: Record<string, unknown>, fallback: string[]) {
  if (!hasField(body, "tags")) {
    return fallback;
  }
  const value = body.tags;
  const tags =
    typeof value === "string"
      ? value.split(/[,\uFF0C\n]/u).map((tag) => tag.trim()).filter(Boolean)
      : optionalStringArray(body, "tags", { maximumItems: 8, maximumLength: 28 }) ?? [];
  if (tags.length > 8 || tags.some((tag) => tag.length > 28)) {
    throw new ManagementApiError(400, "invalid_field", "tags may contain at most 8 values of 28 characters.");
  }
  return normalizePrivateTags(tags);
}

function buildPrivateEntryInput(
  body: Record<string, unknown>,
  existing?: PrivateEntry
): PrivateEntryInput {
  const kind = optionalEnum(body, "kind", ["thought", "goal"] as const) ?? existing?.kind ?? "thought";
  const title = existing
    ? optionalString(body, "title", 120, { allowEmpty: false }) ?? existing.title
    : requiredString(body, "title", 120);
  const content = existing
    ? optionalString(body, "content", 12_000, { allowEmpty: false }) ?? existing.content
    : requiredString(body, "content", 12_000);
  const status = optionalEnum(body, "status", PRIVATE_NOTE_STATUSES) ?? existing?.status ?? "active";
  const priority = optionalEnum(body, "priority", PRIVATE_NOTE_PRIORITIES) ?? existing?.priority ?? "medium";
  const progress = optionalNumber(body, "progress", { minimum: 0, maximum: 100, integer: true }) ?? existing?.progress ?? 0;

  return {
    kind,
    title,
    content,
    status,
    priority,
    progress,
    targetDate: parseTargetDate(body, existing?.targetDate ?? null),
    tags: parseTags(body, existing?.tags ?? []),
  };
}

function parseView(value: string | null): PrivateEntryView {
  if (!value) return "all";
  if (!PRIVATE_NOTE_VIEWS.includes(value as PrivateEntryView)) {
    throw new ManagementApiError(400, "invalid_parameter", "view must be all, thought, goal, or completed.");
  }
  return value as PrivateEntryView;
}

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

export async function listManagedPrivateNotes(url: URL) {
  const view = parseView(url.searchParams.get("view"));
  const search = url.searchParams.get("query")?.trim().slice(0, 120) ?? "";
  const page = getPage(url.searchParams.get("page"));
  const limit = getLimit(url.searchParams.get("limit"));
  const [entries, stats] = await Promise.all([
    getPrivateEntries({ view, search }),
    getPrivateEntryStats(),
  ]);
  return { ...paginated(entries, page, limit), stats };
}

export async function getManagedPrivateNote(id: number) {
  const entry = await getPrivateEntryById(id);
  if (!entry) {
    throw new ManagementApiError(404, "not_found", "Private note not found.");
  }
  return entry;
}

export async function createManagedPrivateNote(body: Record<string, unknown>) {
  const created = createPrivateEntry(buildPrivateEntryInput(body));
  revalidatePrivateNotes();
  return getManagedPrivateNote(created.id);
}

export async function updateManagedPrivateNote(id: number, body: Record<string, unknown>) {
  const existing = await getManagedPrivateNote(id);
  assertExpectedUpdatedAt(body, existing.updatedAt);
  const updated = updatePrivateEntry(id, buildPrivateEntryInput(body, existing));
  if (!updated) {
    throw new ManagementApiError(404, "not_found", "Private note not found.");
  }
  revalidatePrivateNotes();
  return updated;
}

export async function updateManagedPrivateNoteStatus(
  id: number,
  body: Record<string, unknown>
) {
  const existing = await getManagedPrivateNote(id);
  assertExpectedUpdatedAt(body, existing.updatedAt);
  const status = optionalEnum(body, "status", PRIVATE_NOTE_STATUSES);
  if (!status) {
    throw new ManagementApiError(400, "invalid_field", "status is required.");
  }
  const updated = setPrivateEntryStatus(id, status as PrivateEntryStatus);
  if (!updated) {
    throw new ManagementApiError(404, "not_found", "Private note not found.");
  }
  revalidatePrivateNotes();
  return updated;
}

export async function deleteManagedPrivateNote(id: number) {
  const deleted = deletePrivateEntry(id);
  if (!deleted) {
    throw new ManagementApiError(404, "not_found", "Private note not found.");
  }
  revalidatePrivateNotes();
  return { id, title: deleted.title, deleted: true };
}
