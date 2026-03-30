import type { Metadata } from "next";
import Link from "next/link";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getBlogListingData } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Browse all published posts and filter articles by category or tag to find topics that match your interests.",
};

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
    <div className="space-y-10 py-10 sm:py-14">
      <FadeIn className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Blog</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Browse all published posts, then narrow results by category or tag.
        </p>
      </FadeIn>

      <section className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <FadeIn className="space-y-5 rounded-2xl border border-border/60 bg-card/80 p-5 lg:sticky lg:top-24">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              <FilterLink
                label="All"
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
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              <FilterLink
                label="All"
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

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
              <p className="text-base font-medium text-foreground">No posts found.</p>
              <p className="mt-2 text-sm text-muted">
                Try adjusting filters to see more articles.
              </p>
              {(activeCategory || activeTag) && (
                <Link
                  href="/blog"
                  className="mt-4 inline-flex rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-secondary hover:text-foreground"
                >
                  Clear all filters
                </Link>
              )}
            </div>
          ) : (
            <StaggeredList className="grid gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <StaggeredItem key={post.id}>
                  <HomePostCard post={post} />
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
                  Previous
                </Link>
              ) : (
                <span className="rounded-full border border-border/40 px-4 py-2 text-sm text-muted">
                  Previous
                </span>
              )}

              <p className="text-sm text-muted">
                Page {currentPage} of {pagination.totalPages}
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
                  Next
                </Link>
              ) : (
                <span className="rounded-full border border-border/40 px-4 py-2 text-sm text-muted">
                  Next
                </span>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
