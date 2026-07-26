import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { steamGames, steamProfile, steamSyncState } from "@/lib/db/schema";

export type GameStatus = "unplayed" | "played" | "playing" | "completed" | "paused" | "dropped";

export type SteamGame = {
  appId: number;
  name: string;
  iconUrl: string | null;
  coverUrl: string;
  heroUrl: string;
  headerUrl: string;
  storeUrl: string;
  playtimeForever: number;
  playtimeTwoWeeks: number;
  playtimeWindows: number;
  playtimeMac: number;
  playtimeLinux: number;
  playtimeDeck: number;
  lastPlayedAt: string | null;
  status: GameStatus;
  personalRating: number | null;
  review: string | null;
  tags: string[];
  isVisible: boolean;
  isFavorite: boolean;
  isFeatured: boolean;
  syncedAt: string | null;
};

export type SteamOwnerProfile = {
  steamId: string;
  personaName: string;
  realName: string | null;
  profileUrl: string;
  avatarUrl: string | null;
  personaState: number;
  visibilityState: number;
  countryCode: string | null;
  gameCount: number;
  totalPlaytimeMinutes: number;
  syncedAt: string | null;
};

export type SteamLibraryStats = {
  total: number;
  played: number;
  recent: number;
  favorites: number;
  reviewed: number;
  totalPlaytimeMinutes: number;
};

type SteamGameRow = typeof steamGames.$inferSelect;

const STEAM_ASSET_BASE = "https://cdn.akamai.steamstatic.com/steam/apps";

export function getSteamCoverUrl(appId: number) {
  return `${STEAM_ASSET_BASE}/${appId}/library_600x900_2x.jpg`;
}

export function getSteamHeroUrl(appId: number) {
  return `${STEAM_ASSET_BASE}/${appId}/library_hero.jpg`;
}

export function getSteamHeaderUrl(appId: number) {
  return `${STEAM_ASSET_BASE}/${appId}/header.jpg`;
}

export function getSteamStoreUrl(appId: number) {
  return `https://store.steampowered.com/app/${appId}/`;
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
  } catch {
    // Preserve the page if an old row contains malformed editorial metadata.
  }

  return [];
}

function mapSteamGame(row: SteamGameRow): SteamGame {
  const iconUrl = row.iconHash
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${row.appId}/${row.iconHash}.jpg`
    : null;

  return {
    appId: row.appId,
    name: row.name,
    iconUrl,
    coverUrl: row.customCoverUrl?.trim() || getSteamCoverUrl(row.appId),
    heroUrl: row.customHeroUrl?.trim() || getSteamHeroUrl(row.appId),
    headerUrl: getSteamHeaderUrl(row.appId),
    storeUrl: getSteamStoreUrl(row.appId),
    playtimeForever: row.playtimeForever,
    playtimeTwoWeeks: row.playtimeTwoWeeks,
    playtimeWindows: row.playtimeWindows,
    playtimeMac: row.playtimeMac,
    playtimeLinux: row.playtimeLinux,
    playtimeDeck: row.playtimeDeck,
    lastPlayedAt: row.lastPlayedAt,
    status: row.status,
    personalRating: row.personalRating,
    review: row.review?.trim() || null,
    tags: parseTags(row.tags),
    isVisible: row.isVisible,
    isFavorite: row.isFavorite,
    isFeatured: row.isFeatured,
    syncedAt: row.syncedAt,
  };
}

function mapOwnerProfile(
  row: typeof steamProfile.$inferSelect | undefined
): SteamOwnerProfile | null {
  if (!row) {
    return null;
  }

  return {
    steamId: row.steamId,
    personaName: row.personaName,
    realName: row.realName,
    profileUrl: row.profileUrl?.trim() || `https://steamcommunity.com/profiles/${row.steamId}/`,
    avatarUrl: row.avatarFull?.trim() || row.avatarMedium?.trim() || null,
    personaState: row.personaState,
    visibilityState: row.visibilityState,
    countryCode: row.countryCode,
    gameCount: row.gameCount,
    totalPlaytimeMinutes: row.totalPlaytimeMinutes,
    syncedAt: row.syncedAt,
  };
}

export function getSteamLibraryStats(games: SteamGame[]): SteamLibraryStats {
  return {
    total: games.length,
    played: games.filter((game) => game.playtimeForever > 0).length,
    recent: games.filter((game) => game.playtimeTwoWeeks > 0).length,
    favorites: games.filter((game) => game.isFavorite).length,
    reviewed: games.filter((game) => Boolean(game.review)).length,
    totalPlaytimeMinutes: games.reduce((total, game) => total + game.playtimeForever, 0),
  };
}

export async function getPublicSteamLibrary() {
  const rows = db
    .select()
    .from(steamGames)
    .where(and(eq(steamGames.isOwned, true), eq(steamGames.isVisible, true)))
    .orderBy(
      desc(steamGames.isFeatured),
      desc(steamGames.playtimeTwoWeeks),
      desc(steamGames.lastPlayedAt),
      desc(steamGames.playtimeForever)
    )
    .all();
  const profileRow = db.select().from(steamProfile).where(eq(steamProfile.key, "owner")).get();
  const games = rows.map(mapSteamGame);

  return {
    games,
    profile: mapOwnerProfile(profileRow),
    stats: getSteamLibraryStats(games),
    configured: Boolean(
      process.env.STEAM_WEB_API_KEY?.trim() && /^\d{17}$/.test(process.env.STEAM_ID64?.trim() ?? "")
    ),
  };
}

export async function getSteamAdminLibrary() {
  const rows = db
    .select()
    .from(steamGames)
    .where(eq(steamGames.isOwned, true))
    .orderBy(
      desc(steamGames.isFeatured),
      desc(steamGames.lastPlayedAt),
      desc(steamGames.playtimeForever)
    )
    .all();

  return rows.map(mapSteamGame);
}

export async function getSteamGameByAppId(appId: number) {
  const row = db.select().from(steamGames).where(eq(steamGames.appId, appId)).get();

  return row ? mapSteamGame(row) : null;
}

export async function getSteamSyncSummary() {
  const rows = db.select().from(steamGames).where(eq(steamGames.isOwned, true)).all();
  const state = db.select().from(steamSyncState).where(eq(steamSyncState.key, "steam")).get();
  const profileRow = db.select().from(steamProfile).where(eq(steamProfile.key, "owner")).get();

  return {
    hasApiKey: Boolean(process.env.STEAM_WEB_API_KEY?.trim()),
    steamId: process.env.STEAM_ID64?.trim() || null,
    totalGames: rows.length,
    visibleGames: rows.filter((row) => row.isVisible).length,
    reviewedGames: rows.filter((row) => Boolean(row.review?.trim())).length,
    featuredGames: rows.filter((row) => row.isFeatured).length,
    recentlyPlayed: rows.filter((row) => row.playtimeTwoWeeks > 0).length,
    profile: mapOwnerProfile(profileRow),
    state: state ?? null,
  };
}
