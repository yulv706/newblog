"use server";

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { getRequestI18n } from "@/lib/i18n/server";

const execFileAsync = promisify(execFile);

export type WereadSyncActionState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_STATE: WereadSyncActionState = {
  error: null,
  success: null,
};

type SyncScriptResult = {
  ok?: boolean;
  error?: string;
  syncedBooks?: number;
  visibleBooks?: number;
  syncedNotes?: number;
};

function parseSyncScriptResult(output: string): SyncScriptResult {
  const lastLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!lastLine) {
    return { ok: false, error: "Sync script returned no output." };
  }

  try {
    return JSON.parse(lastLine) as SyncScriptResult;
  } catch {
    return { ok: false, error: lastLine };
  }
}

export async function syncWereadBooksAction(
  _previousState: WereadSyncActionState = DEFAULT_STATE
): Promise<WereadSyncActionState> {
  const { dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.admin.books;

  if (!process.env.WEREAD_API_KEY?.trim()) {
    return {
      error: booksDictionary.messages.missingApiKey,
      success: null,
    };
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync-weread.js");

  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--json"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WEREAD_SYNC_JSON: "1",
      },
      timeout: 180000,
      maxBuffer: 1024 * 1024,
    });
    const result = parseSyncScriptResult(stdout);

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
  } catch (error) {
    const maybeOutput = (error as { stdout?: string }).stdout;
    const result = maybeOutput ? parseSyncScriptResult(maybeOutput) : null;

    return {
      error:
        result?.error ||
        (error instanceof Error ? error.message : booksDictionary.messages.syncFailed),
      success: null,
    };
  }
}
