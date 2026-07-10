import type { Metadata } from "next";
import Link from "next/link";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getRequestI18n } from "@/lib/i18n/server";
import { getBlogListingData } from "@/lib/posts";
import { buildLocalizedMetadataFields } from "@/lib/seo";

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

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition"
          : "rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted transition hover:border-primary/40 hover:text-foreground"
      }
    >
      {label}
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

  const { posts, categories, tags, pagination, activeCategory, activeTag } = listingData;
  const currentPage = pagination.currentPage;

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-10 py-8 sm:py-12">
      <FadeIn className="relative isolate grid gap-8 overflow-hidden rounded-[1.75rem] border border-border/55 bg-card/65 p-7 sm:p-10 md:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)] md:items-end">
        <div className="pointer-events-none absolute -left-20 -top-24 -z-10 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="space-y-3">
          <p className="font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary">ARCHIVE / NOTES</p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {blogDictionary.title}
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base md:justify-self-end">
          {blogDictionary.description}
        </p>
      </FadeIn>

      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <FadeIn className="min-w-0 space-y-6 rounded-[1.5rem] border border-border/60 bg-card/65 p-6 shadow-xs lg:sticky lg:top-24">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              {blogDictionary.categoriesHeading}
            </h2>
            <div className="flex flex-wrap gap-2">
              <FilterLink
                label={commonDictionary.allLabel}
                href={buildBlogHref({ tag: activeTag?.slug, page: 1 })}
                active={!activeCategory}
              />
              {categories.map((category) => (
                <FilterLink
                  key={category.slug}
                  label={`${category.name} (${category.count})`}
                  href={buildBlogHref({
                    category: category.slug,
                    tag: activeTag?.slug,
                    page: 1,
                  })}
                  active={activeCategory?.slug === category.slug}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              {blogDictionary.tagsHeading}
            </h2>
            <div className="flex flex-wrap gap-2">
              <FilterLink
                label={commonDictionary.allLabel}
                href={buildBlogHref({ category: activeCategory?.slug, page: 1 })}
                active={!activeTag}
              />
              {tags.map((tag) => (
                <FilterLink
                  key={tag.slug}
                  label={`${tag.name} (${tag.count})`}
                  href={buildBlogHref({
                    category: activeCategory?.slug,
                    tag: tag.slug,
                    page: 1,
                  })}
                  active={activeTag?.slug === tag.slug}
                />
              ))}
            </div>
          </div>
        </FadeIn>

        <div className="min-w-0 space-y-6">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
              <p className="text-base font-medium text-foreground">
                {blogDictionary.emptyTitle}
              </p>
              <p className="mt-2 text-sm text-muted">
                {blogDictionary.emptyDescription}
              </p>
              {(activeCategory || activeTag) && (
                <Link
                  href="/blog"
                  className="mt-4 inline-flex rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-secondary hover:text-foreground"
                >
                  {blogDictionary.clearFiltersButton}
                </Link>
              )}
            </div>
          ) : (
            <StaggeredList className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <StaggeredItem key={post.id} className="min-w-0">
                  <HomePostCard
                    post={post}
                    locale={locale}
                    dictionary={{
                      noCoverImageLabel: commonDictionary.noCoverImageLabel,
                      uncategorizedLabel: commonDictionary.uncategorizedLabel,
                      coverImageAltTemplate: postDictionary.coverImageAltTemplate,
                      dateFallbackLabel: commonDictionary.dateFallbackLabel,
                    }}
                  />
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}

          {pagination.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 p-4">
              {pagination.hasPrevPage ? (
                <Link
                  href={buildBlogHref({
                    page: currentPage - 1,
                    category: activeCategory?.slug,
                    tag: activeTag?.slug,
                  })}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
                >
                  {blogDictionary.previousPageLabel}
                </Link>
              ) : (
                <span className="rounded-full border border-border/40 px-4 py-2 text-sm text-muted">
                  {blogDictionary.previousPageLabel}
                </span>
              )}

              <p className="text-sm text-muted">
                {interpolateTemplate(blogDictionary.pageIndicatorTemplate, {
                  current: currentPage,
                  total: pagination.totalPages,
                })}
              </p>

              {pagination.hasNextPage ? (
                <Link
                  href={buildBlogHref({
                    page: currentPage + 1,
                    category: activeCategory?.slug,
                    tag: activeTag?.slug,
                  })}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
                >
                  {blogDictionary.nextPageLabel}
                </Link>
              ) : (
                <span className="rounded-full border border-border/40 px-4 py-2 text-sm text-muted">
                  {blogDictionary.nextPageLabel}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
