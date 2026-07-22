import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WereadSyncResult = {
  ok: boolean;
  error?: string;
  syncedBooks?: number;
  visibleBooks?: number;
  syncedNotes?: number;
};

function parseSyncScriptResult(output: string): WereadSyncResult {
  const lastLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!lastLine) {
    return { ok: false, error: "Sync script returned no output." };
  }

  try {
    return JSON.parse(lastLine) as WereadSyncResult;
  } catch {
    return { ok: false, error: lastLine };
  }
}

export async function runWereadSync(): Promise<WereadSyncResult> {
  if (!process.env.WEREAD_API_KEY?.trim()) {
    return { ok: false, error: "WEREAD_API_KEY is not configured." };
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync-weread.js");

  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--json"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WEREAD_SYNC_JSON: "1",
      },
      timeout: 180_000,
      maxBuffer: 1024 * 1024,
    });

    return parseSyncScriptResult(stdout);
  } catch (error) {
    const maybeOutput = (error as { stdout?: string }).stdout;
    const parsed = maybeOutput ? parseSyncScriptResult(maybeOutput) : null;

    return {
      ok: false,
      error:
        parsed?.error ||
        (error instanceof Error ? error.message : "WeRead synchronization failed."),
    };
  }
}
