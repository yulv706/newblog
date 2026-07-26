"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { steamGames } from "@/lib/db/schema";
import { getGamesCopy } from "@/lib/games-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import { runSteamSync } from "@/lib/steam-sync";

export type SteamSyncActionState = {
  error: string | null;
  success: string | null;
};

export type SteamGameEditorActionState = {
  error: string | null;
  success: string | null;
};

const GAME_STATUSES = new Set(["unplayed", "played", "playing", "completed", "paused", "dropped"]);

function getOptionalUrl(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function parseTags(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  return Array.from(
    new Set(
      text
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 30))
    )
  ).slice(0, 12);
}

export async function syncSteamGamesAction(
  _previousState: SteamSyncActionState
): Promise<SteamSyncActionState> {
  await requireAdminSession();
  const { locale } = await getRequestI18n();
  const copy = getGamesCopy(locale).admin.sync;

  if (
    !process.env.STEAM_WEB_API_KEY?.trim() ||
    !/^\d{17}$/.test(process.env.STEAM_ID64?.trim() ?? "")
  ) {
    return { error: copy.missingConfig, success: null };
  }

  const result = await runSteamSync();
  if (!result.ok) {
    return {
      error: result.error || copy.failed,
      success: null,
    };
  }

  revalidatePath("/games");
  revalidatePath("/admin/games");

  return {
    error: null,
    success: copy.successTemplate
      .replace("{games}", String(result.syncedGames ?? 0))
      .replace("{recent}", String(result.recentlyPlayed ?? 0)),
  };
}

export async function updateSteamGameAction(
  appId: number,
  _previousState: SteamGameEditorActionState,
  formData: FormData
): Promise<SteamGameEditorActionState> {
  await requireAdminSession();
  const { locale } = await getRequestI18n();
  const copy = getGamesCopy(locale).admin.editor;
  const game = db
    .select({ appId: steamGames.appId })
    .from(steamGames)
    .where(eq(steamGames.appId, appId))
    .get();

  if (!game) {
    return { error: copy.invalidGame, success: null };
  }

  const statusValue = String(formData.get("status") ?? "");
  const status = GAME_STATUSES.has(statusValue) ? statusValue : "played";
  const ratingValue = String(formData.get("personalRating") ?? "").trim();
  const rating = ratingValue ? Number.parseInt(ratingValue, 10) : null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
    return { error: copy.invalidRating, success: null };
  }

  const review = String(formData.get("review") ?? "").trim();
  if (review.length > 2000) {
    return { error: copy.reviewTooLong, success: null };
  }

  db.update(steamGames)
    .set({
      status: status as typeof steamGames.$inferSelect.status,
      personalRating: rating,
      review: review || null,
      tags: JSON.stringify(parseTags(formData.get("tags"))),
      customCoverUrl: getOptionalUrl(formData.get("customCoverUrl")),
      customHeroUrl: getOptionalUrl(formData.get("customHeroUrl")),
      isVisible: formData.get("isVisible") === "on",
      isFavorite: formData.get("isFavorite") === "on",
      isFeatured: formData.get("isFeatured") === "on",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(steamGames.appId, appId))
    .run();

  revalidatePath("/games");
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${appId}/edit`);

  return { error: null, success: copy.success };
}
