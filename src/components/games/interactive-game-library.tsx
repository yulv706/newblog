"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Heart,
  Laptop,
  Monitor,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GameArtwork } from "@/components/games/game-artwork";
import { formatPlaytime, formatRelativeGameDate, interpolateGameCopy } from "@/lib/game-format";
import type { GameStatus, SteamGame } from "@/lib/games";
import type { GamesCopy } from "@/lib/games-copy";
import type { AppLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const GAMES_PER_PAGE = 10;
const ALL_FILTER = "all";
const RECENT_FILTER = "recent";
const FAVORITES_FILTER = "favorites";
const REVIEWED_FILTER = "reviewed";

type FilterKey =
  | typeof ALL_FILTER
  | typeof RECENT_FILTER
  | typeof FAVORITES_FILTER
  | typeof REVIEWED_FILTER
  | GameStatus;
type SortKey = "recent" | "playtime" | "rating" | "name";
type PublicGamesCopy = GamesCopy["public"];

function getGameTimestamp(game: SteamGame) {
  const timestamp = game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortGames(games: SteamGame[], sort: SortKey, locale: AppLocale) {
  return [...games].sort((left, right) => {
    if (sort === "playtime") {
      return right.playtimeForever - left.playtimeForever;
    }
    if (sort === "rating") {
      return (right.personalRating ?? -1) - (left.personalRating ?? -1);
    }
    if (sort === "name") {
      return left.name.localeCompare(right.name, locale);
    }
    return getGameTimestamp(right) - getGameTimestamp(left);
  });
}

function getPaginationItems(page: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const pages = new Set([0, total - 1, page - 1, page, page + 1]);
  const ordered = Array.from(pages)
    .filter((item) => item >= 0 && item < total)
    .sort((left, right) => left - right);
  const result: Array<number | string> = [];

  ordered.forEach((item, index) => {
    const previous = ordered[index - 1];
    if (index > 0 && item - previous > 1) {
      result.push(`ellipsis-${previous}`);
    }
    result.push(item);
  });

  return result;
}

function StatusMark({
  status,
  copy,
  inverse = false,
}: {
  status: GameStatus;
  copy: PublicGamesCopy;
  inverse?: boolean;
}) {
  const colorClass =
    status === "playing"
      ? "bg-[#66c0f4]"
      : status === "completed"
        ? "bg-[#7fc66b]"
        : status === "paused"
          ? "bg-[#e6a857]"
          : status === "dropped"
            ? "bg-[#d47b72]"
            : "bg-current opacity-45";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium",
        inverse ? "text-white/78" : "text-muted"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colorClass)} />
      {copy.library.status[status]}
    </span>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium text-white/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">{value}</p>
    </div>
  );
}

function FeaturedStage({
  games,
  locale,
  copy,
  onSelect,
}: {
  games: SteamGame[];
  locale: AppLocale;
  copy: PublicGamesCopy;
  onSelect: (game: SteamGame) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, games.length - 1);
  const game = games[safeIndex];

  useEffect(() => {
    if (activeIndex >= games.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, games.length]);

  if (!game) {
    return null;
  }

  const move = (direction: number) => {
    setActiveIndex((index) => (index + direction + games.length) % games.length);
  };

  return (
    <section
      className="border-border/70 relative isolate min-h-[30rem] overflow-hidden border-y bg-[#10151b] text-white sm:min-h-[32rem]"
      aria-labelledby="featured-game-title"
      data-featured-game
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={`hero-${game.appId}`}
          className="absolute inset-0"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          transition={{ duration: reducedMotion ? 0.18 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <GameArtwork
            game={game}
            variant="hero"
            eager
            className="h-full w-full"
            imageClassName="object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,14,0.94)_0%,rgba(7,10,14,0.76)_38%,rgba(7,10,14,0.16)_76%,rgba(7,10,14,0.36)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,10,14,0.88)_0%,transparent_48%)]" />

      <div className="relative flex min-h-[30rem] flex-col justify-between p-5 sm:min-h-[32rem] sm:p-8 lg:p-10">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[0.68rem] font-medium text-white/62">
            {game.playtimeTwoWeeks > 0 ? copy.featured.eyebrow : copy.featured.recentEyebrow}
          </p>
          {games.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={copy.featured.previousLabel}
                title={copy.featured.previousLabel}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/18 text-white transition hover:border-white/40 hover:bg-black/35 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-12 text-center font-mono text-xs text-white/65 tabular-nums">
                {safeIndex + 1} / {games.length}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={copy.featured.nextLabel}
                title={copy.featured.nextLabel}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/18 text-white transition hover:border-white/40 hover:bg-black/35 active:scale-95"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`hero-copy-${game.appId}`}
            className="max-w-2xl"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{
              type: reducedMotion ? "tween" : "spring",
              bounce: 0,
              duration: reducedMotion ? 0.18 : 0.42,
            }}
          >
            <StatusMark status={game.status} copy={copy} inverse />
            <h2
              id="featured-game-title"
              className="mt-4 max-w-[18ch] text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl"
            >
              {game.name}
            </h2>
            {game.review ? (
              <p className="mt-5 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                {game.review}
              </p>
            ) : null}

            <div className="mt-7 grid max-w-xl grid-cols-3 gap-4 border-y border-white/14 py-4">
              <HeroMetric
                label={copy.featured.totalTimeLabel}
                value={formatPlaytime(game.playtimeForever, locale, copy.units)}
              />
              <HeroMetric
                label={copy.featured.recentTimeLabel}
                value={formatPlaytime(game.playtimeTwoWeeks, locale, copy.units)}
              />
              <HeroMetric
                label={copy.featured.lastPlayedLabel}
                value={formatRelativeGameDate(game.lastPlayedAt, locale, copy.units)}
              />
            </div>

            <button
              type="button"
              onClick={() => onSelect(game)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#111820] transition hover:bg-white/90 active:scale-[0.98]"
            >
              <Gamepad2 className="h-4 w-4" aria-hidden="true" />
              {copy.featured.openLabel}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function RecentSessions({
  games,
  locale,
  copy,
  onSelect,
}: {
  games: SteamGame[];
  locale: AppLocale;
  copy: PublicGamesCopy;
  onSelect: (game: SteamGame) => void;
}) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5" aria-labelledby="recent-games-heading">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold">{copy.recent.eyebrow}</p>
          <h2
            id="recent-games-heading"
            className="text-foreground mt-2 text-2xl font-semibold sm:text-3xl"
          >
            {copy.recent.title}
          </h2>
        </div>
        <p className="text-muted text-sm leading-relaxed sm:text-right">
          {copy.recent.description}
        </p>
      </div>

      <div className="-mx-[var(--spacing-page)] overflow-x-auto px-[var(--spacing-page)] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-3 pb-2">
          {games.slice(0, 7).map((game, index) => (
            <motion.button
              key={game.appId}
              type="button"
              onClick={() => onSelect(game)}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="border-border/70 bg-background group w-[17rem] overflow-hidden rounded-lg border text-left shadow-xs"
            >
              <GameArtwork
                game={game}
                variant="header"
                eager={index < 2}
                className="aspect-[16/8] w-full"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
              />
              <div className="space-y-2 px-3 py-3">
                <h3 className="text-foreground truncate text-sm font-semibold">{game.name}</h3>
                <div className="text-muted flex items-center justify-between gap-3 text-xs">
                  <span>{formatPlaytime(game.playtimeTwoWeeks, locale, copy.units)}</span>
                  <span className="font-mono tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="bg-secondary h-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-[#66c0f4]"
                    style={{
                      width: `${Math.max(
                        7,
                        Math.min(
                          100,
                          (game.playtimeTwoWeeks / Math.max(games[0]?.playtimeTwoWeeks ?? 1, 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameCard({
  game,
  locale,
  copy,
  onSelect,
  priority = false,
}: {
  game: SteamGame;
  locale: AppLocale;
  copy: PublicGamesCopy;
  onSelect: (game: SteamGame) => void;
  priority?: boolean;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="min-w-0"
      data-game-card
    >
      <motion.button
        type="button"
        onClick={() => onSelect(game)}
        whileHover={{ y: -8 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", bounce: 0, duration: 0.38 }}
        className="group block w-full text-left focus-visible:outline-none"
        aria-label={`${copy.featured.openLabel}: ${game.name}`}
      >
        <motion.div
          layoutId={`game-cover-${game.appId}`}
          className="border-border/60 bg-secondary relative aspect-[2/3] overflow-hidden rounded-lg border shadow-[0_20px_38px_-26px_rgba(9,14,22,0.65)] transition-shadow duration-300 group-hover:shadow-[0_28px_48px_-24px_rgba(9,14,22,0.78)]"
        >
          <GameArtwork
            game={game}
            variant="cover"
            eager={priority}
            className="h-full w-full"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.025]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/78 to-transparent" />
          <div className="absolute right-2 bottom-2 left-2 flex items-end justify-between gap-2">
            {game.playtimeTwoWeeks > 0 ? (
              <span className="rounded-md bg-black/58 px-2 py-1 text-[0.66rem] font-medium text-white backdrop-blur-md">
                {formatPlaytime(game.playtimeTwoWeeks, locale, copy.units, { compact: true })}
              </span>
            ) : (
              <span />
            )}
            {game.isFavorite ? (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-black/58 text-[#ffb95e] backdrop-blur-md">
                <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
            ) : null}
          </div>
        </motion.div>

        <div className="min-w-0 pt-3">
          <h3 className="text-foreground truncate text-sm font-semibold">{game.name}</h3>
          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            <StatusMark status={game.status} copy={copy} />
            {game.personalRating ? (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {game.personalRating}
              </span>
            ) : (
              <span className="text-muted shrink-0 font-mono text-[0.65rem]">
                {formatPlaytime(game.playtimeForever, locale, copy.units, { compact: true })}
              </span>
            )}
          </div>
        </div>
      </motion.button>
    </motion.article>
  );
}

function PlatformBar({
  icon: Icon,
  label,
  value,
  max,
}: {
  icon: typeof Monitor;
  label: string;
  value: number;
  max: number;
}) {
  if (value <= 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[1.1rem_minmax(0,1fr)_3.5rem] items-center gap-2">
      <Icon className="text-muted h-3.5 w-3.5" aria-hidden="true" />
      <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-[#4f92bd]"
          style={{ width: `${Math.max(4, (value / Math.max(max, 1)) * 100)}%` }}
        />
      </div>
      <span className="text-muted truncate text-right text-[0.68rem]">{label}</span>
    </div>
  );
}

function GameDetailDialog({
  game,
  locale,
  copy,
  onClose,
}: {
  game: SteamGame;
  locale: AppLocale;
  copy: PublicGamesCopy;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const maxPlatformTime = Math.max(
    game.playtimeWindows,
    game.playtimeMac,
    game.playtimeLinux,
    game.playtimeDeck,
    1
  );

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
      role="presentation"
    >
      <motion.button
        type="button"
        aria-label={copy.detail.closeLabel}
        className="absolute inset-0 cursor-default bg-black/58 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.28 }}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-game-dialog
        drag={reducedMotion ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.28 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 720) {
            onClose();
          }
        }}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 42, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.985 }}
        transition={{
          type: reducedMotion ? "tween" : "spring",
          bounce: reducedMotion ? undefined : 0.08,
          duration: reducedMotion ? 0.18 : 0.42,
        }}
        className="bg-background border-border/70 relative z-10 grid max-h-[94dvh] w-full max-w-6xl overflow-hidden rounded-t-lg border shadow-[0_40px_100px_-24px_rgba(0,0,0,0.68)] sm:max-h-[min(88dvh,48rem)] sm:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)] sm:rounded-lg"
      >
        <div className="absolute top-2 left-1/2 z-30 h-1 w-10 -translate-x-1/2 rounded-full bg-white/40 sm:hidden" />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={copy.detail.closeLabel}
          title={copy.detail.closeLabel}
          className="border-border/60 bg-background/78 text-foreground hover:bg-background absolute top-3 right-3 z-30 grid h-10 w-10 place-items-center rounded-full border shadow-sm backdrop-blur-xl transition active:scale-95"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative hidden min-h-[40rem] overflow-hidden bg-[#10151b] sm:block">
          <GameArtwork
            game={game}
            variant="hero"
            eager
            className="absolute inset-0 h-full w-full"
            imageClassName="scale-110 object-cover blur-[1px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,15,0.08),rgba(8,11,15,0.88)_82%)]" />
          <motion.div
            layoutId={`game-cover-${game.appId}`}
            className="absolute right-[17%] bottom-24 left-[17%] aspect-[2/3] overflow-hidden rounded-lg border border-white/12 shadow-[0_32px_60px_-18px_rgba(0,0,0,0.82)]"
          >
            <GameArtwork game={game} variant="cover" eager className="h-full w-full" />
          </motion.div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="relative aspect-[16/8] overflow-hidden bg-[#10151b] sm:hidden">
            <GameArtwork
              game={game}
              variant="hero"
              eager
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,11,15,0.82),transparent_70%)]" />
          </div>

          <div className="space-y-7 p-5 pt-6 sm:p-8">
            <header className="pr-10">
              <div className="flex flex-wrap items-center gap-3">
                <StatusMark status={game.status} copy={copy} />
                {game.isFavorite ? (
                  <span className="text-muted inline-flex items-center gap-1.5 text-xs">
                    <Heart
                      className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                      aria-hidden="true"
                    />
                    {copy.detail.favoriteLabel}
                  </span>
                ) : null}
              </div>
              <h2
                id={titleId}
                className="text-foreground mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
              >
                {game.name}
              </h2>
            </header>

            <div className="border-border/70 grid grid-cols-3 gap-3 border-y py-4">
              <div className="min-w-0">
                <p className="text-muted text-[0.68rem]">{copy.detail.totalTimeLabel}</p>
                <p className="text-foreground mt-1 truncate text-sm font-semibold">
                  {formatPlaytime(game.playtimeForever, locale, copy.units)}
                </p>
              </div>
              <div className="border-border/60 min-w-0 border-l pl-3">
                <p className="text-muted text-[0.68rem]">{copy.detail.recentTimeLabel}</p>
                <p className="text-foreground mt-1 truncate text-sm font-semibold">
                  {formatPlaytime(game.playtimeTwoWeeks, locale, copy.units)}
                </p>
              </div>
              <div className="border-border/60 min-w-0 border-l pl-3">
                <p className="text-muted text-[0.68rem]">{copy.detail.lastPlayedLabel}</p>
                <p className="text-foreground mt-1 truncate text-sm font-semibold">
                  {formatRelativeGameDate(game.lastPlayedAt, locale, copy.units)}
                </p>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-foreground text-sm font-semibold">{copy.detail.reviewLabel}</h3>
                {game.personalRating ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-300">
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                    {interpolateGameCopy(copy.units.ratingTemplate, {
                      value: game.personalRating,
                    })}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-3 text-sm leading-[1.85] whitespace-pre-wrap",
                  game.review ? "text-foreground" : "text-muted"
                )}
              >
                {game.review || copy.detail.noReviewLabel}
              </p>
            </section>

            {game.tags.length > 0 ? (
              <section>
                <h3 className="text-muted text-xs font-medium">{copy.detail.tagsLabel}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-border/70 bg-secondary/60 text-foreground rounded-full border px-3 py-1.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {maxPlatformTime > 1 ? (
              <section>
                <h3 className="text-muted text-xs font-medium">{copy.detail.platformLabel}</h3>
                <div className="mt-3 space-y-2.5">
                  <PlatformBar
                    icon={Monitor}
                    label="Windows"
                    value={game.playtimeWindows}
                    max={maxPlatformTime}
                  />
                  <PlatformBar
                    icon={Laptop}
                    label="macOS"
                    value={game.playtimeMac}
                    max={maxPlatformTime}
                  />
                  <PlatformBar
                    icon={Laptop}
                    label="Linux"
                    value={game.playtimeLinux}
                    max={maxPlatformTime}
                  />
                  <PlatformBar
                    icon={Gamepad2}
                    label="Steam Deck"
                    value={game.playtimeDeck}
                    max={maxPlatformTime}
                  />
                </div>
              </section>
            ) : null}

            <a
              href={game.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="border-border text-foreground hover:border-primary/40 hover:bg-secondary flex min-h-11 items-center justify-between rounded-lg border px-4 text-sm font-medium transition active:scale-[0.99]"
            >
              {copy.detail.openSteamLabel}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyLibraryStage({ configured, copy }: { configured: boolean; copy: PublicGamesCopy }) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="border-border/70 relative isolate min-h-[27rem] overflow-hidden border-y bg-[#12171d] text-white">
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:40px_40px] opacity-25" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,16,21,0.96),rgba(12,16,21,0.58)_62%,rgba(12,16,21,0.78))]" />
      <div className="relative grid min-h-[27rem] items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
        <div className="max-w-xl">
          <Gamepad2 className="h-7 w-7 text-[#66c0f4]" aria-hidden="true" />
          <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">{copy.empty.title}</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/68 sm:text-base">
            {configured ? copy.empty.configuredDescription : copy.empty.unconfiguredDescription}
          </p>
          <p className="mt-5 border-l border-[#66c0f4]/55 pl-4 text-xs leading-relaxed text-white/52">
            {copy.empty.setupHint}
          </p>
        </div>

        <div className="relative hidden h-72 lg:block" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <motion.div
              key={item}
              className="absolute top-1/2 aspect-[2/3] w-36 overflow-hidden rounded-lg border border-white/12 bg-[#1c2732] shadow-2xl"
              style={{
                left: `${12 + item * 25}%`,
                zIndex: 3 - item,
              }}
              initial={false}
              animate={
                reducedMotion
                  ? { y: "-50%" }
                  : {
                      y: ["-50%", `calc(-50% - ${item % 2 === 0 ? 7 : 2}px)`, "-50%"],
                    }
              }
              transition={
                reducedMotion
                  ? undefined
                  : {
                      duration: 6 + item,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            >
              <div className="absolute inset-0 bg-[linear-gradient(145deg,#293e50,#171d24_55%,#49362c)]" />
              <div className="absolute inset-x-4 top-5 h-px bg-white/16" />
              <div className="absolute top-10 right-4 left-4 space-y-2">
                <div className="h-2 w-2/3 rounded-full bg-white/10" />
                <div className="h-2 w-1/2 rounded-full bg-white/8" />
              </div>
              <div className="absolute right-4 bottom-4 left-4 h-1 rounded-full bg-[#66c0f4]/35" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InteractiveGameLibrary({
  games,
  locale,
  copy,
  configured,
}: {
  games: SteamGame[];
  locale: AppLocale;
  copy: PublicGamesCopy;
  configured: boolean;
}) {
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(0);

  const closeDialog = useCallback(() => setSelectedGame(null), []);
  const featuredGames = useMemo(() => {
    const explicit = games.filter((game) => game.isFeatured);
    const source =
      explicit.length > 0
        ? explicit
        : [...games].sort(
            (left, right) =>
              right.playtimeTwoWeeks - left.playtimeTwoWeeks ||
              getGameTimestamp(right) - getGameTimestamp(left) ||
              right.playtimeForever - left.playtimeForever
          );
    return source.slice(0, 5);
  }, [games]);
  const recentGames = useMemo(
    () =>
      games
        .filter((game) => game.playtimeTwoWeeks > 0)
        .sort((left, right) => right.playtimeTwoWeeks - left.playtimeTwoWeeks),
    [games]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredGames = useMemo(() => {
    const matches = games.filter((game) => {
      if (filter === RECENT_FILTER && game.playtimeTwoWeeks <= 0) {
        return false;
      }
      if (filter === FAVORITES_FILTER && !game.isFavorite) {
        return false;
      }
      if (filter === REVIEWED_FILTER && !game.review) {
        return false;
      }
      if (
        ![ALL_FILTER, RECENT_FILTER, FAVORITES_FILTER, REVIEWED_FILTER].includes(filter) &&
        game.status !== filter
      ) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [game.name, game.review ?? "", copy.library.status[game.status], ...game.tags]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalizedQuery);
    });

    return sortGames(matches, sort, locale);
  }, [copy.library.status, filter, games, locale, normalizedQuery, sort]);
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleGames = filteredGames.slice(
    safePage * GAMES_PER_PAGE,
    (safePage + 1) * GAMES_PER_PAGE
  );
  const visibleRangeStart = filteredGames.length === 0 ? 0 : safePage * GAMES_PER_PAGE + 1;
  const visibleRangeEnd = Math.min((safePage + 1) * GAMES_PER_PAGE, filteredGames.length);
  const paginationItems = getPaginationItems(safePage, totalPages);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const setLibraryFilter = (value: FilterKey) => {
    setFilter(value);
    setPage(0);
  };
  const reset = () => {
    setQuery("");
    setFilter(ALL_FILTER);
    setSort("recent");
    setPage(0);
  };

  if (games.length === 0) {
    return <EmptyLibraryStage configured={configured} copy={copy} />;
  }

  const quickFilters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: ALL_FILTER, label: copy.library.allLabel, count: games.length },
    {
      key: RECENT_FILTER,
      label: copy.library.recentLabel,
      count: recentGames.length,
    },
    {
      key: FAVORITES_FILTER,
      label: copy.library.favoritesLabel,
      count: games.filter((game) => game.isFavorite).length,
    },
    {
      key: REVIEWED_FILTER,
      label: copy.library.reviewedLabel,
      count: games.filter((game) => Boolean(game.review)).length,
    },
  ];

  return (
    <LayoutGroup>
      <div className="space-y-16 sm:space-y-20">
        {!configured ? (
          <div className="border-border/70 flex flex-col gap-2 border-y py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-primary inline-flex items-center gap-2 text-xs font-semibold">
              <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden="true" />
              {copy.preview.label}
            </span>
            <p className="text-muted max-w-3xl text-xs leading-relaxed sm:text-right">
              {copy.preview.description}
            </p>
          </div>
        ) : null}

        <FeaturedStage
          games={featuredGames}
          locale={locale}
          copy={copy}
          onSelect={setSelectedGame}
        />

        <RecentSessions
          games={recentGames}
          locale={locale}
          copy={copy}
          onSelect={setSelectedGame}
        />

        <section className="space-y-6" aria-labelledby="game-library-heading">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)] sm:items-end">
            <div>
              <p className="text-primary text-xs font-semibold">{copy.library.eyebrow}</p>
              <h2
                id="game-library-heading"
                className="text-foreground mt-2 text-2xl font-semibold sm:text-3xl"
              >
                {copy.library.title}
              </h2>
            </div>
            <p className="text-muted text-sm leading-relaxed sm:text-right">
              {copy.library.description}
            </p>
          </div>

          <div className="border-border/70 space-y-3 border-y py-4" data-game-library-controls>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="border-border bg-background focus-within:border-primary/45 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3">
                <Search className="text-muted h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">{copy.library.searchLabel}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder={copy.library.searchPlaceholder}
                  className="text-foreground placeholder:text-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
                  data-game-search
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPage(0);
                    }}
                    aria-label={copy.library.clearSearchLabel}
                    title={copy.library.clearSearchLabel}
                    className="text-muted hover:text-foreground grid h-7 w-7 place-items-center rounded-full transition"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:w-[25rem]">
                <label className="relative">
                  <span className="sr-only">{copy.library.filterLabel}</span>
                  <select
                    value={
                      [ALL_FILTER, RECENT_FILTER, FAVORITES_FILTER, REVIEWED_FILTER].includes(
                        filter
                      )
                        ? ""
                        : filter
                    }
                    onChange={(event) =>
                      setLibraryFilter((event.target.value || ALL_FILTER) as FilterKey)
                    }
                    className="border-border bg-background text-foreground focus:border-primary/45 h-11 w-full appearance-none rounded-lg border px-3 pr-8 text-sm outline-none"
                    data-game-status-filter
                  >
                    <option value="">{copy.library.filterLabel}</option>
                    {Object.entries(copy.library.status).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    className="text-muted pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 rotate-90"
                    aria-hidden="true"
                  />
                </label>
                <label className="relative">
                  <span className="sr-only">{copy.library.sortLabel}</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as SortKey);
                      setPage(0);
                    }}
                    className="border-border bg-background text-foreground focus:border-primary/45 h-11 w-full appearance-none rounded-lg border px-3 pr-8 text-sm outline-none"
                    data-game-sort
                  >
                    {Object.entries(copy.library.sort).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    className="text-muted pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 rotate-90"
                    aria-hidden="true"
                  />
                </label>
              </div>
            </div>

            <div className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickFilters.map((item) => {
                const isActive = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLibraryFilter(item.key)}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition active:scale-[0.98]",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted hover:border-primary/35 hover:text-foreground"
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "font-mono text-[0.64rem]",
                        isActive ? "text-white/72" : "text-muted"
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
              <span className="text-muted ml-auto hidden shrink-0 text-xs sm:block">
                {interpolateGameCopy(copy.library.resultTemplate, {
                  start: visibleRangeStart,
                  end: visibleRangeEnd,
                  total: filteredGames.length,
                })}
              </span>
            </div>
          </div>

          {visibleGames.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5"
              data-game-grid
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleGames.map((game, index) => (
                  <GameCard
                    key={game.appId}
                    game={game}
                    locale={locale}
                    copy={copy}
                    onSelect={setSelectedGame}
                    priority={index < 5}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="border-border/70 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed px-5 text-center">
              <Gamepad2 className="text-muted h-7 w-7" aria-hidden="true" />
              <h3 className="text-foreground mt-4 text-base font-semibold">
                {copy.library.noResultsTitle}
              </h3>
              <p className="text-muted mt-2 text-sm">{copy.library.noResultsDescription}</p>
              <button
                type="button"
                onClick={reset}
                className="border-border text-foreground hover:bg-secondary mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {copy.library.resetLabel}
              </button>
            </div>
          )}

          {totalPages > 1 ? (
            <nav
              className="border-border/70 flex items-center justify-between border-t pt-5"
              aria-label={copy.library.pageLabel}
              data-game-pagination
            >
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={safePage === 0}
                aria-label={copy.library.previousPageLabel}
                title={copy.library.previousPageLabel}
                className="border-border text-foreground hover:border-primary/35 hover:bg-secondary grid h-10 w-10 place-items-center rounded-full border transition disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1">
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={item === safePage ? "page" : undefined}
                      className={cn(
                        "h-9 min-w-9 rounded-full px-2 font-mono text-xs transition",
                        item === safePage
                          ? "bg-foreground text-background"
                          : "text-muted hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {item + 1}
                    </button>
                  ) : (
                    <span key={item} className="text-muted grid h-9 w-7 place-items-center">
                      ···
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                disabled={safePage === totalPages - 1}
                aria-label={copy.library.nextPageLabel}
                title={copy.library.nextPageLabel}
                className="border-border text-foreground hover:border-primary/35 hover:bg-secondary grid h-10 w-10 place-items-center rounded-full border transition disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </section>
      </div>

      <AnimatePresence>
        {selectedGame ? (
          <GameDetailDialog
            key={selectedGame.appId}
            game={selectedGame}
            locale={locale}
            copy={copy}
            onClose={closeDialog}
          />
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  );
}
