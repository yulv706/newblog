import Link from "next/link";
import { CardHover } from "@/components/ui/animations";
import { cn } from "@/lib/utils";
import type { HomepagePostCard } from "@/lib/posts";

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

function CardCover({
  title,
  coverImage,
  featured,
}: {
  title: string;
  coverImage: string | null;
  featured: boolean;
}) {
  if (!coverImage) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary text-sm font-medium text-muted",
          featured ? "h-64 md:h-full md:min-h-[260px]" : "h-44"
        )}
      >
        No Cover Image
      </div>
    );
  }

  return (
    <img
      src={coverImage}
      alt={`${title} cover image`}
      className={cn(
        "w-full object-cover",
        featured ? "h-64 md:h-full md:min-h-[260px]" : "h-44"
      )}
      loading={featured ? "eager" : "lazy"}
    />
  );
}

export function HomePostCard({
  post,
  featured = false,
}: {
  post: HomepagePostCard;
  featured?: boolean;
}) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <CardHover
        className={cn(
          "h-full overflow-hidden border-border/60 bg-card/90",
          featured ? "md:grid md:grid-cols-[1.2fr_1fr]" : ""
        )}
      >
        <CardCover title={post.title} coverImage={post.coverImage} featured={featured} />

        <div
          className={cn(
            "space-y-4 p-6",
            featured ? "md:p-8" : "flex h-full flex-col justify-between"
          )}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {post.categoryName ?? "Uncategorized"}
              </span>
              <span className="text-muted">
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
            </div>

            <h3
              className={cn(
                "font-semibold tracking-tight text-foreground",
                featured ? "text-2xl sm:text-3xl" : "text-xl"
              )}
            >
              {post.title}
            </h3>

            {post.excerpt ? (
              <p className="text-sm leading-relaxed text-muted sm:text-base">
                {post.excerpt}
              </p>
            ) : null}
          </div>

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {post.tags.map((tag) => (
                <span
                  key={`${post.id}-${tag}`}
                  className="rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </CardHover>
    </Link>
  );
}
