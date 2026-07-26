import type { SteamGame } from "@/lib/games";

export type GameArtworkVariant = "cover" | "hero" | "header";

export function getSteamStoreArtworkFallbackUrl(appId: number) {
  return `/api/games/${appId}/artwork`;
}

export function getGameArtworkSources(game: SteamGame, variant: GameArtworkVariant) {
  const storeFallback = getSteamStoreArtworkFallbackUrl(game.appId);
  const sources =
    variant === "cover"
      ? [game.coverUrl, game.heroUrl, storeFallback, game.headerUrl]
      : variant === "hero"
        ? [game.heroUrl, game.headerUrl, storeFallback, game.coverUrl]
        : [game.headerUrl, game.heroUrl, storeFallback, game.coverUrl];

  return Array.from(new Set(sources.filter((source): source is string => Boolean(source))));
}

export function canInspectSteamArtwork(source: string) {
  try {
    const hostname = new URL(source).hostname.toLowerCase();
    return hostname === "steamstatic.com" || hostname.endsWith(".steamstatic.com");
  } catch {
    return false;
  }
}

export function isLowInformationArtworkPixels(pixels: Uint8ClampedArray) {
  if (pixels.length < 64 || pixels.length % 4 !== 0) {
    return false;
  }

  let count = 0;
  let minimum = 255;
  let maximum = 0;
  let sum = 0;
  let sumOfSquares = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 16) {
      continue;
    }

    const luminance =
      pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    minimum = Math.min(minimum, luminance);
    maximum = Math.max(maximum, luminance);
    sum += luminance;
    sumOfSquares += luminance * luminance;
    count += 1;
  }

  if (count < 16) {
    return false;
  }

  const mean = sum / count;
  const variance = Math.max(0, sumOfSquares / count - mean * mean);
  return maximum - minimum <= 8 && Math.sqrt(variance) <= 2.5;
}
