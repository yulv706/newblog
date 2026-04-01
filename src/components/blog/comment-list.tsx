import {
  formatCommentTimestamp,
  getCommentAvatarPlaceholder,
  type ApprovedComment,
} from "@/lib/comments";
import type { AppLocale } from "@/lib/i18n/config";
import { getDateLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type CommentListProps = {
  comments: ApprovedComment[];
  locale: AppLocale;
  emptyStateLabel: string;
  unknownDateLabel: string;
};

export function CommentList({
  comments,
  locale,
  emptyStateLabel,
  unknownDateLabel,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm text-muted">
        {emptyStateLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {comments.map((comment) => {
        const avatar = getCommentAvatarPlaceholder(comment.nickname);

        return (
          <li
            key={comment.id}
            className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  avatar.className
                )}
              >
                {avatar.label}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-medium text-foreground">{comment.nickname}</p>
                  <span aria-hidden="true" className="text-xs text-muted">
                    •
                  </span>
                  <time
                    dateTime={comment.createdAt}
                    className="text-xs text-muted sm:text-sm"
                  >
                    {formatCommentTimestamp(
                      comment.createdAt,
                      getDateLocale(locale),
                      unknownDateLabel
                    )}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                  {comment.body}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
