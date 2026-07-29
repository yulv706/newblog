import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getGameArtworkSources, isLowInformationArtworkPixels } from "@/lib/game-artwork";
import { formatPlaytime, formatRelativeGameDate } from "@/lib/game-format";
import { getGamesCopy } from "@/lib/games-copy";
import type { SteamGame } from "@/lib/games";

const require = createRequire(import.meta.url);
const { callSteamApi } = require(path.join(process.cwd(), "scripts", "sync-steam.js")) as {
  callSteamApi: (
    pathname: string,
    params: Record<string, string>,
    options: {
      fetchImpl: typeof fetch;
      maxAttempts: number;
      retryDelayMs: number;
      sleepImpl: () => Promise<void>;
    }
  ) => Promise<unknown>;
};

describe("Steam game archive", () => {
  it("provides complete localized copy and stable time formatting", () => {
    const zh = getGamesCopy("zh-CN");
    const en = getGamesCopy("en");

    expect(zh.public.title).toBe("游戏档案");
    expect(en.public.title).toBe("Play Archive");
    expect(zh.public.preview.label).toBe("本机预览");
    expect(en.public.library.resultTemplate).toContain("{start}");
    expect(zh.public.library.status.completed).toBe("已通关");
    expect(en.admin.sync.button).toBe("Sync Steam");
    expect(formatPlaytime(125, "zh-CN", zh.public.units)).toBe("2.1 小时");
    expect(formatPlaytime(60, "en", en.public.units)).toBe("1 hr");
    expect(formatRelativeGameDate(null, "zh-CN", zh.public.units)).toBe("尚未启动");
  });

  it("uses official Steam Web API services and preserves editorial fields", () => {
    const syncSource = fs.readFileSync(path.join(process.cwd(), "scripts/sync-steam.js"), "utf8");
    const scheduledSyncSource = fs.readFileSync(
      path.join(process.cwd(), "deploy/sync-weread.sh"),
      "utf8"
    );

    expect(syncSource).toContain("IPlayerService/GetOwnedGames");
    expect(syncSource).toContain("IPlayerService/GetRecentlyPlayedGames");
    expect(syncSource).toContain("ISteamUser/GetPlayerSummaries");
    expect(syncSource).toContain("include_appinfo");
    expect(syncSource).toContain("STEAM_WEB_API_KEY");
    expect(syncSource).toContain("STEAM_ID64");
    expect(syncSource).not.toContain("personal_rating = excluded");
    expect(syncSource).not.toContain("review = excluded");
    expect(syncSource).not.toContain("127.0.0.1:7891");
    expect(scheduledSyncSource).toContain("npm run sync:weread");
    expect(scheduledSyncSource).toContain("npm run sync:steam");
    expect(scheduledSyncSource).toContain("STEAM_SYNC_TIMEOUT_SECONDS");
    expect(scheduledSyncSource).toContain("daily reading briefing will continue");
  });

  it("retries transient Steam failures and preserves the underlying network cause", async () => {
    const transientError = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ECONNRESET", message: "socket disconnected" },
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce(Response.json({ response: { games: [] } }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const payload = await callSteamApi(
      "/IPlayerService/GetOwnedGames/v0001/",
      { key: "secret", steamid: "76561198000000000" },
      {
        fetchImpl,
        maxAttempts: 3,
        retryDelayMs: 0,
        sleepImpl: async () => undefined,
      }
    );

    expect(payload).toEqual({ response: { games: [] } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("ECONNRESET"));
    warning.mockRestore();
  });

  it("does not retry non-transient Steam authorization failures", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Forbidden", { status: 403 }));

    await expect(
      callSteamApi(
        "/ISteamUser/GetPlayerSummaries/v0002/",
        { key: "invalid", steamids: "76561198000000000" },
        {
          fetchImpl,
          maxAttempts: 3,
          retryDelayMs: 0,
          sleepImpl: async () => undefined,
        }
      )
    ).rejects.toThrow("Steam API request failed with 403");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("wires the public archive, detail dialog, filters, and pagination", () => {
    const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/games/page.tsx"), "utf8");
    const layoutSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/games/layout.tsx"),
      "utf8"
    );
    const artworkRouteSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/games/[appId]/artwork/route.ts"),
      "utf8"
    );
    const librarySource = fs.readFileSync(
      path.join(process.cwd(), "src/components/games/interactive-game-library.tsx"),
      "utf8"
    );
    const schemaSource = fs.readFileSync(path.join(process.cwd(), "src/lib/db/schema.ts"), "utf8");

    expect(pageSource).toContain("getPublicSteamLibrary");
    expect(pageSource).toContain("buildLocalizedMetadataFields");
    expect(librarySource).toContain("data-featured-game");
    expect(librarySource).toContain("data-game-card");
    expect(librarySource).toContain("data-game-dialog");
    expect(librarySource).toContain("data-game-library-controls");
    expect(librarySource).toContain("data-game-search");
    expect(librarySource).toContain("data-game-status-filter");
    expect(librarySource).toContain("data-game-sort");
    expect(librarySource).toContain("data-game-pagination");
    expect(librarySource).toContain("const GAMES_PER_PAGE = 10");
    expect(librarySource).toContain("useReducedMotion");
    expect(librarySource).toContain('drag={reducedMotion ? false : "y"}');
    expect(pageSource).toContain("robots: { index: false, follow: false }");
    expect(layoutSource).toContain("getCurrentUser");
    expect(layoutSource).toContain("getAdminSession");
    expect(layoutSource).toContain('redirect("/account/login?next=/games")');
    expect(artworkRouteSource).toContain("getCurrentUser");
    expect(artworkRouteSource).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(schemaSource).toContain('sqliteTable(\n  "steam_games"');
    expect(schemaSource).toContain('sqliteTable("steam_profile"');
    expect(schemaSource).toContain('sqliteTable("steam_sync_state"');
  });

  it("rejects blank Steam placeholders without stretching small icons into covers", () => {
    const game = {
      appId: 3280350,
      coverUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3280350/cover.jpg",
      heroUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3280350/hero.jpg",
      headerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3280350/header.jpg",
      iconUrl: "https://media.steampowered.com/tiny-icon.jpg",
    } as SteamGame;
    const sources = getGameArtworkSources(game, "cover");
    const blankPixels = new Uint8ClampedArray(16 * 16 * 4);
    const detailedPixels = new Uint8ClampedArray(16 * 16 * 4);

    for (let index = 0; index < blankPixels.length; index += 4) {
      blankPixels[index] = 75;
      blankPixels[index + 1] = 75;
      blankPixels[index + 2] = 75;
      blankPixels[index + 3] = 255;

      const sample = index / 4;
      detailedPixels[index] = (sample * 31) % 255;
      detailedPixels[index + 1] = (sample * 67) % 255;
      detailedPixels[index + 2] = (sample * 97) % 255;
      detailedPixels[index + 3] = 255;
    }

    expect(sources).not.toContain(game.iconUrl);
    expect(sources).toContain(`/api/games/${game.appId}/artwork`);
    expect(isLowInformationArtworkPixels(blankPixels)).toBe(true);
    expect(isLowInformationArtworkPixels(detailedPixels)).toBe(false);
  });

  it("recovers images that completed before React hydration attached load handlers", () => {
    const artworkSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/games/game-artwork.tsx"),
      "utf8"
    );

    expect(artworkSource).toContain("imageRef.current");
    expect(artworkSource).toContain("image?.complete");
    expect(artworkSource).toContain("image.naturalWidth === 0");
    expect(artworkSource).toContain("settleLoadedImage(image, source)");
  });
});
