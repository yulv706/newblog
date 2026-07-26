import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getSteamGameByAppId } from "@/lib/games";
import { getCurrentUser } from "@/lib/user-auth";

const STORE_API_URL = "https://store.steampowered.com/api/appdetails";
const STORE_REQUEST_TIMEOUT_MS = 8_000;
const PUBLIC_CACHE_SECONDS = 86_400;

type SteamStoreResponse = Record<
  string,
  {
    success?: boolean;
    data?: {
      header_image?: unknown;
    };
  }
>;

function isTrustedSteamArtworkUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "steamstatic.com" || url.hostname.endsWith(".steamstatic.com"))
    );
  } catch {
    return false;
  }
}

function notFound() {
  return NextResponse.json(
    { error: "Steam artwork is unavailable." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ appId: string }>;
  }
) {
  const user = await getCurrentUser();
  if (!user && !(await getAdminSession())) {
    return unauthorized();
  }

  const { appId: rawAppId } = await context.params;
  const appId = Number(rawAppId);

  if (!Number.isSafeInteger(appId) || appId <= 0) {
    return notFound();
  }

  const game = await getSteamGameByAppId(appId);
  if (!game?.isVisible) {
    return notFound();
  }

  const url = new URL(STORE_API_URL);
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("filters", "basic");
  url.searchParams.set("l", "schinese");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReadWriteNotes-SteamArtwork/1.0",
      },
      next: {
        revalidate: PUBLIC_CACHE_SECONDS,
      },
      signal: AbortSignal.timeout(STORE_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return notFound();
    }

    const payload = (await response.json()) as SteamStoreResponse;
    const entry = payload[String(appId)];
    const artworkUrl =
      entry?.success && typeof entry.data?.header_image === "string"
        ? entry.data.header_image.trim()
        : "";

    if (!artworkUrl || !isTrustedSteamArtworkUrl(artworkUrl)) {
      return notFound();
    }

    return NextResponse.redirect(artworkUrl, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    return notFound();
  }
}
