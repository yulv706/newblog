"use client";

import Image from "next/image";
import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function isRemoteUrl(src: string) {
  return /^https?:\/\//i.test(src);
}

function getRenderableImageSrc(src: string | null) {
  const normalized = src?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/") || isRemoteUrl(normalized)) {
    return normalized;
  }

  return null;
}

type CoverFallbackProps = {
  title: string;
  className?: string;
  accentClassName?: string;
};

export function CoverFallback({
  title,
  className,
  accentClassName,
}: CoverFallbackProps) {
  const initials = title
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-secondary",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-x-5 top-5 h-px bg-border",
          accentClassName
        )}
      />
      <div className="absolute bottom-5 left-5 top-5 w-px bg-primary/35" />
      <div className="absolute inset-x-5 top-[42%] h-px bg-border/60" />
      <div className="absolute inset-x-5 top-[58%] h-px bg-border/60" />

      <div className="relative flex h-full flex-col justify-between p-5 pl-8 sm:p-6 sm:pl-10">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase text-muted/80">
          <span>Article</span>
          <span className="rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] text-foreground/80">
            {initials || "BL"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary/70" />
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="max-w-[18rem] text-sm font-medium leading-relaxed text-foreground/80 sm:text-base">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

type CoverMediaProps = {
  src: string | null;
  alt: string;
  title: string;
  className?: string;
  fallbackClassName?: string;
  fallbackAccentClassName?: string;
  loading?: "eager" | "lazy";
};

export function CoverMedia({
  src,
  alt,
  title,
  className,
  fallbackClassName,
  fallbackAccentClassName,
  loading = "lazy",
}: CoverMediaProps) {
  const [hasError, setHasError] = useState(false);
  const renderableSrc = getRenderableImageSrc(src);
  const isRemote = renderableSrc ? isRemoteUrl(renderableSrc) : false;

  if (!renderableSrc || hasError) {
    return (
      <CoverFallback
        title={title}
        className={fallbackClassName}
        accentClassName={fallbackAccentClassName}
      />
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <Image
        src={renderableSrc}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover:scale-[1.025]"
        loading={loading === "eager" ? undefined : "lazy"}
        priority={loading === "eager"}
        fill
        unoptimized={isRemote}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 800px"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
