import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SteamSyncResult = {
  ok: boolean;
  error?: string;
  syncedGames?: number;
  recentlyPlayed?: number;
  totalPlaytimeMinutes?: number;
};

function parseSyncResult(output: string): SteamSyncResult {
  const lastLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!lastLine) {
    return { ok: false, error: "Steam sync returned no output." };
  }

  try {
    return JSON.parse(lastLine) as SteamSyncResult;
  } catch {
    return { ok: false, error: lastLine };
  }
}

export async function runSteamSync(): Promise<SteamSyncResult> {
  if (!process.env.STEAM_WEB_API_KEY?.trim()) {
    return { ok: false, error: "STEAM_WEB_API_KEY is not configured." };
  }

  if (!/^\d{17}$/.test(process.env.STEAM_ID64?.trim() ?? "")) {
    return { ok: false, error: "STEAM_ID64 is not configured." };
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync-steam.js");

  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--json"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        STEAM_SYNC_JSON: "1",
      },
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });

    return parseSyncResult(stdout);
  } catch (error) {
    const maybeOutput = (error as { stdout?: string }).stdout;
    const parsed = maybeOutput ? parseSyncResult(maybeOutput) : null;

    return {
      ok: false,
      error:
        parsed?.error || (error instanceof Error ? error.message : "Steam synchronization failed."),
    };
  }
}
