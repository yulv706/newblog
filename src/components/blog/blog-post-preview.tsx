import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import { CoverMedia } from "@/components/blog/cover-media";
import type { AppLocale } from "@/lib/i18n/config";
import { getDateLocale } from "@/lib/i18n/config";
import type { BlogListingPost } from "@/lib/posts";

type BlogPostPreviewDictionary = {
  coverImageAltTemplate: string;
  dateFallbackLabel: string;
  uncategorizedLabel: string;
  readingTimeTemplate: string;
  featuredActionLabel: string;
  readArticleLabel: string;
};

type BlogPostPreviewProps = {
  post: BlogListingPost;
  locale: AppLocale;
  dictionary: BlogPostPreviewDictionary;
};

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function formatDate(
  dateString: string | null,
  locale: AppLocale,
  fallbackLabel: string,
  compact = false
) {
  if (!dateString) {
    return fallbackLabel;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    year: "numeric",
    month: compact ? "2-digit" : "short",
    day: "2-digit",
  }).format(new Date(dateString));
}

function ReadingTime({
  minutes,
  template,
}: {
  minutes: number;
  template: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.7} />
      {interpolateTemplate(template, { minutes })}
    </span>
  );
}

export function BlogFeaturedPost({
  post,
  locale,
  dictionary,
}: BlogPostPreviewProps) {
  const href = `/blog/${post.slug}`;
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <article className="group grid min-w-0 gap-7 border-b border-border/70 pb-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-center lg:gap-14 lg:pb-16">
      <Link
        href={href}
        aria-label={`${dictionary.readArticleLabel}: ${post.title}`}
        className="relative block aspect-[4/3] min-w-0 overflow-hidden rounded-lg bg-secondary shadow-[0_22px_60px_-38px_rgba(15,23,42,0.45)] outline-none transition-[transform,box-shadow] duration-500 ease-[var(--ease-apple)] group-hover:-translate-y-1 group-hover:shadow-[0_30px_70px_-34px_rgba(15,23,42,0.48)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:aspect-[16/10]"
      >
        <CoverMedia
          src={post.coverImage}
          alt={dictionary.coverImageAltTemplate.replace("{title}", post.title)}
          title={post.title}
          className="h-full w-full"
          fallbackClassName="h-full w-full"
          loading="eager"
        />
      </Link>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.68rem] font-medium uppercase text-muted">
          <span className="text-primary">
            {post.categoryName ?? dictionary.uncategorizedLabel}
          </span>
          <span aria-hidden="true" className="h-px w-5 bg-border" />
          <time dateTime={publishedAt}>
            {formatDate(publishedAt, locale, dictionary.dateFallbackLabel)}
          </time>
          <ReadingTime
            minutes={post.readingMinutes}
            template={dictionary.readingTimeTemplate}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            <Link
              href={href}
              className="decoration-primary/35 decoration-2 underline-offset-8 outline-none hover:underline focus-visible:underline"
            >
              {post.title}
            </Link>
          </h2>
          {post.excerpt ? (
            <p className="max-w-xl text-[0.98rem] leading-8 text-muted sm:text-base">
              {post.excerpt}
            </p>
          ) : null}
        </div>

        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}

        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary"
        >
          {dictionary.featuredActionLabel}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-apple)] group-hover:translate-x-1"
            strokeWidth={1.8}
          />
        </Link>
      </div>
    </article>
  );
}

export function BlogArchivePost({
  post,
  locale,
  dictionary,
}: BlogPostPreviewProps) {
  const href = `/blog/${post.slug}`;
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <article className="group grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] gap-x-5 gap-y-3 rounded-lg px-2 py-7 transition-colors duration-300 hover:bg-secondary/55 sm:grid-cols-[7rem_minmax(0,1fr)_10.5rem] sm:px-4 sm:py-8">
      <time
        dateTime={publishedAt}
        className="col-span-2 font-mono text-[0.68rem] font-medium text-muted sm:col-span-1 sm:pt-1"
      >
        {formatDate(publishedAt, locale, dictionary.dateFallbackLabel, true)}
      </time>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="font-medium text-primary">
            {post.categoryName ?? dictionary.uncategorizedLabel}
          </span>
          <ReadingTime
            minutes={post.readingMinutes}
            template={dictionary.readingTimeTemplate}
          />
        </div>
        <h3 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
          <Link
            href={href}
            className="inline-flex items-start gap-2 outline-none decoration-primary/35 decoration-2 underline-offset-6 hover:underline focus-visible:underline"
          >
            <span>{post.title}</span>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-muted transition-[color,transform] duration-300 ease-[var(--ease-apple)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
              strokeWidth={1.7}
            />
          </Link>
        </h3>
        {post.excerpt ? (
          <p className="line-clamp-2 max-w-2xl text-sm leading-7 text-muted">
            {post.excerpt}
          </p>
        ) : null}
      </div>

      <Link
        href={href}
        aria-label={`${dictionary.readArticleLabel}: ${post.title}`}
        className="relative aspect-[4/3] self-center overflow-hidden rounded-md bg-secondary outline-none transition-[transform,box-shadow] duration-500 ease-[var(--ease-apple)] group-hover:-translate-y-0.5 group-hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:aspect-[3/2]"
      >
        <CoverMedia
          src={post.coverImage}
          alt={dictionary.coverImageAltTemplate.replace("{title}", post.title)}
          title={post.title}
          className="h-full w-full"
          fallbackClassName="h-full w-full"
        />
      </Link>
    </article>
  );
}
