import Link from "next/link";
import { getRecentPostsForSearch, searchPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "—";
  }

  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQuery = resolvedSearchParams.q ?? "";
  const searchResult = await searchPublishedPosts(rawQuery);
  const showSearchResults = searchResult.normalizedQuery.length > 0;
  const recentPosts = showSearchResults ? [] : await getRecentPostsForSearch();

  return (
    <div className="space-y-8 py-10 sm:py-14">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Search</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Search published posts by title or content. English and Chinese keywords are
          supported.
        </p>

        <form action="/search" method="get" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="search-query" className="sr-only">
            Search posts
          </label>
          <input
            id="search-query"
            name="q"
            type="search"
            defaultValue={rawQuery}
            placeholder="Try: Next.js, React, 深入理解..."
            className="h-11 w-full rounded-full border border-border/70 bg-card px-4 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-base"
          />
          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:text-base"
          >
            Search
          </button>
        </form>
      </section>

      {showSearchResults ? (
        searchResult.results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
            <p className="text-base font-medium text-foreground">No posts found.</p>
            <p className="mt-2 text-sm text-muted">
              Try another keyword or check your spelling.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <p className="text-sm text-muted">
              Found {searchResult.results.length} result
              {searchResult.results.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-foreground">
                &ldquo;{searchResult.normalizedQuery}&rdquo;
              </span>
              .
            </p>

            <ul className="space-y-4">
              {searchResult.results.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block rounded-2xl border border-border/70 bg-card/80 p-5 transition hover:border-primary/40 hover:bg-card"
                  >
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted">
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </p>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {post.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted sm:text-base">
                        {post.snippet}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : (
        <section className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted sm:text-base">
            Enter a keyword to search post titles and content.
          </div>

          {recentPosts.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Recent Posts
              </h2>
              <ul className="space-y-3">
                {recentPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="block rounded-xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/40 hover:bg-card"
                    >
                      <p className="text-xs uppercase tracking-[0.14em] text-muted">
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{post.title}</p>
                      <p className="mt-1 text-sm text-muted">{post.snippet}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
