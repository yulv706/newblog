"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  DAILY_CONTENT_MAX_LENGTH,
  DAILY_IMAGES_MAX_COUNT,
  createDailyEntry,
  deleteDailyEntry,
  getAdminDailyEntryById,
  normalizeDailyContent,
  toggleDailyEntryPinned,
  toggleDailyEntryStatus,
  updateDailyEntry,
  type DailyEntryInput,
  type DailyEntryStatus,
} from "@/lib/daily";
import { getDailyCopy } from "@/lib/daily-copy";
import { deleteDailyImages, saveDailyImages } from "@/lib/daily-media";
import { getRequestI18n } from "@/lib/i18n/server";

export type DailyFormActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const INITIAL_STATE: DailyFormActionState = {
  status: "idle",
  message: null,
};

type DailyValidationResult =
  | { error: string }
  | {
      input: Omit<DailyEntryInput, "images">;
      messages: ReturnType<typeof getDailyCopy>["admin"]["messages"];
    };

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getEntryId(formData: FormData) {
  const id = Number.parseInt(getString(formData, "entryId"), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getStatus(formData: FormData): DailyEntryStatus {
  return getString(formData, "status") === "published" ? "published" : "draft";
}

function getUploadedFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function parseOccurredAt(formData: FormData) {
  const value = getString(formData, "occurredAt");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const timezoneOffset = Number.parseInt(getString(formData, "timezoneOffset"), 10);
  const safeOffset = Number.isFinite(timezoneOffset)
    ? Math.min(840, Math.max(-840, timezoneOffset))
    : 0;
  const [, year, month, day, hour, minute] = match;
  const timestamp =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) +
    safeOffset * 60_000;
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function revalidateDailyPaths(id?: number) {
  revalidatePath("/daily");
  revalidatePath("/admin/daily");
  revalidatePath("/sitemap.xml");
  if (id) {
    revalidatePath(`/daily/${id}`);
    revalidatePath(`/admin/daily/${id}/edit`);
  }
}

async function readValidatedInput(formData: FormData): Promise<DailyValidationResult> {
  const { locale } = await getRequestI18n();
  const messages = getDailyCopy(locale).admin.messages;
  const rawContent = getString(formData, "content").replace(/\r\n?/g, "\n").trim();
  if (!rawContent) {
    return { error: messages.contentRequired } as const;
  }
  if (rawContent.length > DAILY_CONTENT_MAX_LENGTH) {
    return { error: messages.contentTooLong } as const;
  }

  const occurredAt = parseOccurredAt(formData);
  if (!occurredAt) {
    return { error: messages.invalidDate } as const;
  }

  return {
    input: {
      content: normalizeDailyContent(rawContent),
      location: getString(formData, "location"),
      occurredAt,
      status: getStatus(formData),
      isPinned: getString(formData, "isPinned") === "on",
    },
    messages,
  } as const;
}

export async function createDailyEntryAction(
  _previousState: DailyFormActionState = INITIAL_STATE,
  formData: FormData
): Promise<DailyFormActionState> {
  await requireAdminSession();
  const validation = await readValidatedInput(formData);
  if (!("input" in validation)) {
    return { status: "error", message: validation.error ?? null };
  }

  const files = getUploadedFiles(formData);
  if (files.length > DAILY_IMAGES_MAX_COUNT) {
    return { status: "error", message: validation.messages.tooManyImages };
  }

  let savedImages: string[] = [];
  let createdId: number;
  try {
    savedImages = await saveDailyImages(files);
    const created = await createDailyEntry({
      ...validation.input,
      images: savedImages,
    });
    createdId = created.id;
  } catch (error) {
    await deleteDailyImages(savedImages);
    console.error("createDailyEntryAction failed", error);
    return {
      status: "error",
      message:
        error instanceof Error && error.name === "DailyMediaError"
          ? validation.messages.invalidImages
          : validation.messages.saveFailed,
    };
  }

  revalidateDailyPaths(createdId);
  return { status: "success", message: validation.messages.createSuccess };
}

export async function updateDailyEntryAction(
  _previousState: DailyFormActionState = INITIAL_STATE,
  formData: FormData
): Promise<DailyFormActionState> {
  await requireAdminSession();
  const { locale } = await getRequestI18n();
  const messages = getDailyCopy(locale).admin.messages;
  const entryId = getEntryId(formData);
  const existing = entryId ? await getAdminDailyEntryById(entryId) : null;
  if (!entryId || !existing) {
    return { status: "error", message: messages.notFound };
  }

  const validation = await readValidatedInput(formData);
  if (!("input" in validation)) {
    return { status: "error", message: validation.error ?? null };
  }

  const removedImages = new Set(
    formData.getAll("removeImage").filter((value): value is string => typeof value === "string")
  );
  const retainedImages = existing.images.filter((image) => !removedImages.has(image));
  const files = getUploadedFiles(formData);
  if (retainedImages.length + files.length > DAILY_IMAGES_MAX_COUNT) {
    return { status: "error", message: messages.tooManyImages };
  }

  let savedImages: string[] = [];
  try {
    savedImages = await saveDailyImages(files);
    await updateDailyEntry(entryId, {
      ...validation.input,
      images: [...retainedImages, ...savedImages],
    });
  } catch (error) {
    await deleteDailyImages(savedImages);
    console.error("updateDailyEntryAction failed", error);
    return {
      status: "error",
      message:
        error instanceof Error && error.name === "DailyMediaError"
          ? messages.invalidImages
          : messages.saveFailed,
    };
  }

  try {
    await deleteDailyImages(existing.images.filter((image) => removedImages.has(image)));
  } catch (error) {
    console.error("Unable to clean up replaced daily images", error);
  }

  revalidateDailyPaths(entryId);

  redirect("/admin/daily");
}

export async function deleteDailyEntryAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }

  const deleted = await deleteDailyEntry(entryId);
  if (deleted) {
    try {
      await deleteDailyImages(deleted.images);
    } catch (error) {
      console.error("Unable to clean up deleted daily images", error);
    }
    revalidateDailyPaths(entryId);
  }
}

export async function toggleDailyEntryStatusAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }

  await toggleDailyEntryStatus(entryId);
  revalidateDailyPaths(entryId);
}

export async function toggleDailyEntryPinnedAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }

  await toggleDailyEntryPinned(entryId);
  revalidateDailyPaths(entryId);
}
