import Link from "next/link";
import { deletePostAction, togglePostStatusAction } from "@/actions/posts";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { getAdminPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminPostsPageProps = {
  searchParams?: Promise<{
    sort?: string;
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

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const sortDirection = resolvedSearchParams.sort === "asc" ? "asc" : "desc";
  const posts = await getAdminPosts(sortDirection);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted">
            Manage post metadata, publication state, and deletion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`?sort=${sortDirection === "desc" ? "asc" : "desc"}`}
            className="rounded-xl border border-border px-3 py-2 text-sm transition hover:bg-secondary"
          >
            Sort by date: {sortDirection === "desc" ? "Newest" : "Oldest"}
          </Link>
          <Link
            href="/admin/posts/new"
            className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            New Post
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
          <h2 className="text-base font-semibold tracking-tight">No posts yet</h2>
          <p className="mt-2 text-sm text-muted">
            Create your first post to start publishing content.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/70">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{post.title}</p>
                      <p className="text-xs text-muted">/{post.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        post.status === "published"
                          ? "inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                          : "inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                      }
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {post.categoryName ?? "Uncategorized"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-secondary"
                      >
                        Edit
                      </Link>

                      <form action={togglePostStatusAction}>
                        <input type="hidden" name="postId" value={post.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-secondary"
                        >
                          {post.status === "published" ? "Move to draft" : "Publish"}
                        </button>
                      </form>

                      <DeletePostButton
                        postId={post.id}
                        postTitle={post.title}
                        action={deletePostAction}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
