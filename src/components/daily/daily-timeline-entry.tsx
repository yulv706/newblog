import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Pin } from "lucide-react";
import { DailyContent } from "@/components/daily/daily-content";
import { DailyMediaGallery } from "@/components/daily/daily-media-gallery";
import { DailyShareButton } from "@/components/daily/daily-share-button";
import type { DailyEntry } from "@/lib/daily";
import type { AppLocale } from "@/lib/i18n/config";
import { getDailyCopy } from "@/lib/daily-copy";
import { cn } from "@/lib/utils";

type DailyTimelineEntryProps = {
  entry: DailyEntry;
  locale: AppLocale;
  showDetailLink?: boolean;
  className?: string;
};

const AUTHOR_TIME_ZONE = process.env.NEXT_PUBLIC_DAILY_TIME_ZONE || "Asia/Shanghai";

function formatEntryDate(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: AUTHOR_TIME_ZONE,
  }).format(date);
}

export function DailyTimelineEntry({
  entry,
  locale,
  showDetailLink = true,
  className,
}: DailyTimelineEntryProps) {
  const copy = getDailyCopy(locale).public;
  const formattedDate = formatEntryDate(entry.occurredAt, locale);
  const detailPath = `/daily/${entry.id}`;
  const shareText = entry.content.length > 100 ? `${entry.content.slice(0, 99)}…` : entry.content;

  return (
    <article
      id={`daily-${entry.id}`}
      className={cn(
        "grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-7 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-4 sm:py-8",
        className
      )}
    >
      <Link
        href="/daily"
        aria-label={copy.profileName}
        className="border-border bg-secondary ring-offset-background focus-visible:ring-primary relative mt-0.5 h-10 w-10 overflow-hidden rounded-full border ring-offset-2 transition-transform outline-none hover:scale-[1.03] focus-visible:ring-2 sm:h-11 sm:w-11"
      >
        <Image
          src="/uploads/images/about-avatar.jpg"
          alt={copy.profileName}
          fill
          sizes="44px"
          className="object-cover"
        />
      </Link>

      <div className="min-w-0">
        <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pr-1 text-sm">
          <Link
            href="/daily"
            className="text-foreground truncate font-semibold outline-none hover:underline focus-visible:underline"
          >
            {copy.profileName}
          </Link>
          <span className="text-muted">{copy.profileHandle}</span>
          <span aria-hidden="true" className="text-muted/65">
            ·
          </span>
          <Link
            href={detailPath}
            className="text-muted hover:text-foreground focus-visible:text-foreground transition-colors outline-none"
          >
            <time dateTime={entry.occurredAt}>{formattedDate}</time>
          </Link>
        </header>

        {entry.isPinned || entry.location ? (
          <div className="text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {entry.isPinned ? (
              <span className="text-primary inline-flex items-center gap-1.5 font-medium">
                <Pin aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
                {copy.pinnedLabel}
              </span>
            ) : null}
            {entry.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{entry.location}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3">
          <DailyContent content={entry.content} />
        </div>

        {entry.images.length > 0 ? (
          <div className="mt-4">
            <DailyMediaGallery
              images={entry.images}
              closeLabel={copy.closeGalleryLabel}
              previousLabel={copy.previousImageLabel}
              nextLabel={copy.nextImageLabel}
              countTemplate={copy.imageCountTemplate}
              positionTemplate={copy.imagePositionTemplate}
            />
          </div>
        ) : null}

        <footer className="border-border/45 mt-4 flex items-center justify-between gap-3 border-t pt-2">
          {showDetailLink ? (
            <Link
              href={detailPath}
              className="text-muted hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground inline-flex min-h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors outline-none"
            >
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
              {copy.viewDetailLabel}
            </Link>
          ) : (
            <span />
          )}
          <DailyShareButton
            path={detailPath}
            title={copy.metadataTitle}
            text={shareText}
            label={copy.shareLabel}
            successLabel={copy.shareSuccessLabel}
          />
        </footer>
      </div>
    </article>
  );
}
