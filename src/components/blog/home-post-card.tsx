import React from "react";
import Link from "next/link";
import { CoverMedia } from "@/components/blog/cover-media";
import { CardHover } from "@/components/ui/animations";
import type { AppLocale } from "@/lib/i18n/config";
import { getDateLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { HomepagePostCard } from "@/lib/posts";

type HomePostCardDictionary = {
  noCoverImageLabel: string;
  uncategorizedLabel: string;
  coverImageAltTemplate: string;
  dateFallbackLabel: string;
};

function formatDate(
  dateString: string | null,
  locale: AppLocale,
  fallbackLabel: string
) {
  if (!dateString) {
    return fallbackLabel;
  }

  return new Date(dateString).toLocaleDateString(getDateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CardCover({
  title,
  coverImage,
  featured,
  coverImageAltTemplate,
}: {
  title: string;
  coverImage: string | null;
  featured: boolean;
  coverImageAltTemplate: string;
}) {
  return (
    <CoverMedia
      src={coverImage}
      alt={coverImageAltTemplate.replace("{title}", title)}
      title={title}
      className={cn(
        "w-full object-cover",
        featured ? "h-72 md:h-full md:min-h-[390px]" : "aspect-[16/10]"
      )}
      fallbackClassName={cn(
        featured ? "h-72 md:h-full md:min-h-[390px]" : "aspect-[16/10]"
      )}
      loading={featured ? "eager" : "lazy"}
    />
  );
}

export function HomePostCard({
  post,
  featured = false,
  locale,
  dictionary,
  ctaLabel,
}: {
  post: HomepagePostCard;
  featured?: boolean;
  locale: AppLocale;
  dictionary: HomePostCardDictionary;
  ctaLabel?: string;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full min-w-0 w-full rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <CardHover
        className={cn(
          "h-full min-w-0 w-full overflow-hidden rounded-[1.75rem] border-border/60 bg-card/88 shadow-sm",
          featured
            ? "md:grid md:grid-cols-[minmax(0,1.16fr)_minmax(21rem,0.84fr)]"
            : "flex flex-col"
        )}
      >
        <CardCover
          title={post.title}
          coverImage={post.coverImage}
          featured={featured}
          coverImageAltTemplate={dictionary.coverImageAltTemplate}
        />

        <div
          className={cn(
            "flex h-full flex-col p-6 sm:p-7",
            featured ? "justify-between gap-10 md:p-10 lg:p-12" : "gap-6"
          )}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 font-medium text-primary">
                {post.categoryName ?? dictionary.uncategorizedLabel}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
              <time
                className="text-muted"
                dateTime={post.publishedAt ?? post.createdAt}
              >
                {formatDate(
                  post.publishedAt ?? post.createdAt,
                  locale,
                  dictionary.dateFallbackLabel
                )}
              </time>
            </div>

            <h3
              className={cn(
                "font-semibold leading-tight tracking-[-0.035em] text-foreground transition-colors group-hover:text-primary",
                featured ? "text-3xl sm:text-4xl" : "text-xl sm:text-[1.35rem]"
              )}
            >
              {post.title}
            </h3>

            {post.excerpt ? (
              <p
                className={cn(
                  "leading-relaxed text-muted",
                  featured ? "text-base sm:text-[1.05rem]" : "line-clamp-3 text-sm"
                )}
              >
                {post.excerpt}
              </p>
            ) : null}
          </div>

          <div className="mt-auto space-y-5">
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {post.tags.slice(0, featured ? 4 : 3).map((tag) => (
                  <span key={`${post.id}-${tag}`} className="text-xs text-muted/80">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            {ctaLabel ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                {ctaLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : null}
          </div>
        </div>
      </CardHover>
    </Link>
  );
}
