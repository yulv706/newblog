import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="space-y-8 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted">
          Published articles from engineering notes and experiments.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">No published posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xl font-semibold tracking-tight transition hover:text-primary"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {post.categoryName ?? "Uncategorized"}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </p>
              </div>

              {post.excerpt ? (
                <p className="mt-3 text-sm text-muted">{post.excerpt}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
