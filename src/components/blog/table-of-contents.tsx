"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
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
  title,
}: TableOfContentsProps) {
  const { dictionary } = useLocaleContext();
  const tocDictionary = dictionary.public.post.tableOfContents;
  const resolvedTitle = title ?? tocDictionary.title;
  const listId = useId();
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
      aria-label={tocDictionary.ariaLabel}
      className={cn(
        collapsible
          ? "rounded-lg border border-border/70 bg-card/60 p-4"
          : "border-l border-border/70 pl-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-muted">
          {resolvedTitle}
        </h2>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-label={isOpen ? tocDictionary.hideButton : tocDictionary.showButton}
            title={isOpen ? tocDictionary.hideButton : tocDictionary.showButton}
            className="grid h-8 w-8 place-items-center rounded-md text-muted outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-[var(--ease-apple)]",
                isOpen && "rotate-180"
              )}
              strokeWidth={1.8}
            />
          </button>
        ) : null}
      </div>

      <ul
        id={listId}
        className={cn(
          "mt-4 max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto pr-2",
          collapsible && !isOpen && "hidden"
        )}
      >
        {headings.map((heading) => {
          const isActive = activeHeadingId === heading.id;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative block py-1.5 text-sm leading-5 outline-none transition-colors before:absolute before:-left-[1.32rem] before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:bg-transparent before:transition-colors",
                  heading.depth === 3 ? "pl-3" : "pl-0",
                  isActive
                    ? "font-medium text-foreground before:bg-primary"
                    : "text-muted hover:text-foreground focus-visible:text-foreground"
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
