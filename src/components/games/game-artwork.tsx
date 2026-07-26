"use client";

import { Gamepad2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canInspectSteamArtwork,
  getGameArtworkSources,
  isLowInformationArtworkPixels,
  type GameArtworkVariant,
} from "@/lib/game-artwork";
import type { SteamGame } from "@/lib/games";
import { cn } from "@/lib/utils";

function hasLowInformationArtwork(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return false;
  }

  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return isLowInformationArtworkPixels(
      context.getImageData(0, 0, canvas.width, canvas.height).data
    );
  } catch {
    return false;
  }
}

export function GameArtwork({
  game,
  variant,
  className,
  imageClassName,
  alt = "",
  eager = false,
}: {
  game: SteamGame;
  variant: GameArtworkVariant;
  className?: string;
  imageClassName?: string;
  alt?: string;
  eager?: boolean;
}) {
  const sources = useMemo(() => getGameArtworkSources(game, variant), [game, variant]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [readySource, setReadySource] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const source = sources[sourceIndex];
  const isReady = Boolean(source && readySource === source);

  useEffect(() => {
    setSourceIndex(0);
    setReadySource(null);
  }, [game.appId, variant]);

  const advanceSource = useCallback(
    (expectedSource: string) => {
      setReadySource((current) => (current === expectedSource ? null : current));
      setSourceIndex((index) => (sources[index] === expectedSource ? index + 1 : index));
    },
    [sources]
  );

  const settleLoadedImage = useCallback(
    (image: HTMLImageElement, expectedSource: string) => {
      if (!image.complete) {
        return;
      }

      if (
        image.naturalWidth === 0 ||
        (canInspectSteamArtwork(expectedSource) && hasLowInformationArtwork(image))
      ) {
        advanceSource(expectedSource);
        return;
      }

      setReadySource(expectedSource);
    },
    [advanceSource]
  );

  useEffect(() => {
    const image = imageRef.current;
    if (source && image?.complete) {
      settleLoadedImage(image, source);
    }
  }, [settleLoadedImage, source]);

  return (
    <div
      className={cn("relative isolate overflow-hidden bg-[#171a21]", className)}
      data-game-artwork={variant}
      data-artwork-state={source ? (isReady ? "ready" : "loading") : "fallback"}
    >
      <div
        className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#202a36,#12151a_62%,#2a201a)]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />
        <div className="relative flex max-w-[80%] flex-col items-center gap-3 text-center text-white/70">
          <Gamepad2 className="h-8 w-8" strokeWidth={1.4} aria-hidden="true" />
          <span className="line-clamp-2 text-sm font-medium">{game.name}</span>
        </div>
      </div>

      {source ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            key={source}
            src={source}
            alt={alt}
            crossOrigin={canInspectSteamArtwork(source) ? "anonymous" : undefined}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            onLoad={(event) => settleLoadedImage(event.currentTarget, source)}
            onError={() => advanceSource(source)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              imageClassName,
              "transition-[opacity,transform] duration-500",
              isReady ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),transparent_36%,rgba(0,0,0,0.12))] transition-opacity duration-500",
              isReady ? "opacity-100" : "opacity-0"
            )}
          />
        </>
      ) : null}
    </div>
  );
}
