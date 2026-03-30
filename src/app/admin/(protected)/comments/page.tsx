import Link from "next/link";
import { approveCommentAction, deleteCommentAction } from "@/actions/comments";
import {
  formatCommentTimestamp,
  getApprovedCommentsForAdmin,
  getPendingCommentsForAdmin,
} from "@/lib/comments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCommentsPage() {
  const [pendingComments, approvedComments] = await Promise.all([
    getPendingCommentsForAdmin(),
    getApprovedCommentsForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Comments</h1>
        <p className="text-sm text-muted">
          Review pending comments and decide what appears on the public post pages.
        </p>
      </header>

      <p className="text-sm text-muted">
        Pending queue:{" "}
        <span className="font-semibold text-foreground">{pendingComments.length}</span>
      </p>

      {pendingComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
          <h2 className="text-base font-semibold tracking-tight">All caught up</h2>
          <p className="mt-2 text-sm text-muted">
            There are no pending comments to moderate right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pendingComments.map((comment) => (
            <li
              key={comment.id}
              className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5"
            >
              <div className="space-y-1">
                <p className="text-sm text-muted">
                  On{" "}
                  <Link
                    href={`/blog/${comment.postSlug}`}
                    className="font-medium text-foreground underline-offset-4 transition hover:text-primary hover:underline"
                  >
                    {comment.postTitle}
                  </Link>
                </p>
                <p className="text-sm font-medium text-foreground">{comment.nickname}</p>
                <p className="text-xs text-muted">{comment.email}</p>
                <p className="text-xs text-muted">
                  Submitted {formatCommentTimestamp(comment.createdAt)}
                </p>
              </div>

              <p className="rounded-xl bg-secondary/50 px-3 py-2 text-sm leading-7 whitespace-pre-wrap break-words">
                {comment.body}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <form action={approveCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="postSlug" value={comment.postSlug} />
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    Approve
                  </button>
                </form>

                <form action={deleteCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="postSlug" value={comment.postSlug} />
                  <button
                    type="submit"
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Approved comments</h2>
        <p className="text-sm text-muted">
          Delete any approved comment to remove it from the public post page.
        </p>

        {approvedComments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-4 text-sm text-muted">
            No approved comments yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {approvedComments.map((comment) => (
              <li
                key={comment.id}
                className="space-y-3 rounded-xl border border-border/70 bg-card p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm text-muted">
                    On{" "}
                    <Link
                      href={`/blog/${comment.postSlug}`}
                      className="font-medium text-foreground underline-offset-4 transition hover:text-primary hover:underline"
                    >
                      {comment.postTitle}
                    </Link>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {comment.nickname}
                  </p>
                  <p className="text-xs text-muted">
                    Approved comment • {formatCommentTimestamp(comment.createdAt)}
                  </p>
                </div>

                <p className="rounded-xl bg-secondary/50 px-3 py-2 text-sm leading-7 whitespace-pre-wrap break-words">
                  {comment.body}
                </p>

                <form action={deleteCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="postSlug" value={comment.postSlug} />
                  <button
                    type="submit"
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
