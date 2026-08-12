"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { getPrivateNotesCopy } from "@/lib/private-notes-copy";
import {
  createPrivateEntry,
  deletePrivateEntry,
  getPrivateEntryById,
  normalizePrivateContent,
  normalizePrivateTitle,
  setPrivateEntryStatus,
  updatePrivateEntry,
  type PrivateEntryInput,
  type PrivateEntryKind,
  type PrivateEntryPriority,
  type PrivateEntryStatus,
} from "@/lib/private-notes";
import { getRequestI18n } from "@/lib/i18n/server";

export type PrivateEntryActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const INITIAL_STATE: PrivateEntryActionState = {
  status: "idle",
  message: null,
};

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getEntryId(formData: FormData) {
  const value = Number.parseInt(getText(formData, "entryId"), 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function getKind(value: string): PrivateEntryKind {
  return value === "goal" ? "goal" : "thought";
}

function getPriority(value: string): PrivateEntryPriority {
  if (value === "low" || value === "high") {
    return value;
  }
  return "medium";
}

function getStatus(value: string): PrivateEntryStatus {
  if (value === "completed" || value === "archived") {
    return value;
  }
  return "active";
}

function readInput(formData: FormData, allowStatus: boolean): PrivateEntryInput | string {
  const kind = getKind(getText(formData, "kind"));
  const title = normalizePrivateTitle(getText(formData, "title"));
  const content = normalizePrivateContent(getText(formData, "content"));
  if (!title || !content) {
    return "invalid";
  }

  const progress = Number.parseInt(getText(formData, "progress"), 10);
  return {
    kind,
    title,
    content,
    status: allowStatus && kind === "goal" ? getStatus(getText(formData, "status")) : "active",
    priority: getPriority(getText(formData, "priority")),
    progress: Number.isFinite(progress) ? progress : 0,
    targetDate: getText(formData, "targetDate") || null,
    tags: getText(formData, "tags").split(/[,，\n]/u),
  };
}

function getMessage(copy: ReturnType<typeof getPrivateNotesCopy>, key: "invalid" | "failed") {
  return copy.messages[key];
}

export async function createPrivateEntryAction(
  _previousState: PrivateEntryActionState = INITIAL_STATE,
  formData: FormData
): Promise<PrivateEntryActionState> {
  await requireAdminSession();
  const { locale } = await getRequestI18n();
  const copy = getPrivateNotesCopy(locale);
  const input = readInput(formData, false);
  if (typeof input === "string") {
    return { status: "error", message: getMessage(copy, "invalid") };
  }

  try {
    createPrivateEntry(input);
    revalidatePath("/admin/private");
    return { status: "success", message: copy.messages.createSuccess };
  } catch (error) {
    console.error("createPrivateEntryAction failed", error);
    return { status: "error", message: copy.messages.failed };
  }
}

export async function updatePrivateEntryAction(
  _previousState: PrivateEntryActionState = INITIAL_STATE,
  formData: FormData
): Promise<PrivateEntryActionState> {
  await requireAdminSession();
  const { locale } = await getRequestI18n();
  const copy = getPrivateNotesCopy(locale);
  const entryId = getEntryId(formData);
  if (!entryId || !(await getPrivateEntryById(entryId))) {
    return { status: "error", message: copy.messages.failed };
  }

  const input = readInput(formData, true);
  if (typeof input === "string") {
    return { status: "error", message: getMessage(copy, "invalid") };
  }

  let updated = false;
  try {
    updated = Boolean(updatePrivateEntry(entryId, input));
  } catch (error) {
    console.error("updatePrivateEntryAction failed", error);
    return { status: "error", message: copy.messages.failed };
  }

  if (!updated) {
    return { status: "error", message: copy.messages.failed };
  }

  revalidatePath("/admin/private");
  redirect("/admin/private");
}

export async function completePrivateEntryAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }
  setPrivateEntryStatus(entryId, "completed");
  revalidatePath("/admin/private");
}

export async function reopenPrivateEntryAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }
  setPrivateEntryStatus(entryId, "active");
  revalidatePath("/admin/private");
}

export async function archivePrivateEntryAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }
  setPrivateEntryStatus(entryId, "archived");
  revalidatePath("/admin/private");
}

export async function deletePrivateEntryAction(formData: FormData) {
  await requireAdminSession();
  const entryId = getEntryId(formData);
  if (!entryId) {
    return;
  }
  deletePrivateEntry(entryId);
  revalidatePath("/admin/private");
}
