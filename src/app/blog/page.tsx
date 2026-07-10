import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Tags, X } from "lucide-react";
import {
  BlogArchivePost,
  BlogFeaturedPost,
} from "@/components/blog/blog-post-preview";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getRequestI18n } from "@/lib/i18n/server";
import { getBlogListingData } from "@/lib/posts";
import { buildLocalizedMetadataFields } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dictionary } = await getRequestI18n();
  const blogDictionary = dictionary.public.blog;

  return buildLocalizedMetadataFields(locale, {
    title: blogDictionary.title,
    description: blogDictionary.description,
    path: "/blog",
  });
}

type BlogPageProps = {
  searchParams?: Promise<{
    page?: string;
    category?: string;
    tag?: string;
  }>;
};

function parsePage(rawPage: string | undefined) {
  const parsedPage = Number.parseInt(rawPage ?? "", 10);
  if (Number.isNaN(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function buildBlogHref({
  page,
  category,
  tag,
}: {
  page?: number;
  category?: string | null;
  tag?: string | null;
}) {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
  }
  if (tag) {
    params.set("tag", tag);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function CategoryFilterLink({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium outline-none transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted hover:text-foreground focus-visible:border-primary/60 focus-visible:text-foreground"
      )}
    >
      <span>{label}</span>
      <span className="font-mono text-[0.68rem] text-muted">{count}</span>
    </Link>
  );
}

function TagFilterLink({
  label,
  count,
  href,
  active,
  showHash = true,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
  showHash?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm outline-none transition-colors",
        active
          ? "border-primary/45 bg-primary/10 text-primary"
          : "border-border/70 text-muted hover:border-foreground/25 hover:text-foreground focus-visible:border-primary focus-visible:text-foreground"
      )}
    >
      <span>{showHash ? `#${label}` : label}</span>
      <span className="font-mono text-[0.68rem] opacity-75">{count}</span>
    </Link>
  );
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { locale, dictionary } = await getRequestI18n();
  const blogDictionary = dictionary.public.blog;
  const commonDictionary = dictionary.public.common;
  const postDictionary = dictionary.public.post;
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = parsePage(resolvedSearchParams.page);
  const categoryFilter = resolvedSearchParams.category?.trim() || undefined;
  const tagFilter = resolvedSearchParams.tag?.trim() || undefined;

  const listingData = await getBlogListingData({
    page: requestedPage,
    category: categoryFilter,
    tag: tagFilter,
    perPage: 10,
  });

  const {
    posts,
    categories,
    tags,
    pagination,
    activeCategory,
    activeTag,
    totalPublished,
  } = listingData;
  const currentPage = pagination.currentPage;
  const showFeatured =
    currentPage === 1 && !categoryFilter && !tagFilter && posts.length > 0;
  const featuredPost = showFeatured ? posts[0] : null;
  const archivePosts = showFeatured ? posts.slice(1) : posts;
  const hasRequestedFilter = Boolean(categoryFilter || tagFilter);
  const previewDictionary = {
    coverImageAltTemplate: postDictionary.coverImageAltTemplate,
    dateFallbackLabel: commonDictionary.dateFallbackLabel,
    uncategorizedLabel: commonDictionary.uncategorizedLabel,
    readingTimeTemplate: blogDictionary.readingTimeTemplate,
    featuredActionLabel: blogDictionary.featuredActionLabel,
    readArticleLabel: blogDictionary.readArticleLabel,
  };
  const pageIndicator = interpolateTemplate(blogDictionary.pageIndicatorTemplate, {
    current: currentPage,
    total: pagination.totalPages,
  });

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] pb-20 pt-8 sm:pb-24 sm:pt-12">
      <FadeIn className="grid gap-10 border-b border-border/70 pb-12 pt-4 sm:pb-16 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl space-y-5">
          <p className="font-mono text-[0.68rem] font-medium uppercase text-primary">
            {blogDictionary.eyebrow}
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] text-foreground sm:text-6xl">
            {blogDictionary.title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-muted sm:text-lg">
            {blogDictionary.description}
          </p>
        </div>

        <dl className="flex min-w-0 divide-x divide-border/70 border-y border-border/70 lg:border-y-0">
          <div className="min-w-0 py-4 pr-6 lg:py-2">
            <dt className="sr-only">
              {interpolateTemplate(blogDictionary.totalPostsTemplate, {
                count: totalPublished,
              })}
            </dt>
            <dd className="whitespace-nowrap font-mono text-sm text-foreground">
              {interpolateTemplate(blogDictionary.totalPostsTemplate, {
                count: totalPublished,
              })}
            </dd>
          </div>
          <div className="min-w-0 py-4 pl-6 lg:py-2">
            <dt className="sr-only">
              {interpolateTemplate(blogDictionary.totalTopicsTemplate, {
                count: categories.length,
              })}
            </dt>
            <dd className="whitespace-nowrap font-mono text-sm text-foreground">
              {interpolateTemplate(blogDictionary.totalTopicsTemplate, {
                count: categories.length,
              })}
            </dd>
          </div>
        </dl>
      </FadeIn>

      {featuredPost ? (
        <section aria-labelledby="featured-writing-heading" className="pt-12 sm:pt-16">
          <FadeIn>
            <h2
              id="featured-writing-heading"
              className="mb-6 font-mono text-[0.68rem] font-medium uppercase text-muted"
            >
              {blogDictionary.featuredLabel}
            </h2>
            <BlogFeaturedPost
              post={featuredPost}
              locale={locale}
              dictionary={previewDictionary}
            />
          </FadeIn>
        </section>
      ) : null}

      <section aria-labelledby="writing-archive-heading" className="pt-12 sm:pt-16">
        <FadeIn className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <h2
                id="writing-archive-heading"
                className="text-2xl font-semibold text-foreground sm:text-3xl"
              >
                {blogDictionary.archiveHeading}
              </h2>
              <p className="text-sm leading-6 text-muted">
                {blogDictionary.archiveDescription}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs text-muted">
                {interpolateTemplate(blogDictionary.resultsTemplate, {
                  count: pagination.totalItems,
                })}
              </p>
              {hasRequestedFilter ? (
                <Link
                  href="/blog"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/70 px-3 text-xs font-medium text-muted outline-none transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:border-primary focus-visible:text-foreground"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  {blogDictionary.clearFiltersButton}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="border-y border-border/70">
            <div className="grid gap-2 py-3 lg:grid-cols-[9rem_minmax(0,1fr)] lg:items-center lg:gap-6">
              <p className="text-xs font-medium text-muted">
                {blogDictionary.filterHeading}
              </p>
              <nav
                aria-label={blogDictionary.categoriesHeading}
                className="flex min-w-0 gap-6 overflow-x-auto"
              >
                <CategoryFilterLink
                  label={commonDictionary.allLabel}
                  count={totalPublished}
                  href={buildBlogHref({ tag: activeTag?.slug, page: 1 })}
                  active={!categoryFilter}
                />
                {categories.map((category) => (
                  <CategoryFilterLink
                    key={category.slug}
                    label={category.name}
                    count={category.count}
                    href={buildBlogHref({
                      category: category.slug,
                      tag: activeTag?.slug,
                      page: 1,
                    })}
                    active={activeCategory?.slug === category.slug}
                  />
                ))}
              </nav>
            </div>

            {tags.length > 0 ? (
              <details className="group border-t border-border/55" open={Boolean(activeTag)}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm text-muted outline-none transition-colors hover:text-foreground focus-visible:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <Tags aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} />
                    {interpolateTemplate(blogDictionary.tagsDisclosureTemplate, {
                      count: tags.length,
                    })}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-apple)] group-open:rotate-180"
                    strokeWidth={1.7}
                  />
                </summary>
                <nav
                  aria-label={blogDictionary.tagsHeading}
                  className="flex flex-wrap gap-2 pb-5"
                >
                  <TagFilterLink
                    label={commonDictionary.allLabel}
                    count={totalPublished}
                    showHash={false}
                    href={buildBlogHref({
                      category: activeCategory?.slug,
                      page: 1,
                    })}
                    active={!tagFilter}
                  />
                  {tags.map((tag) => (
                    <TagFilterLink
                      key={tag.slug}
                      label={tag.name}
                      count={tag.count}
                      href={buildBlogHref({
                        category: activeCategory?.slug,
                        tag: tag.slug,
                        page: 1,
                      })}
                      active={activeTag?.slug === tag.slug}
                    />
                  ))}
                </nav>
              </details>
            ) : null}
          </div>
        </FadeIn>

        {posts.length === 0 ? (
          <FadeIn className="border-b border-border/70 py-14 text-center">
            <p className="text-base font-medium text-foreground">
              {blogDictionary.emptyTitle}
            </p>
            <p className="mt-2 text-sm text-muted">
              {blogDictionary.emptyDescription}
            </p>
          </FadeIn>
        ) : archivePosts.length > 0 ? (
          <StaggeredList className="mt-2 min-w-0">
            {archivePosts.map((post, index) => (
              <StaggeredItem
                key={post.id}
                className={cn(index > 0 && "border-t border-border/60")}
              >
                <BlogArchivePost
                  post={post}
                  locale={locale}
                  dictionary={previewDictionary}
                />
              </StaggeredItem>
            ))}
          </StaggeredList>
        ) : (
          <FadeIn className="border-b border-border/70 py-12 text-sm text-muted">
            {blogDictionary.noMorePostsLabel}
          </FadeIn>
        )}

        {pagination.totalPages > 1 ? (
          <nav
            aria-label={pageIndicator}
            className="mt-10 flex items-center justify-between gap-4 border-t border-border/70 pt-6"
          >
            {pagination.hasPrevPage ? (
              <Link
                href={buildBlogHref({
                  page: currentPage - 1,
                  category: activeCategory?.slug,
                  tag: activeTag?.slug,
                })}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                {blogDictionary.previousPageLabel}
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center gap-2 text-sm text-muted/55">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                {blogDictionary.previousPageLabel}
              </span>
            )}

            <p className="font-mono text-xs text-muted">
              {pageIndicator}
            </p>

            {pagination.hasNextPage ? (
              <Link
                href={buildBlogHref({
                  page: currentPage + 1,
                  category: activeCategory?.slug,
                  tag: activeTag?.slug,
                })}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary"
              >
                {blogDictionary.nextPageLabel}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center gap-2 text-sm text-muted/55">
                {blogDictionary.nextPageLabel}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
