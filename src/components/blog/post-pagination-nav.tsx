import Link from "next/link";

type PostPaginationNavProps = {
  previous: {
    title: string;
    slug: string;
  } | null;
  next: {
    title: string;
    slug: string;
  } | null;
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
      className="group rounded-xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/50 hover:bg-card"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p
        className={`mt-2 text-sm font-medium text-foreground transition group-hover:text-primary ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        {title}
      </p>
    </Link>
  );
}

export function PostPaginationNav({ previous, next }: PostPaginationNavProps) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      aria-label="Post navigation"
      className="grid gap-3 border-t border-border/60 pt-8 sm:grid-cols-2"
    >
      {previous ? (
        <PostNavLink
          label="Previous post"
          title={previous.title}
          href={`/blog/${previous.slug}`}
        />
      ) : (
        <div />
      )}

      {next ? (
        <PostNavLink
          label="Next post"
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
