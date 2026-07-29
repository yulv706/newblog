#!/usr/bin/env node

const Database = require("better-sqlite3");
const https = require("node:https");
const net = require("node:net");
const path = require("node:path");

const API_BASE_URL = process.env.STEAM_API_BASE_URL || "https://api.steampowered.com";
const DB_PATH = process.env.BLOG_DB_PATH || path.join(process.cwd(), "data", "blog.db");
const SYNC_KEY = "steam";
const PROFILE_KEY = "owner";
const REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;

function compactString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function unixToIso(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

function toBoundedPositiveInteger(value, fallback, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return fallback;
  }

  return Math.min(number, maximum);
}

function getErrorMessage(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const errorCode = compactString(error.code);
  const cause = error.cause;
  const causeCode = cause && typeof cause === "object" ? compactString(cause.code) : "";
  const causeMessage = cause && typeof cause === "object" ? compactString(cause.message) : "";
  const details = [errorCode || causeCode, causeMessage].filter(Boolean).join(": ");
  return details && !error.message.includes(details)
    ? `${error.message} (${details})`
    : error.message;
}

function isRetryableSteamError(error) {
  const status = Number(error?.status);
  return !Number.isFinite(status) || status === 429 || status >= 500;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function getSteamResolveAddresses(value = process.env.STEAM_API_RESOLVE_IPS) {
  return compactString(value)
    .split(",")
    .map((address) => address.trim())
    .filter(
      (address, index, addresses) => net.isIP(address) === 4 && addresses.indexOf(address) === index
    );
}

function fetchSteamApiViaAddress(url, init, address) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: init.headers,
        lookup(_hostname, options, callback) {
          if (options?.all) {
            callback(null, [{ address, family: 4 }]);
            return;
          }
          callback(null, address, 4);
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => body,
            json: async () => JSON.parse(body),
          });
        });
      }
    );
    const abort = () => {
      const error = new Error("The operation was aborted.");
      error.name = "AbortError";
      request.destroy(error);
    };

    if (init.signal?.aborted) {
      abort();
      return;
    }

    init.signal?.addEventListener("abort", abort, { once: true });
    request.once("close", () => init.signal?.removeEventListener("abort", abort));
    request.once("error", reject);
  });
}

function getRequiredConfig() {
  const apiKey = compactString(process.env.STEAM_WEB_API_KEY);
  const steamId = compactString(process.env.STEAM_ID64);

  if (!apiKey) {
    throw new Error("STEAM_WEB_API_KEY is not configured.");
  }

  if (!/^\d{17}$/.test(steamId)) {
    throw new Error("STEAM_ID64 must be a 17-digit Steam ID.");
  }

  return { apiKey, steamId };
}

async function callSteamApi(pathname, params, options = {}) {
  const url = new URL(pathname, API_BASE_URL);
  const fetchImpl = options.fetchImpl || fetch;
  const sleepImpl = options.sleepImpl || wait;
  const requestImpl =
    options.requestImpl ||
    ((requestUrl, init, address) =>
      address ? fetchSteamApiViaAddress(requestUrl, init, address) : fetchImpl(requestUrl, init));
  const resolveAddresses = options.resolveAddresses || getSteamResolveAddresses();
  const maxAttempts = toBoundedPositiveInteger(
    options.maxAttempts ?? process.env.STEAM_API_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS,
    5
  );
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS) || 0);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const resolveAddress =
      resolveAddresses.length > 0
        ? resolveAddresses[(attempt - 1) % resolveAddresses.length]
        : null;

    try {
      const response = await requestImpl(
        url,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "ReadWriteNotes-SteamSync/1.0",
          },
          signal: controller.signal,
        },
        resolveAddress
      );

      if (!response.ok) {
        const body = (await response.text()).slice(0, 240);
        const requestError = new Error(
          `Steam API request failed with ${response.status}${body ? `: ${body}` : ""}`
        );
        requestError.status = response.status;
        throw requestError;
      }

      return await response.json();
    } catch (error) {
      const requestError =
        error && error.name === "AbortError"
          ? new Error(`Steam API request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
          : error;
      const message = getErrorMessage(requestError);

      if (attempt >= maxAttempts || !isRetryableSteamError(requestError)) {
        const attemptSummary = maxAttempts > 1 ? ` after ${attempt} attempt(s)` : "";
        const routeSummary = resolveAddress ? ` via ${resolveAddress}` : "";
        throw new Error(`Steam API ${pathname} failed${attemptSummary}${routeSummary}: ${message}`);
      }

      const delayMs = Math.min(retryDelayMs * 2 ** (attempt - 1), 5_000);
      const routeSummary = resolveAddress ? ` via ${resolveAddress}` : "";
      console.warn(
        `Steam API ${pathname} attempt ${attempt}/${maxAttempts}${routeSummary} failed: ${message}. ` +
          `Retrying in ${delayMs}ms.`
      );
      await sleepImpl(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Steam API ${pathname} failed without completing a request.`);
}

async function fetchSteamPayloads(commonParams, language, apiCall = callSteamApi) {
  const ownedPayload = await apiCall("/IPlayerService/GetOwnedGames/v0001/", {
    ...commonParams,
    include_appinfo: 1,
    include_played_free_games: 1,
    include_extended_appinfo: 1,
    language,
  });
  const recentPayload = await apiCall("/IPlayerService/GetRecentlyPlayedGames/v0001/", {
    ...commonParams,
    count: 0,
  });
  const profilePayload = await apiCall("/ISteamUser/GetPlayerSummaries/v0002/", {
    key: commonParams.key,
    steamids: commonParams.steamid,
    format: "json",
  });

  return { ownedPayload, recentPayload, profilePayload };
}

function normalizeGame(game, recentGame, syncedAt) {
  const appId = toInteger(game.appid);
  const playtimeForever = toInteger(game.playtime_forever);

  return {
    appId,
    name: compactString(game.name) || `Steam App ${appId}`,
    iconHash: compactString(game.img_icon_url) || null,
    playtimeForever,
    playtimeTwoWeeks: toInteger(recentGame?.playtime_2weeks ?? game.playtime_2weeks),
    playtimeWindows: toInteger(game.playtime_windows_forever),
    playtimeMac: toInteger(game.playtime_mac_forever),
    playtimeLinux: toInteger(game.playtime_linux_forever),
    playtimeDeck: toInteger(game.playtime_deck_forever),
    lastPlayedAt: unixToIso(recentGame?.rtime_last_played ?? game.rtime_last_played),
    defaultStatus: playtimeForever > 0 ? "played" : "unplayed",
    rawPayload: JSON.stringify(game),
    syncedAt,
    createdAt: syncedAt,
    updatedAt: syncedAt,
  };
}

function createPreparedStatements(db) {
  return {
    updateState: db.prepare(`
      INSERT INTO steam_sync_state (
        key, status, message, total_games, recently_played,
        started_at, finished_at, payload
      ) VALUES (
        @key, @status, @message, @totalGames, @recentlyPlayed,
        @startedAt, @finishedAt, @payload
      )
      ON CONFLICT(key) DO UPDATE SET
        status = excluded.status,
        message = excluded.message,
        total_games = excluded.total_games,
        recently_played = excluded.recently_played,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        payload = excluded.payload
    `),
    markAllUnowned: db.prepare(`
      UPDATE steam_games
      SET is_owned = 0, playtime_two_weeks = 0, updated_at = @updatedAt
      WHERE is_owned = 1
    `),
    upsertGame: db.prepare(`
      INSERT INTO steam_games (
        app_id, name, icon_hash, playtime_forever, playtime_two_weeks,
        playtime_windows, playtime_mac, playtime_linux, playtime_deck,
        last_played_at, status, is_owned, raw_payload, synced_at,
        created_at, updated_at
      ) VALUES (
        @appId, @name, @iconHash, @playtimeForever, @playtimeTwoWeeks,
        @playtimeWindows, @playtimeMac, @playtimeLinux, @playtimeDeck,
        @lastPlayedAt, @defaultStatus, 1, @rawPayload, @syncedAt,
        @createdAt, @updatedAt
      )
      ON CONFLICT(app_id) DO UPDATE SET
        name = excluded.name,
        icon_hash = excluded.icon_hash,
        playtime_forever = excluded.playtime_forever,
        playtime_two_weeks = excluded.playtime_two_weeks,
        playtime_windows = excluded.playtime_windows,
        playtime_mac = excluded.playtime_mac,
        playtime_linux = excluded.playtime_linux,
        playtime_deck = excluded.playtime_deck,
        last_played_at = excluded.last_played_at,
        is_owned = 1,
        raw_payload = excluded.raw_payload,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `),
    upsertProfile: db.prepare(`
      INSERT INTO steam_profile (
        key, steam_id, persona_name, real_name, profile_url,
        avatar, avatar_medium, avatar_full, persona_state,
        visibility_state, country_code, game_count,
        total_playtime_minutes, last_logoff_at, account_created_at,
        raw_payload, synced_at, updated_at
      ) VALUES (
        @key, @steamId, @personaName, @realName, @profileUrl,
        @avatar, @avatarMedium, @avatarFull, @personaState,
        @visibilityState, @countryCode, @gameCount,
        @totalPlaytimeMinutes, @lastLogoffAt, @accountCreatedAt,
        @rawPayload, @syncedAt, @updatedAt
      )
      ON CONFLICT(key) DO UPDATE SET
        steam_id = excluded.steam_id,
        persona_name = excluded.persona_name,
        real_name = excluded.real_name,
        profile_url = excluded.profile_url,
        avatar = excluded.avatar,
        avatar_medium = excluded.avatar_medium,
        avatar_full = excluded.avatar_full,
        persona_state = excluded.persona_state,
        visibility_state = excluded.visibility_state,
        country_code = excluded.country_code,
        game_count = excluded.game_count,
        total_playtime_minutes = excluded.total_playtime_minutes,
        last_logoff_at = excluded.last_logoff_at,
        account_created_at = excluded.account_created_at,
        raw_payload = excluded.raw_payload,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `),
  };
}

async function syncSteam() {
  const { apiKey, steamId } = getRequiredConfig();
  const startedAt = new Date().toISOString();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const statements = createPreparedStatements(db);
  statements.updateState.run({
    key: SYNC_KEY,
    status: "running",
    message: "Steam synchronization started.",
    totalGames: 0,
    recentlyPlayed: 0,
    startedAt,
    finishedAt: null,
    payload: null,
  });

  try {
    const commonParams = {
      key: apiKey,
      steamid: steamId,
      format: "json",
    };
    const language = compactString(process.env.STEAM_API_LANGUAGE) || "schinese";
    const { ownedPayload, recentPayload, profilePayload } = await fetchSteamPayloads(
      commonParams,
      language
    );

    const ownedResponse = ownedPayload?.response || {};
    const ownedGames = Array.isArray(ownedResponse.games) ? ownedResponse.games : [];
    const gameCount = toInteger(ownedResponse.game_count, ownedGames.length);

    if (!Array.isArray(ownedResponse.games)) {
      throw new Error(
        "Steam returned no owned-game list. Set Profile and Game details to Public in Steam privacy settings, then retry."
      );
    }

    const recentGames = Array.isArray(recentPayload?.response?.games)
      ? recentPayload.response.games
      : [];
    const recentByAppId = new Map(recentGames.map((game) => [toInteger(game.appid), game]));
    const player = Array.isArray(profilePayload?.response?.players)
      ? profilePayload.response.players[0]
      : null;
    const syncedAt = new Date().toISOString();
    const normalizedGames = ownedGames
      .map((game) => normalizeGame(game, recentByAppId.get(toInteger(game.appid)), syncedAt))
      .filter((game) => game.appId > 0);
    const totalPlaytimeMinutes = normalizedGames.reduce(
      (total, game) => total + game.playtimeForever,
      0
    );

    const writeSnapshot = db.transaction(() => {
      statements.markAllUnowned.run({ updatedAt: syncedAt });
      for (const game of normalizedGames) {
        statements.upsertGame.run(game);
      }

      statements.upsertProfile.run({
        key: PROFILE_KEY,
        steamId,
        personaName: compactString(player?.personaname),
        realName: compactString(player?.realname) || null,
        profileUrl:
          compactString(player?.profileurl) || `https://steamcommunity.com/profiles/${steamId}/`,
        avatar: compactString(player?.avatar) || null,
        avatarMedium: compactString(player?.avatarmedium) || null,
        avatarFull: compactString(player?.avatarfull) || null,
        personaState: toInteger(player?.personastate),
        visibilityState: toInteger(player?.communityvisibilitystate),
        countryCode: compactString(player?.loccountrycode) || null,
        gameCount,
        totalPlaytimeMinutes,
        lastLogoffAt: unixToIso(player?.lastlogoff),
        accountCreatedAt: unixToIso(player?.timecreated),
        rawPayload: player ? JSON.stringify(player) : null,
        syncedAt,
        updatedAt: syncedAt,
      });
    });
    writeSnapshot();

    const finishedAt = new Date().toISOString();
    const payload = {
      steamId,
      language,
      gameCount,
      returnedGames: normalizedGames.length,
      recentlyPlayed: recentGames.length,
    };

    statements.updateState.run({
      key: SYNC_KEY,
      status: "success",
      message: "Steam synchronization completed.",
      totalGames: normalizedGames.length,
      recentlyPlayed: recentGames.length,
      startedAt,
      finishedAt,
      payload: JSON.stringify(payload),
    });
    db.close();

    return {
      syncedGames: normalizedGames.length,
      recentlyPlayed: recentGames.length,
      totalPlaytimeMinutes,
      startedAt,
      finishedAt,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    statements.updateState.run({
      key: SYNC_KEY,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      totalGames: 0,
      recentlyPlayed: 0,
      startedAt,
      finishedAt,
      payload: null,
    });
    db.close();
    throw error;
  }
}

async function main() {
  const jsonMode = process.argv.includes("--json") || process.env.STEAM_SYNC_JSON === "1";

  try {
    const result = await syncSteam();
    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, ...result }));
    } else {
      console.log(
        `Steam sync completed: ${result.syncedGames} game(s), ${result.recentlyPlayed} recently played.`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: message }));
    } else {
      console.error(message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  callSteamApi,
  createPreparedStatements,
  fetchSteamPayloads,
  getSteamResolveAddresses,
  normalizeGame,
  syncSteam,
};
