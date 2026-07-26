"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { formatPlaytime } from "@/lib/game-format";
import type { SteamGame } from "@/lib/games";
import { getGamesCopy } from "@/lib/games-copy";

const GAMES_PER_PAGE = 20;

export function SteamAdminLibrary({ games }: { games: SteamGame[] }) {
  const { locale } = useLocaleContext();
  const copy = getGamesCopy(locale);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredGames = useMemo(() => {
    if (!normalizedQuery) {
      return games;
    }

    return games.filter((game) =>
      [game.name, game.review ?? "", ...game.tags]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalizedQuery)
    );
  }, [games, locale, normalizedQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleGames = filteredGames.slice(
    safePage * GAMES_PER_PAGE,
    (safePage + 1) * GAMES_PER_PAGE
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground text-lg font-semibold">{copy.admin.library.title}</h2>
          <p className="text-muted text-sm leading-relaxed">{copy.admin.library.description}</p>
        </div>
        <label className="border-border bg-background focus-within:border-primary/45 flex h-10 w-full items-center gap-2 rounded-lg border px-3 sm:w-72">
          <Search className="text-muted h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{copy.public.library.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder={copy.public.library.searchPlaceholder}
            className="text-foreground placeholder:text-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {visibleGames.length > 0 ? (
        <div className="border-border/70 divide-border/60 overflow-hidden rounded-lg border">
          {visibleGames.map((game) => (
            <article
              key={game.appId}
              className="bg-background/55 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-secondary relative h-12 w-20 shrink-0 overflow-hidden rounded-md">
                  {/* Steam artwork is already CDN-sized and does not need image optimization. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.headerUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-foreground truncate text-sm font-semibold">{game.name}</h3>
                  <p className="text-muted mt-0.5 truncate text-xs">
                    App {game.appId} · {copy.public.library.status[game.status]}
                  </p>
                </div>
              </div>

              <p className="text-muted hidden text-sm tabular-nums sm:block">
                {formatPlaytime(game.playtimeForever, locale, copy.public.units, { compact: true })}
              </p>
              <p className="text-muted hidden text-sm tabular-nums sm:block">
                {game.personalRating ? `${game.personalRating} / 10` : "—"}
              </p>
              <Link
                href={`/admin/games/${game.appId}/edit`}
                className="border-border text-foreground hover:border-primary/40 hover:bg-secondary focus-visible:ring-primary/35 inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none"
              >
                {copy.admin.library.edit}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="border-border/70 text-muted rounded-lg border border-dashed px-5 py-10 text-center text-sm">
          {games.length === 0 ? copy.admin.library.empty : copy.public.library.noResultsTitle}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="flex items-center justify-end gap-2"
          aria-label={copy.public.library.pageLabel}
        >
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={safePage === 0}
            title={copy.public.library.previousPageLabel}
            aria-label={copy.public.library.previousPageLabel}
            className="border-border text-foreground hover:bg-secondary grid h-9 w-9 place-items-center rounded-lg border transition disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-muted min-w-16 text-center font-mono text-xs tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            disabled={safePage === totalPages - 1}
            title={copy.public.library.nextPageLabel}
            aria-label={copy.public.library.nextPageLabel}
            className="border-border text-foreground hover:bg-secondary grid h-9 w-9 place-items-center rounded-lg border transition disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
