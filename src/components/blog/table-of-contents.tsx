"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableOfContentsItem } from "@/lib/markdown";

type TableOfContentsProps = {
  headings: TableOfContentsItem[];
  className?: string;
  collapsible?: boolean;
  title?: string;
};

export function TableOfContents({
  headings,
  className,
  collapsible = false,
  title = "Table of Contents",
}: TableOfContentsProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(
    headings[0]?.id ?? null
  );
  const [isOpen, setIsOpen] = useState(!collapsible);

  const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);

  useEffect(() => {
    if (headingIds.length === 0) {
      setActiveHeadingId(null);
      return;
    }

    const updateActiveHeading = () => {
      const scrollOffset = 132;
      let currentId = headingIds[0] ?? null;

      for (const headingId of headingIds) {
        const element = document.getElementById(headingId);
        if (!element) {
          continue;
        }

        if (element.getBoundingClientRect().top - scrollOffset <= 0) {
          currentId = headingId;
        }
      }

      setActiveHeadingId(currentId);
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [headingIds]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 p-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {title}
        </h2>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="post-detail-toc-list"
            className="rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-secondary hover:text-foreground"
          >
            {isOpen ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      <ul
        id="post-detail-toc-list"
        className={cn("mt-3 space-y-1.5", collapsible && !isOpen && "hidden")}
      >
        {headings.map((heading) => {
          const isActive = activeHeadingId === heading.id;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block rounded-md py-1 text-sm transition",
                  heading.depth === 3 ? "pl-4" : "pl-0",
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted hover:text-foreground"
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
