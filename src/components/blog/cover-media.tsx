"use client";

import Image from "next/image";
import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function isRemoteUrl(src: string) {
  return /^https?:\/\//i.test(src);
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
        "relative isolate overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_48%),linear-gradient(135deg,rgba(99,102,241,0.16),rgba(14,165,233,0.08)_38%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_42%),linear-gradient(135deg,rgba(129,140,248,0.22),rgba(56,189,248,0.14)_38%,rgba(15,23,42,0)_100%)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0))]" />
      <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl dark:bg-primary/20" />
      <div className="absolute -bottom-12 left-6 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-300/10" />
      <div
        className={cn(
          "absolute inset-x-5 top-5 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20",
          accentClassName
        )}
      />

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.24em] text-muted/80">
          <span>Article</span>
          <span className="rounded-full border border-white/40 bg-white/45 px-2.5 py-1 text-[10px] tracking-[0.18em] text-foreground/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-foreground/70">
            {initials || "BL"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_0_6px_rgba(99,102,241,0.08)] dark:shadow-[0_0_0_6px_rgba(129,140,248,0.12)]" />
            <span className="h-px flex-1 bg-gradient-to-r from-primary/25 to-transparent" />
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
  const isRemote = src ? isRemoteUrl(src) : false;

  if (!src || hasError) {
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
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading={loading}
        fill
        unoptimized={isRemote}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 800px"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
