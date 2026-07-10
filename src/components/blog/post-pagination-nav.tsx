import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PostPaginationNavProps = {
  previous: {
    title: string;
    slug: string;
  } | null;
  next: {
    title: string;
    slug: string;
  } | null;
  dictionary: {
    ariaLabel: string;
    previousPostLabel: string;
    nextPostLabel: string;
  };
};

function PostNavLink({
  label,
  title,
  href,
  align = "left",
}: {
  label: string;
  title: string;
  href: string;
  align?: "left" | "right";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-28 flex-col justify-center border-border/70 py-6 outline-none transition-colors hover:text-primary focus-visible:text-primary",
        align === "right" ? "items-end border-l pl-6 text-right" : "items-start pr-6"
      )}
    >
      <p className="inline-flex items-center gap-2 text-xs font-medium text-muted">
        {align === "left" ? (
          <ArrowLeft
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
            strokeWidth={1.8}
          />
        ) : null}
        {label}
        {align === "right" ? (
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={1.8}
          />
        ) : null}
      </p>
      <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary sm:text-base">
        {title}
      </p>
    </Link>
  );
}

export function PostPaginationNav({
  previous,
  next,
  dictionary,
}: PostPaginationNavProps) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      aria-label={dictionary.ariaLabel}
      className="grid border-y border-border/70 sm:grid-cols-2"
    >
      {previous ? (
        <PostNavLink
          label={dictionary.previousPostLabel}
          title={previous.title}
          href={`/blog/${previous.slug}`}
        />
      ) : (
        <div />
      )}

      {next ? (
        <PostNavLink
          label={dictionary.nextPostLabel}
          title={next.title}
          href={`/blog/${next.slug}`}
          align="right"
        />
      ) : (
        <div />
      )}
    </nav>
  );
}
