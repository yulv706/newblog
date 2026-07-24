import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Hash, X } from "lucide-react";
import { DailyTimelineEntry } from "@/components/daily/daily-timeline-entry";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getDailyTimeline } from "@/lib/daily";
import { getDailyCopy } from "@/lib/daily-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import { buildLocalizedMetadataFields } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DailyPageProps = {
  searchParams?: Promise<{
    page?: string;
    tag?: string;
    year?: string;
  }>;
};

function parsePositiveInteger(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function buildDailyHref({
  page,
  tag,
  year,
}: {
  page?: number;
  tag?: string | null;
  year?: number | null;
}) {
  const params = new URLSearchParams();
  if (tag) {
    params.set("tag", tag);
  }
  if (year) {
    params.set("year", String(year));
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/daily?${query}` : "/daily";
}

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).public;

  return {
    ...buildLocalizedMetadataFields(locale, {
      title: copy.metadataTitle,
      description: copy.metadataDescription,
      path: "/daily",
    }),
    robots: { index: false, follow: false },
  };
}

export default async function DailyPage({ searchParams }: DailyPageProps) {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).public;
  const resolvedSearchParams = (await searchParams) ?? {};
  const timeline = await getDailyTimeline({
    page: parsePositiveInteger(resolvedSearchParams.page),
    tag: resolvedSearchParams.tag,
    year: parsePositiveInteger(resolvedSearchParams.year),
  });
  const hasFilter = Boolean(timeline.activeTag || timeline.activeYear);

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] pt-8 pb-20 sm:pt-12 sm:pb-24">
      <FadeIn className="border-border/70 grid gap-8 border-b pt-3 pb-10 sm:pt-6 sm:pb-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl space-y-4">
          <p className="text-primary font-mono text-[0.68rem] font-medium uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="text-foreground max-w-2xl text-4xl leading-[1.12] font-semibold sm:text-5xl">
            {copy.title}
          </h1>
          <p className="text-muted max-w-2xl text-base leading-8">{copy.description}</p>
        </div>

        <div className="border-border/70 flex items-center gap-3 border-y py-4 lg:border-y-0 lg:py-1">
          <div className="border-border bg-secondary relative h-11 w-11 overflow-hidden rounded-full border">
            <Image
              src="/uploads/images/about-avatar.jpg"
              alt={copy.profileName}
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-semibold">{copy.profileName}</p>
            <p className="text-muted font-mono text-xs">{copy.profileHandle}</p>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,44rem)_minmax(14rem,18rem)] lg:justify-between lg:gap-16 lg:pt-12">
        <main className="min-w-0 lg:order-first">
          <div className="border-border/70 flex min-h-11 flex-wrap items-center justify-between gap-3 border-b pb-4">
            <p className="text-muted font-mono text-xs">
              {interpolate(copy.filteredTemplate, { count: timeline.totalFiltered })}
            </p>
            {hasFilter ? (
              <Link
                href="/daily"
                className="text-muted hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors outline-none"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                {copy.clearFilterLabel}
              </Link>
            ) : null}
          </div>

          {timeline.entries.length > 0 ? (
            <StaggeredList className="divide-border/70 border-border/70 divide-y border-b">
              {timeline.entries.map((entry) => (
                <StaggeredItem key={entry.id}>
                  <DailyTimelineEntry entry={entry} locale={locale} />
                </StaggeredItem>
              ))}
            </StaggeredList>
          ) : (
            <FadeIn className="border-border/70 border-b py-16 text-center sm:py-20">
              <div className="border-border text-muted mx-auto grid h-11 w-11 place-items-center rounded-full border">
                <CalendarDays aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <h2 className="text-foreground mt-5 text-lg font-semibold">
                {hasFilter ? copy.filteredEmptyTitle : copy.emptyTitle}
              </h2>
              <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                {hasFilter ? copy.filteredEmptyDescription : copy.emptyDescription}
              </p>
            </FadeIn>
          )}

          {timeline.pagination.totalPages > 1 ? (
            <nav
              aria-label={interpolate(copy.pageTemplate, {
                current: timeline.pagination.currentPage,
                total: timeline.pagination.totalPages,
              })}
              className="mt-7 flex items-center justify-between gap-3"
            >
              {timeline.pagination.hasPreviousPage ? (
                <Link
                  href={buildDailyHref({
                    page: timeline.pagination.currentPage - 1,
                    tag: timeline.activeTag,
                    year: timeline.activeYear,
                  })}
                  className="text-foreground hover:text-primary focus-visible:text-primary inline-flex min-h-10 items-center gap-2 text-sm font-medium transition-colors outline-none"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  {copy.previousPageLabel}
                </Link>
              ) : (
                <span className="text-muted/50 inline-flex min-h-10 items-center gap-2 text-sm">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  {copy.previousPageLabel}
                </span>
              )}

              <span className="text-muted font-mono text-xs">
                {interpolate(copy.pageTemplate, {
                  current: timeline.pagination.currentPage,
                  total: timeline.pagination.totalPages,
                })}
              </span>

              {timeline.pagination.hasNextPage ? (
                <Link
                  href={buildDailyHref({
                    page: timeline.pagination.currentPage + 1,
                    tag: timeline.activeTag,
                    year: timeline.activeYear,
                  })}
                  className="text-foreground hover:text-primary focus-visible:text-primary inline-flex min-h-10 items-center gap-2 text-sm font-medium transition-colors outline-none"
                >
                  {copy.nextPageLabel}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : (
                <span className="text-muted/50 inline-flex min-h-10 items-center gap-2 text-sm">
                  {copy.nextPageLabel}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              )}
            </nav>
          ) : null}
        </main>

        <aside className="min-w-0 lg:order-last">
          <div className="space-y-9 lg:sticky lg:top-28">
            <section className="border-border/70 border-t pt-4">
              <h2 className="text-muted font-mono text-[0.68rem] font-medium uppercase">
                {copy.statsHeading}
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dd className="text-foreground font-mono text-2xl font-medium">
                    {timeline.totalPublished}
                  </dd>
                  <dt className="text-muted mt-1 text-xs">{copy.totalLabel}</dt>
                </div>
                <div>
                  <dd className="text-foreground font-mono text-2xl font-medium">
                    {timeline.availableYears.length}
                  </dd>
                  <dt className="text-muted mt-1 text-xs">{copy.yearsLabel}</dt>
                </div>
              </dl>
            </section>

            {timeline.availableYears.length > 0 ? (
              <section className="border-border/70 border-t pt-4">
                <h2 className="text-muted flex items-center gap-2 font-mono text-[0.68rem] font-medium uppercase">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                  {copy.archiveHeading}
                </h2>
                <nav className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 lg:grid-cols-1">
                  <Link
                    href={buildDailyHref({ tag: timeline.activeTag })}
                    aria-current={!timeline.activeYear ? "page" : undefined}
                    className={cn(
                      "border-border/45 flex min-h-9 items-center justify-between gap-3 border-b text-sm transition-colors outline-none",
                      !timeline.activeYear
                        ? "text-primary font-medium"
                        : "text-muted hover:text-foreground focus-visible:text-foreground"
                    )}
                  >
                    <span>{copy.allLabel}</span>
                    <span className="font-mono text-[0.65rem]">{timeline.totalPublished}</span>
                  </Link>
                  {timeline.availableYears.map(({ year, count }) => (
                    <Link
                      key={year}
                      href={buildDailyHref({ tag: timeline.activeTag, year })}
                      aria-current={timeline.activeYear === year ? "page" : undefined}
                      className={cn(
                        "border-border/45 flex min-h-9 items-center justify-between gap-3 border-b text-sm transition-colors outline-none",
                        timeline.activeYear === year
                          ? "text-primary font-medium"
                          : "text-muted hover:text-foreground focus-visible:text-foreground"
                      )}
                    >
                      <span>{year}</span>
                      <span className="font-mono text-[0.65rem]">{count}</span>
                    </Link>
                  ))}
                </nav>
              </section>
            ) : null}

            {timeline.popularTags.length > 0 ? (
              <section className="border-border/70 border-t pt-4">
                <h2 className="text-muted flex items-center gap-2 font-mono text-[0.68rem] font-medium uppercase">
                  <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                  {copy.topicsHeading}
                </h2>
                <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
                  {timeline.popularTags.map(({ tag, count }) => (
                    <Link
                      key={tag.toLocaleLowerCase()}
                      href={buildDailyHref({ tag, year: timeline.activeYear })}
                      aria-current={
                        timeline.activeTag === tag.toLocaleLowerCase() ? "page" : undefined
                      }
                      className={cn(
                        "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs transition-colors outline-none",
                        timeline.activeTag === tag.toLocaleLowerCase()
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground"
                      )}
                    >
                      <span>#{tag}</span>
                      <span className="font-mono text-[0.62rem] opacity-70">{count}</span>
                    </Link>
                  ))}
                </nav>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
