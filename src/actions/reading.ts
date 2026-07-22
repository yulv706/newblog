"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { getRequestI18n } from "@/lib/i18n/server";
import { runWereadSync } from "@/lib/weread-sync";

export type WereadSyncActionState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_STATE: WereadSyncActionState = {
  error: null,
  success: null,
};

export async function syncWereadBooksAction(
  _previousState: WereadSyncActionState = DEFAULT_STATE
): Promise<WereadSyncActionState> {
  await requireAdminSession();
  const { dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.admin.books;

  if (!process.env.WEREAD_API_KEY?.trim()) {
    return {
      error: booksDictionary.messages.missingApiKey,
      success: null,
    };
  }

  const result = await runWereadSync();
  if (!result.ok) {
    return {
      error: result.error || booksDictionary.messages.syncFailed,
      success: null,
    };
  }

  revalidatePath("/books");
  revalidatePath("/admin/books");

  return {
    error: null,
    success: booksDictionary.messages.syncSuccessTemplate
      .replace("{books}", String(result.syncedBooks ?? 0))
      .replace("{notes}", String(result.syncedNotes ?? 0)),
  };
}
