"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APPLE_EASE,
  StaggeredItem,
  StaggeredList,
} from "@/components/ui/animations";
import type { ReadingBook, ReadingBookAnnotation } from "@/lib/books";
import type { AppLocale } from "@/lib/i18n/config";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type BooksDictionary = AppDictionary["public"]["books"];

const ANNOTATIONS_PER_PAGE = 1;
const ALL_CATEGORY_FILTER = "__all__";
const COLLAPSED_CATEGORY_LIMIT = 8;
const SHELF_BOOKS_PER_PAGE = 12;

type InteractiveBookshelfProps = {
  currentBooks: ReadingBook[];
  books: ReadingBook[];
  locale: AppLocale;
  dateLocale: string;
  dictionary: BooksDictionary;
};

type CategoryFilterOption = {
  name: string;
  count: number;
};

const statusClassNames = {
  reading:
    "border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15",
  finished:
    "border-success/25 bg-success/10 text-emerald-700 dark:border-success/35 dark:bg-success/15 dark:text-emerald-300",
  queued:
    "border-warning/25 bg-warning/10 text-amber-700 dark:border-warning/35 dark:bg-warning/15 dark:text-amber-300",
} as const;

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, progress));
}

function formatFinishedDate(dateString: string, locale: string) {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
  });
}

function formatDetailDate(dateString: string, locale: string) {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(
  seconds: number | undefined,
  locale: AppLocale,
  dictionary: BooksDictionary
) {
  if (!seconds || seconds <= 0) {
    return dictionary.detailFallbackLabel;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  if (locale === "zh-CN") {
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function getStatusLabel(book: ReadingBook, dictionary: BooksDictionary) {
  return dictionary.status[book.status];
}

function getCategoryFilterOptions(
  books: ReadingBook[],
  locale: AppLocale
): CategoryFilterOption[] {
  const counts = new Map<string, number>();

  for (const book of books) {
    const category = book.category[locale].trim();
    if (!category) {
      continue;
    }

    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name, locale);
    });
}

function getPagesLabel(book: ReadingBook, dictionary: BooksDictionary) {
  if (book.wordCount && book.wordCount > 0) {
    return interpolateTemplate(dictionary.wordsTemplate, {
      words: new Intl.NumberFormat().format(book.wordCount),
    });
  }

  if (book.pages <= 0) {
    return "";
  }

  return interpolateTemplate(dictionary.pagesTemplate, {
    pages: book.pages,
  });
}

function BookCover({
  book,
  compact = false,
  large = false,
  className,
}: {
  book: ReadingBook;
  compact?: boolean;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-white/40 bg-secondary shadow-md",
        large ? "aspect-[2/3] w-full" : compact ? "aspect-[2/3] w-24" : "aspect-[2/3] w-32 sm:w-36",
        className
      )}
      aria-hidden="true"
      data-book-cover
    >
      {book.coverUrl ? (
        <>
          <Image
            src={book.coverUrl}
            alt=""
            fill
            unoptimized
            sizes={large ? "280px" : compact ? "96px" : "144px"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),transparent_42%,rgba(0,0,0,0.08)_100%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: book.cover.background }} />
          <div
            className="absolute inset-y-0 left-0 w-[13%] shadow-[inset_-8px_0_16px_rgba(0,0,0,0.18)]"
            style={{ backgroundColor: book.cover.spine }}
          />
          <div
            className="absolute left-[19%] top-5 h-px w-12 opacity-30"
            style={{ backgroundColor: book.cover.foreground }}
          />
          <div
            className={cn(
              "absolute inset-x-[18%] top-10 space-y-2 overflow-hidden",
              compact ? "bottom-10" : "bottom-14"
            )}
            style={{ color: book.cover.foreground }}
          >
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] opacity-70">
              {book.cover.label}
            </p>
            <p
              className={cn(
                "overflow-hidden font-semibold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical]",
                compact
                  ? "text-xs [-webkit-line-clamp:4]"
                  : "text-sm [-webkit-line-clamp:5]"
              )}
            >
              {book.title}
            </p>
          </div>
          <div
            className="absolute bottom-4 left-[18%] right-4 truncate text-[0.62rem] font-medium uppercase tracking-[0.16em] opacity-70"
            style={{ color: book.cover.foreground }}
          >
            {book.author}
          </div>
          <div className="absolute -right-8 top-10 h-28 w-28 rounded-full bg-white/18 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.28),transparent_34%,rgba(0,0,0,0.08)_100%)]" />
        </>
      )}
    </div>
  );
}

function StatusBadge({
  book,
  dictionary,
}: {
  book: ReadingBook;
  dictionary: BooksDictionary;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClassNames[book.status]
      )}
    >
      {getStatusLabel(book, dictionary)}
    </span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        whileInView={{ width: `${clampProgress(progress)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: [...APPLE_EASE] }}
      />
    </div>
  );
}

function CurrentBookCard({
  book,
  locale,
  dictionary,
  onSelect,
}: {
  book: ReadingBook;
  locale: AppLocale;
  dictionary: BooksDictionary;
  onSelect: (book: ReadingBook) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const progressText = interpolateTemplate(dictionary.progressTemplate, {
    progress: book.progress,
  });
  const measureLabel = getPagesLabel(book, dictionary);

  return (
    <motion.button
      type="button"
      data-book-card
      data-book-id={book.id}
      aria-label={interpolateTemplate(dictionary.openBookTemplate, {
        title: book.title,
      })}
      onClick={() => onSelect(book)}
      className="group relative grid h-full w-full transform-gpu gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 text-left shadow-sm outline-none will-change-transform transition-colors hover:border-primary/35 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-2 motion-safe:hover:scale-[1.012] sm:grid-cols-[9rem_minmax(0,1fr)]"
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.45, ease: [...APPLE_EASE] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(80,120,255,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.22),transparent_45%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(120,160,255,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_45%)]" />

      <motion.div
        className="relative mx-auto transform-gpu will-change-transform motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:-rotate-1 sm:mx-0"
        transition={{ duration: 0.45, ease: [...APPLE_EASE] }}
      >
        <BookCover book={book} />
      </motion.div>

      <div className="relative min-w-0 space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge book={book} dictionary={dictionary} />
            <span className="text-xs text-muted">
              {[book.category[locale], measureLabel].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {book.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{book.author}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span>{progressText}</span>
            <span>{book.year}</span>
          </div>
          <ProgressBar progress={book.progress} />
        </div>

        <p className="text-sm leading-relaxed text-muted sm:text-base">
          {book.note[locale]}
        </p>

        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            {dictionary.takeawayLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {book.takeaway[locale]}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function ShelfBookCard({
  book,
  locale,
  dateLocale,
  dictionary,
  onSelect,
}: {
  book: ReadingBook;
  locale: AppLocale;
  dateLocale: string;
  dictionary: BooksDictionary;
  onSelect: (book: ReadingBook) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const measureLabel = getPagesLabel(book, dictionary);

  return (
    <motion.button
      type="button"
      data-book-card
      data-book-id={book.id}
      aria-label={interpolateTemplate(dictionary.openBookTemplate, {
        title: book.title,
      })}
      onClick={() => onSelect(book)}
      className="group relative grid h-full w-full transform-gpu grid-cols-[6rem_minmax(0,1fr)] gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 text-left shadow-sm outline-none will-change-transform transition-colors hover:border-primary/35 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-[7px] motion-safe:hover:scale-[1.01]"
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.42, ease: [...APPLE_EASE] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_20%_10%,rgba(80,120,255,0.1),transparent_36%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_42%),radial-gradient(circle_at_20%_10%,rgba(120,160,255,0.12),transparent_36%)]" />

      <motion.div
        className="relative transform-gpu will-change-transform motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:-rotate-2"
        transition={{ duration: 0.42, ease: [...APPLE_EASE] }}
      >
        <BookCover book={book} compact />
      </motion.div>

      <div className="relative min-w-0 space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge book={book} dictionary={dictionary} />
            {book.rating ? (
              <span className="text-xs text-muted">
                {interpolateTemplate(dictionary.ratingTemplate, {
                  rating: book.rating,
                })}
              </span>
            ) : null}
          </div>
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {book.title}
          </h3>
          <p className="text-xs text-muted">{book.author}</p>
        </div>

        <p className="text-sm leading-relaxed text-muted">{book.takeaway[locale]}</p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{book.category[locale]}</span>
          {measureLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{measureLabel}</span>
            </>
          ) : null}
          {book.finishedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatFinishedDate(book.finishedAt, dateLocale)}</span>
            </>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function getAnnotationText(
  annotation: ReadingBookAnnotation,
  locale: AppLocale
) {
  const content = annotation.content[locale].trim();
  const thought = annotation.thought?.[locale]?.trim() ?? "";

  if (annotation.type === "review" && !thought) {
    return {
      highlight: "",
      thought: content,
    };
  }

  return {
    highlight: content,
    thought,
  };
}

function getDisplayAnnotations(
  book: ReadingBook,
  locale: AppLocale
): ReadingBookAnnotation[] {
  if (book.annotations?.length) {
    return book.annotations;
  }

  const quote = book.quote[locale].trim();
  if (!quote) {
    return [];
  }

  return [
    {
      id: `${book.id}:fallback-quote`,
      type: "highlight",
      content: book.quote,
      thought: book.takeaway,
    },
  ];
}

function AnnotationCard({
  annotation,
  locale,
  dictionary,
}: {
  annotation: ReadingBookAnnotation;
  locale: AppLocale;
  dictionary: BooksDictionary;
}) {
  const { highlight, thought } = getAnnotationText(annotation, locale);
  const typeLabel =
    annotation.type === "review" ? dictionary.reviewLabel : dictionary.highlightLabel;

  return (
    <article
      className="rounded-2xl border border-border/70 bg-background/70 p-4"
      data-annotation-card
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {typeLabel}
        </span>
        {annotation.chapterTitle ? (
          <span className="text-xs text-muted">{annotation.chapterTitle}</span>
        ) : null}
        {annotation.createdAt ? (
          <span className="text-xs text-muted">
            {formatFinishedDate(annotation.createdAt, locale)}
          </span>
        ) : null}
      </div>

      {highlight ? (
        <blockquote className="mt-3 break-words text-base leading-relaxed text-foreground">
          &ldquo;{highlight}&rdquo;
        </blockquote>
      ) : null}

      {thought ? (
        <div className="mt-3 rounded-xl border border-border/60 bg-card/70 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            {dictionary.thoughtLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {thought}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function BookDetailsDialog({
  book,
  locale,
  dateLocale,
  dictionary,
  onClose,
}: {
  book: ReadingBook | null;
  locale: AppLocale;
  dateLocale: string;
  dictionary: BooksDictionary;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [annotationPage, setAnnotationPage] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!book) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          !element.hasAttribute("disabled")
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (activeElement === lastElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      window.requestAnimationFrame(() => {
        if (previouslyFocusedElement?.isConnected) {
          previouslyFocusedElement.focus();
        }
      });
    };
  }, [book, onClose]);

  useEffect(() => {
    setAnnotationPage(0);
  }, [book?.id]);

  const detailDates = useMemo(() => {
    if (!book) {
      return [];
    }

    return [
      book.readUpdatedAt
        ? interpolateTemplate(dictionary.updatedAtTemplate, {
            date: formatDetailDate(book.readUpdatedAt, dateLocale),
          })
        : "",
      book.syncedAt
        ? interpolateTemplate(dictionary.syncedAtTemplate, {
            date: formatDetailDate(book.syncedAt, dateLocale),
          })
        : "",
      book.finishedAt
        ? interpolateTemplate(dictionary.finishedTemplate, {
            date: formatFinishedDate(book.finishedAt, dateLocale),
          })
        : "",
    ].filter(Boolean);
  }, [book, dateLocale, dictionary]);

  if (!book) {
    return <AnimatePresence />;
  }

  const progressText = interpolateTemplate(dictionary.progressTemplate, {
    progress: book.progress,
  });
  const notesCount = book.noteCount ?? 0;
  const notesText = interpolateTemplate(dictionary.notesCountTemplate, {
    count: notesCount,
  });
  const readingTime = formatDuration(book.readingSeconds, locale, dictionary);
  const measureLabel = getPagesLabel(book, dictionary);
  const annotations = getDisplayAnnotations(book, locale);
  const totalAnnotationPages = Math.max(
    1,
    Math.ceil(annotations.length / ANNOTATIONS_PER_PAGE)
  );
  const safeAnnotationPage = Math.min(annotationPage, totalAnnotationPages - 1);
  const visibleAnnotations = annotations.slice(
    safeAnnotationPage * ANNOTATIONS_PER_PAGE,
    safeAnnotationPage * ANNOTATIONS_PER_PAGE + ANNOTATIONS_PER_PAGE
  );
  const annotationPageText = interpolateTemplate(
    dictionary.annotationPageTemplate,
    {
      current: safeAnnotationPage + 1,
      total: totalAnnotationPages,
    }
  );

  return (
    <AnimatePresence>
      <motion.div
        key={book.id}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4"
        data-book-dialog
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [...APPLE_EASE] }}
      >
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`book-dialog-title-${book.id}`}
          ref={dialogRef}
          tabIndex={-1}
          className="relative grid h-[min(820px,calc(100vh-4rem))] w-[min(1120px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl md:grid-cols-[minmax(290px,0.9fr)_minmax(0,1.12fr)]"
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 0, y: 24, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 18, scale: 0.97 }
          }
          transition={{ duration: 0.5, ease: [...APPLE_EASE] }}
        >
          <button
            type="button"
            ref={closeButtonRef}
            aria-label={dictionary.closeDetailsLabel}
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/85 text-sm font-semibold text-muted shadow-sm backdrop-blur transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span aria-hidden="true">x</span>
          </button>

          <div className="relative isolate min-h-0 overflow-y-auto bg-secondary/30 px-6 py-7 md:px-8 md:py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(80,120,255,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.34),transparent_48%)] dark:bg-[radial-gradient(circle_at_50%_18%,rgba(120,160,255,0.18),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_48%)]" />
            <div className="relative mx-auto flex max-w-[430px] flex-col items-center gap-5">
              <motion.div
                className="w-[min(230px,68vw,52vh)]"
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 18, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [...APPLE_EASE] }}
              >
                <BookCover
                  book={book}
                  large
                  className="rounded-2xl shadow-[0_26px_60px_rgba(15,23,42,0.22)]"
                />
              </motion.div>

              <div className="w-full rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge book={book} dictionary={dictionary} />
                  <span className="text-xs text-muted">{book.category[locale]}</span>
                  {measureLabel ? (
                    <>
                      <span className="text-xs text-muted" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-muted">{measureLabel}</span>
                    </>
                  ) : null}
                </div>
                <h2
                  id={`book-dialog-title-${book.id}`}
                  className="mt-3 text-2xl font-semibold tracking-tight text-foreground"
                >
                  {book.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{book.author}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary/80">
                  {dictionary.detailsHeading}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DetailMetric label={dictionary.status[book.status]} value={progressText} />
                  <DetailMetric label={dictionary.readingTimeLabel} value={readingTime} />
                  <DetailMetric label={dictionary.notesCountLabel} value={notesText} />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted">
                    <span>{progressText}</span>
                    <span>{book.year}</span>
                  </div>
                  <ProgressBar progress={book.progress} />
                </div>
              </div>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  {dictionary.takeawayLabel}
                </p>
                <p className="mt-3 text-base leading-relaxed text-foreground">
                  {book.takeaway[locale]}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {book.note[locale]}
                </p>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                      {dictionary.highlightHeading}
                    </p>
                    {annotations.length > 0 ? (
                      <span className="text-xs text-muted tabular-nums">
                        {annotationPageText}
                      </span>
                    ) : null}
                  </div>

                  {annotations.length > 0 ? (
                    <div
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 p-1 shadow-sm"
                      data-notes-pagination
                    >
                      <button
                        type="button"
                        data-notes-page-previous
                        onClick={() =>
                          setAnnotationPage((page) => Math.max(0, page - 1))
                        }
                        disabled={safeAnnotationPage === 0}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-background/80 hover:text-primary disabled:cursor-not-allowed disabled:text-muted/55 disabled:hover:bg-transparent"
                      >
                        {dictionary.previousNotesPageLabel}
                      </button>
                      <button
                        type="button"
                        data-notes-page-next
                        onClick={() =>
                          setAnnotationPage((page) =>
                            Math.min(totalAnnotationPages - 1, page + 1)
                          )
                        }
                        disabled={safeAnnotationPage >= totalAnnotationPages - 1}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:bg-transparent disabled:text-muted/55 disabled:shadow-none disabled:hover:bg-transparent"
                      >
                        {dictionary.nextNotesPageLabel}
                      </button>
                    </div>
                  ) : null}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${book.id}-${safeAnnotationPage}`}
                    className="mt-4 space-y-3"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, x: 16 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }
                    }
                    transition={{ duration: 0.28, ease: [...APPLE_EASE] }}
                  >
                    {visibleAnnotations.length > 0 ? (
                      visibleAnnotations.map((annotation) => (
                        <AnnotationCard
                          key={annotation.id}
                          annotation={annotation}
                          locale={locale}
                          dictionary={dictionary}
                        />
                      ))
                    ) : (
                      <p className="text-sm leading-relaxed text-muted">
                        {dictionary.noHighlightLabel}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>

              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-muted">
                  {detailDates.map((date) => (
                    <p key={date}>{date}</p>
                  ))}
                </div>
                {book.deepLink ? (
                  <a
                    href={book.deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {dictionary.openInWereadLabel}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function InteractiveBookshelf({
  currentBooks,
  books,
  locale,
  dateLocale,
  dictionary,
}: InteractiveBookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<ReadingBook | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_FILTER);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [shelfPage, setShelfPage] = useState(0);
  const closeSelectedBook = useCallback(() => {
    setSelectedBook(null);
  }, []);
  const categoryOptions = useMemo(
    () => getCategoryFilterOptions(books, locale),
    [books, locale]
  );
  const visibleCategoryOptions = useMemo(() => {
    if (categoryExpanded || categoryOptions.length <= COLLAPSED_CATEGORY_LIMIT) {
      return categoryOptions;
    }

    const collapsedOptions = categoryOptions.slice(0, COLLAPSED_CATEGORY_LIMIT);
    const selectedOption = categoryOptions.find(
      (category) => category.name === selectedCategory
    );
    if (
      selectedOption &&
      !collapsedOptions.some((category) => category.name === selectedOption.name)
    ) {
      return [...collapsedOptions, selectedOption];
    }

    return collapsedOptions;
  }, [categoryExpanded, categoryOptions, selectedCategory]);
  const filteredShelfBooks = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_FILTER) {
      return books;
    }

    return books.filter((book) => book.category[locale].trim() === selectedCategory);
  }, [books, locale, selectedCategory]);
  const totalShelfPages = Math.max(
    1,
    Math.ceil(filteredShelfBooks.length / SHELF_BOOKS_PER_PAGE)
  );
  const safeShelfPage = Math.min(shelfPage, totalShelfPages - 1);
  const paginatedShelfBooks = filteredShelfBooks.slice(
    safeShelfPage * SHELF_BOOKS_PER_PAGE,
    safeShelfPage * SHELF_BOOKS_PER_PAGE + SHELF_BOOKS_PER_PAGE
  );
  const shelfSummary = interpolateTemplate(dictionary.categoryFilterSummaryTemplate, {
    visible: paginatedShelfBooks.length,
    total: filteredShelfBooks.length,
  });
  const shelfPageText = interpolateTemplate(dictionary.annotationPageTemplate, {
    current: safeShelfPage + 1,
    total: totalShelfPages,
  });
  const hiddenCategoryCount = Math.max(
    0,
    categoryOptions.length - COLLAPSED_CATEGORY_LIMIT
  );
  const shouldShowCategoryToggle =
    categoryOptions.length > COLLAPSED_CATEGORY_LIMIT;

  function selectCategory(category: string) {
    setSelectedCategory(category);
    setShelfPage(0);
  }

  useEffect(() => {
    if (
      selectedCategory !== ALL_CATEGORY_FILTER &&
      !categoryOptions.some((category) => category.name === selectedCategory)
    ) {
      setSelectedCategory(ALL_CATEGORY_FILTER);
      setShelfPage(0);
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    if (shelfPage > totalShelfPages - 1) {
      setShelfPage(Math.max(0, totalShelfPages - 1));
    }
  }, [shelfPage, totalShelfPages]);

  return (
    <>
      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {dictionary.sections.currentHeading}
          </h2>
          <p className="text-sm text-muted">
            {dictionary.sections.currentDescription}
          </p>
        </div>

        <StaggeredList className="grid gap-5 lg:grid-cols-2">
          {currentBooks.map((book) => (
            <StaggeredItem key={book.id}>
              <CurrentBookCard
                book={book}
                locale={locale}
                dictionary={dictionary}
                onSelect={setSelectedBook}
              />
            </StaggeredItem>
          ))}
        </StaggeredList>
      </section>

      <section className="space-y-5" data-shelf-section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {dictionary.sections.shelfHeading}
            </h2>
            <p className="text-sm text-muted">
              {dictionary.sections.shelfDescription}
            </p>
          </div>
          <p
            className="text-sm font-medium tabular-nums text-muted"
            data-shelf-result-summary
          >
            {shelfSummary}
          </p>
        </div>

        <div
          className="rounded-2xl border border-border/70 bg-secondary/25 p-3"
          data-shelf-category-filter
          data-expanded={categoryExpanded}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
              {dictionary.categoryFilterHeading}
            </p>
            {shouldShowCategoryToggle ? (
              <button
                type="button"
                data-shelf-category-toggle
                onClick={() => setCategoryExpanded((expanded) => !expanded)}
                className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {categoryExpanded
                  ? dictionary.categoryFilterCollapseLabel
                  : interpolateTemplate(dictionary.categoryFilterExpandTemplate, {
                      count: hiddenCategoryCount,
                    })}
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            <button
              type="button"
              data-shelf-category-option
              data-active={selectedCategory === ALL_CATEGORY_FILTER}
              onClick={() => selectCategory(ALL_CATEGORY_FILTER)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selectedCategory === ALL_CATEGORY_FILTER
                  ? "border-primary/35 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-card/80 text-muted hover:border-primary/35 hover:text-foreground"
              )}
            >
              <span>{dictionary.categoryFilterAllLabel}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.68rem] tabular-nums",
                  selectedCategory === ALL_CATEGORY_FILTER
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-secondary text-muted"
                )}
              >
                {books.length}
              </span>
            </button>

            {visibleCategoryOptions.map((category) => {
              const isActive = selectedCategory === category.name;

              return (
                <button
                  type="button"
                  key={category.name}
                  data-shelf-category-option
                  data-category={category.name}
                  data-active={isActive}
                  onClick={() => selectCategory(category.name)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive
                      ? "border-primary/35 bg-primary text-primary-foreground shadow-sm"
                      : "border-border/70 bg-card/80 text-muted hover:border-primary/35 hover:text-foreground"
                  )}
                >
                  <span>{category.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.68rem] tabular-nums",
                      isActive
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-secondary text-muted"
                    )}
                  >
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {paginatedShelfBooks.length > 0 ? (
          <div className="space-y-5" data-shelf-grid>
            <StaggeredList
              key={`${selectedCategory}-${safeShelfPage}`}
              className="grid gap-5 lg:grid-cols-2"
            >
              {paginatedShelfBooks.map((book) => (
                <StaggeredItem key={book.id}>
                  <ShelfBookCard
                    book={book}
                    locale={locale}
                    dateLocale={dateLocale}
                    dictionary={dictionary}
                    onSelect={setSelectedBook}
                  />
                </StaggeredItem>
              ))}
            </StaggeredList>

            {totalShelfPages > 1 ? (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3"
                data-shelf-pagination
              >
                <span className="text-sm font-medium tabular-nums text-muted">
                  {shelfPageText}
                </span>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    data-shelf-page-previous
                    onClick={() => setShelfPage((page) => Math.max(0, page - 1))}
                    disabled={safeShelfPage === 0}
                    className="rounded-full border border-border/70 px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {dictionary.previousNotesPageLabel}
                  </button>
                  <button
                    type="button"
                    data-shelf-page-next
                    onClick={() =>
                      setShelfPage((page) =>
                        Math.min(totalShelfPages - 1, page + 1)
                      )
                    }
                    disabled={safeShelfPage >= totalShelfPages - 1}
                    className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted disabled:shadow-none"
                  >
                    {dictionary.nextNotesPageLabel}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className="rounded-2xl border border-border/70 bg-card/70 p-8 text-center text-sm text-muted"
            data-shelf-empty
          >
            {dictionary.categoryFilterEmptyLabel}
          </div>
        )}
      </section>

      <BookDetailsDialog
        book={selectedBook}
        locale={locale}
        dateLocale={dateLocale}
        dictionary={dictionary}
        onClose={closeSelectedBook}
      />
    </>
  );
}
