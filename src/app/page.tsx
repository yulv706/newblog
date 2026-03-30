import type { Metadata } from "next";
import { HomeCategoryNav } from "@/components/blog/home-category-nav";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getHomepageData } from "@/lib/posts";
import { getDefaultOgImageUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const homeDescription =
  "Explore featured and latest engineering posts covering Next.js, TypeScript, backend architecture, and practical production lessons.";

export const metadata: Metadata = {
  title: "Home",
  description: homeDescription,
  openGraph: {
    title: "Tech Blog — Home",
    description: homeDescription,
    url: "/",
    images: [
      {
        url: getDefaultOgImageUrl(),
      },
    ],
  },
};

export default async function HomePage() {
  const { featuredPost, latestPosts, categories } = await getHomepageData();

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-16 py-10 sm:py-14">
      <section className="space-y-6">
        <FadeIn className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              Featured
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Insights on modern web engineering
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              Latest writing on Next.js, TypeScript, backend architecture, and
              practical lessons from building production apps.
            </p>
          </div>

          {featuredPost ? (
            <HomePostCard post={featuredPost} featured />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-6 text-muted">
              No published posts yet.
            </div>
          )}
        </FadeIn>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Latest Posts
            </h2>
            <p className="text-sm text-muted">
              Fresh articles with practical tips, deep dives, and implementation
              details.
            </p>
          </div>

          {latestPosts.length === 0 ? (
            <p className="rounded-2xl border border-border/60 bg-card/80 p-6 text-sm text-muted">
              More posts are coming soon.
            </p>
          ) : (
            <StaggeredList className="grid gap-6 sm:grid-cols-2">
              {latestPosts.map((post) => (
                <StaggeredItem key={post.id}>
                  <HomePostCard post={post} />
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </div>

        <FadeIn className="lg:sticky lg:top-24">
          <HomeCategoryNav categories={categories} />
        </FadeIn>
      </section>
    </div>
  );
}
