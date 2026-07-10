"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Highlighter,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APPLE_EASE, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import type { ReadingBook, ReadingBookAnnotation, ReadingStatus } from "@/lib/books";
import type { AppLocale } from "@/lib/i18n/config";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type BooksDictionary = AppDictionary["public"]["books"];

const ANNOTATIONS_PER_PAGE = 1;
const ALL_CATEGORY_FILTER = "__all__";
const ALL_STATUS_FILTER = "__all_status__";
const COLLAPSED_CATEGORY_LIMIT = 6;
const SHELF_BOOKS_PER_PAGE = 12;

type SortKey = "recent" | "title" | "rating" | "progress";
type StatusFilter = ReadingStatus | typeof ALL_STATUS_FILTER;

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
  reading: "border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15",
  finished:
    "border-success/25 bg-success/10 text-emerald-700 dark:border-success/35 dark:bg-success/15 dark:text-emerald-300",
  queued:
    "border-warning/25 bg-warning/10 text-amber-700 dark:border-warning/35 dark:bg-warning/15 dark:text-amber-300",
} as const;

function interpolateTemplate(template: string, values: Record<string, string | number>) {
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

function getCategoryFilterOptions(books: ReadingBook[], locale: AppLocale): CategoryFilterOption[] {
  const counts = new Map<string, number>();

  for (const book of books) {
    const category = book.category[locale].trim();
    if (category) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
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

  return interpolateTemplate(dictionary.pagesTemplate, { pages: book.pages });
}

function getBookTimestamp(book: ReadingBook) {
  const date = book.readUpdatedAt ?? book.finishedAt ?? book.syncedAt;
  if (!date) {
    return 0;
  }
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortBooks(books: ReadingBook[], sortKey: SortKey, locale: AppLocale) {
  return [...books].sort((left, right) => {
    if (sortKey === "title") {
      return left.title.localeCompare(right.title, locale);
    }
    if (sortKey === "rating") {
      return (right.rating ?? -1) - (left.rating ?? -1);
    }
    if (sortKey === "progress") {
      return right.progress - left.progress;
    }
    return getBookTimestamp(right) - getBookTimestamp(left);
  });
}

function getPaginationItems(page: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const pages = new Set([0, total - 1, page - 1, page, page + 1]);
  const ordered = Array.from(pages)
    .filter((item) => item >= 0 && item < total)
    .sort((left, right) => left - right);
  const result: Array<number | string> = [];

  ordered.forEach((item, index) => {
    const previous = ordered[index - 1];
    if (index > 0 && item - previous > 1) {
      result.push(`ellipsis-${previous}`);
    }
    result.push(item);
  });

  return result;
}

function BookCover({
  book,
  priority = false,
  className,
}: {
  book: ReadingBook;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-secondary relative isolate aspect-[2/3] w-full overflow-hidden rounded-lg border shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)]",
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
            priority={priority}
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 240px"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_38%,rgba(0,0,0,0.08)_100%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: book.cover.background }} />
          <div
            className="absolute top-6 left-[14%] h-px w-14 opacity-35"
            style={{ backgroundColor: book.cover.foreground }}
          />
          <div
            className="absolute inset-x-[14%] top-12 bottom-16 space-y-3 overflow-hidden"
            style={{ color: book.cover.foreground }}
          >
            <p className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase opacity-65">
              {book.cover.label}
            </p>
            <p className="[display:-webkit-box] overflow-hidden text-base leading-tight font-semibold [-webkit-box-orient:vertical] [-webkit-line-clamp:6]">
              {book.title}
            </p>
          </div>
          <div
            className="absolute right-4 bottom-5 left-[14%] truncate text-[0.62rem] font-medium tracking-[0.14em] uppercase opacity-65"
            style={{ color: book.cover.foreground }}
          >
            {book.author}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.2),transparent_42%,rgba(0,0,0,0.06)_100%)]" />
        </>
      )}
    </div>
  );
}

function StatusBadge({ book, dictionary }: { book: ReadingBook; dictionary: BooksDictionary }) {
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

function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("bg-secondary h-1 overflow-hidden rounded-full", className)}>
      <motion.div
        className="bg-primary h-full rounded-full"
        initial={{ width: 0 }}
        whileInView={{ width: `${clampProgress(progress)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [...APPLE_EASE] }}
      />
    </div>
  );
}

function ReadingMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-muted flex items-center gap-2 text-xs font-medium">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="text-foreground mt-1.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function CurrentReadingStage({
  books,
  locale,
  dictionary,
  onSelect,
}: {
  books: ReadingBook[];
  locale: AppLocale;
  dictionary: BooksDictionary;
  onSelect: (book: ReadingBook) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  if (books.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeIndex, books.length - 1);
  const book = books[safeIndex];
  const stackedBooks = Array.from(
    new Map(
      [books[(safeIndex + 2) % books.length], books[(safeIndex + 1) % books.length]]
        .filter((item) => item && item.id !== book.id)
        .map((item) => [item.id, item])
    ).values()
  );
  const progressText = interpolateTemplate(dictionary.progressTemplate, {
    progress: book.progress,
  });
  const notesText = interpolateTemplate(dictionary.notesCountTemplate, {
    count: book.noteCount ?? 0,
  });

  const move = (direction: number) => {
    setActiveIndex((index) => (index + direction + books.length) % books.length);
  };

  return (
    <section className="space-y-5" aria-labelledby="current-reading-heading">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-primary/80 text-xs font-semibold tracking-[0.16em] uppercase">
            {dictionary.currentStageLabel}
          </p>
          <h2
            id="current-reading-heading"
            className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {dictionary.sections.currentHeading}
          </h2>
        </div>
        {books.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={dictionary.previousCurrentBookLabel}
              title={dictionary.previousCurrentBookLabel}
              className="border-border/70 text-muted hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/40 grid h-10 w-10 place-items-center rounded-full border transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <span className="text-muted min-w-12 text-center font-mono text-xs tabular-nums">
              {safeIndex + 1} / {books.length}
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={dictionary.nextCurrentBookLabel}
              title={dictionary.nextCurrentBookLabel}
              className="border-border/70 text-muted hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/40 grid h-10 w-10 place-items-center rounded-full border transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="border-border/70 grid overflow-hidden border-y lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`copy-${book.id}`}
            className="flex min-h-[430px] flex-col justify-center py-8 pr-0 lg:py-12 lg:pr-12"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.42, ease: [...APPLE_EASE] }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge book={book} dictionary={dictionary} />
              <span className="text-muted text-sm">{book.category[locale]}</span>
            </div>
            <h3 className="text-foreground mt-5 max-w-2xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              {book.title}
            </h3>
            <p className="text-muted mt-2 text-base">{book.author}</p>

            <blockquote className="border-primary/35 text-foreground mt-7 max-w-2xl border-l-2 pl-5 text-base leading-relaxed sm:text-lg">
              {book.takeaway[locale]}
            </blockquote>

            <div className="border-border/60 mt-8 grid grid-cols-3 gap-4 border-y py-4">
              <ReadingMetric
                icon={BookOpen}
                label={dictionary.status[book.status]}
                value={progressText}
              />
              <ReadingMetric
                icon={Clock3}
                label={dictionary.readingTimeLabel}
                value={formatDuration(book.readingSeconds, locale, dictionary)}
              />
              <ReadingMetric
                icon={Highlighter}
                label={dictionary.notesCountLabel}
                value={notesText}
              />
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-muted flex items-center justify-between text-xs">
                <span>{progressText}</span>
                <span>{book.year}</span>
              </div>
              <ProgressBar progress={book.progress} />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSelect(book)}
                className="bg-foreground text-background focus-visible:ring-primary/40 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-88 focus-visible:ring-2 focus-visible:outline-none"
              >
                <BookOpen className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                {dictionary.viewReadingFileLabel}
              </button>
              {book.deepLink ? (
                <a
                  href={book.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border/80 text-muted hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/40 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none"
                >
                  {dictionary.openInWereadLabel}
                  <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="border-border/70 bg-secondary/35 relative flex min-h-[430px] items-center justify-center border-t px-5 py-8 lg:border-t-0 lg:border-l lg:px-8">
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            {stackedBooks.map((item, index) => (
              <motion.div
                key={`stack-${item.id}`}
                className={cn(
                  "absolute w-[min(190px,46vw)]",
                  index === 0
                    ? "translate-x-20 -rotate-3 opacity-20"
                    : "translate-x-12 rotate-3 opacity-35"
                )}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: index === 0 ? 0.2 : 0.35 }}
                transition={{ duration: 0.5, ease: [...APPLE_EASE] }}
              >
                <BookCover book={item} />
              </motion.div>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              key={`cover-${book.id}`}
              type="button"
              onClick={() => onSelect(book)}
              aria-label={interpolateTemplate(dictionary.openBookTemplate, {
                title: book.title,
              })}
              className="focus-visible:ring-primary/40 relative z-10 w-[min(230px,58vw)] outline-none focus-visible:ring-2"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.98 }}
              whileHover={prefersReducedMotion ? undefined : { y: -8, rotate: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.48, ease: [...APPLE_EASE] }}
            >
              <BookCover
                book={book}
                priority
                className="shadow-[0_32px_70px_-24px_rgba(15,23,42,0.48)]"
              />
            </motion.button>
          </AnimatePresence>

          {books.length > 1 ? (
            <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center gap-2">
              {books.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  aria-label={interpolateTemplate(dictionary.openBookTemplate, {
                    title: item.title,
                  })}
                  aria-pressed={index === safeIndex}
                  className={cn(
                    "h-1 rounded-full transition-[width,background-color] duration-300",
                    index === safeIndex ? "bg-primary w-8" : "bg-muted/30 hover:bg-muted/55 w-3"
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ShelfBookCard({
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

  return (
    <motion.button
      type="button"
      data-book-card
      data-book-id={book.id}
      aria-label={interpolateTemplate(dictionary.openBookTemplate, { title: book.title })}
      onClick={() => onSelect(book)}
      className="group focus-visible:ring-primary/40 block h-full w-full min-w-0 text-left outline-none focus-visible:ring-2"
      whileHover={prefersReducedMotion ? undefined : { y: -8 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.42, ease: [...APPLE_EASE] }}
    >
      <div className="relative">
        <BookCover book={book} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <StatusBadge book={book} dictionary={dictionary} />
          <span className="bg-background/88 text-foreground grid h-8 w-8 translate-y-1 place-items-center rounded-full border border-white/55 opacity-0 shadow-sm backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>
        <div className="bg-background/90 absolute inset-x-0 bottom-0 px-3 py-2.5 backdrop-blur-md">
          <div className="text-muted flex items-center justify-between gap-3 text-[0.68rem] font-medium">
            <span>{progressText}</span>
            {book.rating ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3 w-3 fill-current" strokeWidth={1.5} aria-hidden="true" />
                {book.rating}
              </span>
            ) : null}
          </div>
          <ProgressBar progress={book.progress} className="bg-border/60 mt-2" />
        </div>
      </div>

      <div className="pt-3">
        <h3 className="text-foreground [display:-webkit-box] min-h-11 overflow-hidden text-[0.95rem] leading-snug font-semibold [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {book.title}
        </h3>
        <p className="text-muted mt-1 truncate text-xs">{book.author}</p>
        <div className="text-muted mt-2 flex items-center justify-between gap-2 text-[0.7rem]">
          <span className="truncate">{book.category[locale]}</span>
          {(book.noteCount ?? 0) > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
              <Highlighter className="h-3 w-3" strokeWidth={1.7} aria-hidden="true" />
              {book.noteCount}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

function getAnnotationText(annotation: ReadingBookAnnotation, locale: AppLocale) {
  const content = annotation.content[locale].trim();
  const thought = annotation.thought?.[locale]?.trim() ?? "";

  if (annotation.type === "review" && !thought) {
    return { highlight: "", thought: content };
  }

  return { highlight: content, thought };
}

function getDisplayAnnotations(book: ReadingBook, locale: AppLocale) {
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
      type: "highlight" as const,
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
    <article className="border-border/70 border-t pt-5" data-annotation-card>
      <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="text-primary font-semibold">{typeLabel}</span>
        {annotation.chapterTitle ? <span>{annotation.chapterTitle}</span> : null}
        {annotation.createdAt ? (
          <time dateTime={annotation.createdAt}>
            {formatFinishedDate(annotation.createdAt, locale)}
          </time>
        ) : null}
      </div>

      {highlight ? (
        <blockquote className="text-foreground mt-5 text-lg leading-[1.85] break-words sm:text-xl">
          “{highlight}”
        </blockquote>
      ) : null}

      {thought ? (
        <div className="border-primary/30 mt-6 border-l-2 pl-4">
          <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">
            {dictionary.thoughtLabel}
          </p>
          <p className="text-foreground mt-2 text-sm leading-relaxed">{thought}</p>
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
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

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
          element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("disabled")
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

  const annotations = useMemo(
    () => (book ? getDisplayAnnotations(book, locale) : []),
    [book, locale]
  );
  const totalAnnotationPages = Math.max(1, Math.ceil(annotations.length / ANNOTATIONS_PER_PAGE));
  const safeAnnotationPage = Math.min(annotationPage, totalAnnotationPages - 1);
  const visibleAnnotations = annotations.slice(
    safeAnnotationPage * ANNOTATIONS_PER_PAGE,
    safeAnnotationPage * ANNOTATIONS_PER_PAGE + ANNOTATIONS_PER_PAGE
  );

  return (
    <AnimatePresence>
      {book ? (
        <motion.div
          key={book.id}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          data-book-dialog
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [...APPLE_EASE] }}
        >
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="bg-background/72 absolute inset-0 cursor-default backdrop-blur-lg"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`book-dialog-title-${book.id}`}
            ref={dialogRef}
            tabIndex={-1}
            className="border-border/80 bg-background relative grid h-[calc(100vh-1rem)] w-[min(1180px,calc(100vw-1rem))] overflow-y-auto rounded-2xl border shadow-2xl md:h-[min(840px,calc(100vh-3rem))] md:grid-cols-[minmax(270px,0.78fr)_minmax(0,1.22fr)] md:overflow-hidden"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.44, ease: [...APPLE_EASE] }}
          >
            <button
              type="button"
              ref={closeButtonRef}
              aria-label={dictionary.closeDetailsLabel}
              title={dictionary.closeDetailsLabel}
              onClick={onClose}
              className="border-border/70 bg-background/88 text-muted hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/40 absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full border shadow-sm backdrop-blur transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>

            <aside className="border-border/70 bg-secondary/35 relative flex min-h-[540px] flex-col items-center justify-center overflow-hidden border-b px-6 py-16 md:min-h-0 md:border-r md:border-b-0 md:px-8">
              <motion.div
                className="w-[min(240px,60vw)]"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [...APPLE_EASE] }}
              >
                <BookCover
                  book={book}
                  priority
                  className="shadow-[0_30px_70px_-24px_rgba(15,23,42,0.48)]"
                />
              </motion.div>
              <div className="mt-7 w-full max-w-[360px] text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <StatusBadge book={book} dictionary={dictionary} />
                  <span className="text-muted text-xs">{book.category[locale]}</span>
                  {getPagesLabel(book, dictionary) ? (
                    <>
                      <span className="text-muted text-xs" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-muted text-xs">{getPagesLabel(book, dictionary)}</span>
                    </>
                  ) : null}
                </div>
                <h2
                  id={`book-dialog-title-${book.id}`}
                  className="text-foreground mt-4 text-2xl leading-tight font-semibold tracking-tight"
                >
                  {book.title}
                </h2>
                <p className="text-muted mt-2 text-sm">{book.author}</p>
              </div>
            </aside>

            <div className="min-h-0 px-6 py-8 md:overflow-y-auto md:px-10 md:py-10">
              <div className="mx-auto max-w-2xl space-y-8">
                <div>
                  <p className="text-primary/80 text-xs font-semibold tracking-[0.16em] uppercase">
                    {dictionary.detailsHeading}
                  </p>
                  <div className="border-border/70 mt-5 grid grid-cols-3 gap-4 border-y py-4">
                    <ReadingMetric
                      icon={BookOpen}
                      label={dictionary.status[book.status]}
                      value={interpolateTemplate(dictionary.progressTemplate, {
                        progress: book.progress,
                      })}
                    />
                    <ReadingMetric
                      icon={Clock3}
                      label={dictionary.readingTimeLabel}
                      value={formatDuration(book.readingSeconds, locale, dictionary)}
                    />
                    <ReadingMetric
                      icon={Highlighter}
                      label={dictionary.notesCountLabel}
                      value={interpolateTemplate(dictionary.notesCountTemplate, {
                        count: book.noteCount ?? 0,
                      })}
                    />
                  </div>
                  <ProgressBar progress={book.progress} className="mt-5" />
                </div>

                <section>
                  <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                    {dictionary.takeawayLabel}
                  </p>
                  <p className="text-foreground mt-3 text-lg leading-relaxed">
                    {book.takeaway[locale]}
                  </p>
                  <p className="text-muted mt-4 text-sm leading-relaxed">{book.note[locale]}</p>
                </section>

                <section>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                        {dictionary.highlightHeading}
                      </p>
                      {annotations.length > 0 ? (
                        <p className="text-muted mt-1 font-mono text-xs tabular-nums">
                          {interpolateTemplate(dictionary.annotationPageTemplate, {
                            current: safeAnnotationPage + 1,
                            total: totalAnnotationPages,
                          })}
                        </p>
                      ) : null}
                    </div>

                    {annotations.length > 0 ? (
                      <div className="flex items-center gap-2" data-notes-pagination>
                        <button
                          type="button"
                          data-notes-page-previous
                          onClick={() => setAnnotationPage((page) => Math.max(0, page - 1))}
                          disabled={safeAnnotationPage === 0}
                          aria-label={dictionary.previousNotesPageLabel}
                          title={dictionary.previousNotesPageLabel}
                          className="border-border/80 text-muted hover:border-primary/40 hover:text-foreground grid h-10 w-10 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
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
                          aria-label={dictionary.nextNotesPageLabel}
                          title={dictionary.nextNotesPageLabel}
                          className="bg-foreground text-background disabled:bg-secondary disabled:text-muted grid h-10 w-10 place-items-center rounded-full transition hover:opacity-85 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${book.id}-${safeAnnotationPage}`}
                      initial={prefersReducedMotion ? false : { opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
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
                        <p className="border-border/70 text-muted mt-5 border-t pt-5 text-sm leading-relaxed">
                          {dictionary.noHighlightLabel}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </section>

                <div className="border-border/70 flex flex-wrap items-end justify-between gap-5 border-t pt-5">
                  <div className="text-muted space-y-1 text-xs">
                    {[
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
                    ]
                      .filter(Boolean)
                      .map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                  </div>
                  {book.deepLink ? (
                    <a
                      href={book.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-foreground text-background focus-visible:ring-primary/40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:opacity-85 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {dictionary.openInWereadLabel}
                      <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
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
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(ALL_STATUS_FILTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [shelfPage, setShelfPage] = useState(0);

  const closeSelectedBook = useCallback(() => setSelectedBook(null), []);
  const categoryOptions = useMemo(() => getCategoryFilterOptions(books, locale), [books, locale]);
  const visibleCategoryOptions = useMemo(() => {
    if (categoryExpanded) {
      return categoryOptions;
    }

    const visible = categoryOptions.slice(0, COLLAPSED_CATEGORY_LIMIT);
    const selected = categoryOptions.find((item) => item.name === selectedCategory);
    if (selected && !visible.some((item) => item.name === selected.name)) {
      return [...visible.slice(0, COLLAPSED_CATEGORY_LIMIT - 1), selected];
    }
    return visible;
  }, [categoryExpanded, categoryOptions, selectedCategory]);

  const filteredShelfBooks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    const filtered = books.filter((book) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORY_FILTER || book.category[locale] === selectedCategory;
      const matchesStatus = selectedStatus === ALL_STATUS_FILTER || book.status === selectedStatus;
      const haystack = [book.title, book.author, book.category[locale], book.takeaway[locale]]
        .join(" ")
        .toLocaleLowerCase(locale);
      return matchesCategory && matchesStatus && (!query || haystack.includes(query));
    });

    return sortBooks(filtered, sortKey, locale);
  }, [books, locale, searchQuery, selectedCategory, selectedStatus, sortKey]);

  const totalShelfPages = Math.max(1, Math.ceil(filteredShelfBooks.length / SHELF_BOOKS_PER_PAGE));
  const safeShelfPage = Math.min(shelfPage, totalShelfPages - 1);
  const paginatedShelfBooks = filteredShelfBooks.slice(
    safeShelfPage * SHELF_BOOKS_PER_PAGE,
    safeShelfPage * SHELF_BOOKS_PER_PAGE + SHELF_BOOKS_PER_PAGE
  );
  const paginationItems = getPaginationItems(safeShelfPage, totalShelfPages);
  const hiddenCategoryCount = Math.max(0, categoryOptions.length - COLLAPSED_CATEGORY_LIMIT);
  const shouldShowCategoryToggle = categoryOptions.length > COLLAPSED_CATEGORY_LIMIT;
  const shelfSummary = interpolateTemplate(dictionary.categoryFilterSummaryTemplate, {
    visible: filteredShelfBooks.length,
    total: books.length,
  });

  const resetPage = () => setShelfPage(0);
  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    resetPage();
  };
  const selectStatus = (status: StatusFilter) => {
    setSelectedStatus(status);
    resetPage();
  };

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: ALL_STATUS_FILTER, label: dictionary.allStatusesLabel },
    { value: "reading", label: dictionary.status.reading },
    { value: "finished", label: dictionary.status.finished },
    { value: "queued", label: dictionary.status.queued },
  ];

  return (
    <div className="space-y-16 sm:space-y-20">
      <CurrentReadingStage
        books={currentBooks}
        locale={locale}
        dictionary={dictionary}
        onSelect={setSelectedBook}
      />

      <section className="space-y-6" data-shelf-section aria-labelledby="full-shelf-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-primary/80 text-xs font-semibold tracking-[0.16em] uppercase">
              {dictionary.libraryLabel}
            </p>
            <h2
              id="full-shelf-heading"
              className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {dictionary.sections.shelfHeading}
            </h2>
            <p className="text-muted max-w-2xl text-sm leading-relaxed">
              {dictionary.sections.shelfDescription}
            </p>
          </div>
          <p className="text-muted font-mono text-xs tabular-nums" data-shelf-result-summary>
            {shelfSummary}
          </p>
        </div>

        <div className="border-border/70 border-y py-4" data-shelf-controls>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
            <label className="relative block min-w-0">
              <span className="sr-only">{dictionary.searchBooksLabel}</span>
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetPage();
                }}
                placeholder={dictionary.searchBooksPlaceholder}
                className="border-border/80 bg-background text-foreground placeholder:text-muted/70 focus:border-primary/45 focus:ring-primary/15 h-11 w-full rounded-lg border pr-10 pl-10 text-sm transition outline-none focus:ring-2"
                data-shelf-search
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    resetPage();
                  }}
                  aria-label={dictionary.clearSearchLabel}
                  title={dictionary.clearSearchLabel}
                  className="text-muted hover:bg-secondary hover:text-foreground absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full transition"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div
              className="bg-secondary/70 flex min-w-0 gap-1 overflow-x-auto rounded-lg p-1"
              role="group"
              aria-label={dictionary.statusFilterLabel}
              data-shelf-status-filter
            >
              {statusOptions.map((option) => {
                const active = selectedStatus === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => selectStatus(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "focus-visible:ring-primary/35 h-9 shrink-0 rounded-md px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <label className="border-border/80 bg-background relative flex h-11 items-center rounded-lg border">
              <SlidersHorizontal
                className="text-muted pointer-events-none ml-3.5 h-4 w-4"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span className="sr-only">{dictionary.sortLabel}</span>
              <select
                value={sortKey}
                onChange={(event) => {
                  setSortKey(event.target.value as SortKey);
                  resetPage();
                }}
                className="text-foreground h-full min-w-36 appearance-none bg-transparent pr-9 pl-2 text-xs font-semibold outline-none"
                data-shelf-sort
              >
                <option value="recent">{dictionary.sortOptions.recent}</option>
                <option value="title">{dictionary.sortOptions.title}</option>
                <option value="rating">{dictionary.sortOptions.rating}</option>
                <option value="progress">{dictionary.sortOptions.progress}</option>
              </select>
              <ChevronDown
                className="text-muted pointer-events-none absolute right-3 h-4 w-4"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </label>
          </div>

          <div className="mt-3" data-shelf-category-filter data-expanded={categoryExpanded}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <span className="text-muted shrink-0 text-xs font-semibold">
                  {dictionary.categoryFilterHeading}
                </span>
                {!categoryExpanded && selectedCategory !== ALL_CATEGORY_FILTER ? (
                  <span className="bg-primary/10 text-primary truncate rounded-full px-2.5 py-1 text-xs font-medium">
                    {selectedCategory}
                  </span>
                ) : null}
              </div>
              {shouldShowCategoryToggle ? (
                <button
                  type="button"
                  data-shelf-category-toggle
                  onClick={() => setCategoryExpanded((expanded) => !expanded)}
                  className="text-muted hover:bg-secondary hover:text-foreground focus-visible:ring-primary/35 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none"
                >
                  {categoryExpanded
                    ? dictionary.categoryFilterCollapseLabel
                    : interpolateTemplate(dictionary.categoryFilterExpandTemplate, {
                        count: hiddenCategoryCount,
                      })}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-300",
                      categoryExpanded && "rotate-180"
                    )}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </div>

            <AnimatePresence initial={false}>
              <motion.div
                key={categoryExpanded ? "expanded" : "collapsed"}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: [...APPLE_EASE] }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto pt-3 pb-1 sm:flex-wrap sm:overflow-visible">
                  <button
                    type="button"
                    data-shelf-category-option
                    data-active={selectedCategory === ALL_CATEGORY_FILTER}
                    onClick={() => selectCategory(ALL_CATEGORY_FILTER)}
                    className={cn(
                      "focus-visible:ring-primary/35 inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none",
                      selectedCategory === ALL_CATEGORY_FILTER
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/80 text-muted hover:border-primary/35 hover:text-foreground"
                    )}
                  >
                    <span>{dictionary.categoryFilterAllLabel}</span>
                    <span className="font-mono text-[0.65rem] opacity-70">{books.length}</span>
                  </button>

                  {visibleCategoryOptions.map((category) => {
                    const active = selectedCategory === category.name;
                    return (
                      <button
                        type="button"
                        key={category.name}
                        data-shelf-category-option
                        data-category={category.name}
                        data-active={active}
                        onClick={() => selectCategory(category.name)}
                        className={cn(
                          "focus-visible:ring-primary/35 inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border/80 text-muted hover:border-primary/35 hover:text-foreground"
                        )}
                      >
                        <span>{category.name}</span>
                        <span className="font-mono text-[0.65rem] opacity-70">
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {paginatedShelfBooks.length > 0 ? (
          <div className="space-y-8" data-shelf-grid>
            <StaggeredList
              key={`${selectedCategory}-${selectedStatus}-${sortKey}-${searchQuery}-${safeShelfPage}`}
              className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4"
            >
              {paginatedShelfBooks.map((book) => (
                <StaggeredItem key={book.id}>
                  <ShelfBookCard
                    book={book}
                    locale={locale}
                    dictionary={dictionary}
                    onSelect={setSelectedBook}
                  />
                </StaggeredItem>
              ))}
            </StaggeredList>

            {totalShelfPages > 1 ? (
              <nav
                className="border-border/70 flex flex-wrap items-center justify-center gap-2 border-t pt-6"
                aria-label={dictionary.shelfPaginationLabel}
                data-shelf-pagination
              >
                <button
                  type="button"
                  data-shelf-page-previous
                  onClick={() => setShelfPage((page) => Math.max(0, page - 1))}
                  disabled={safeShelfPage === 0}
                  aria-label={dictionary.previousNotesPageLabel}
                  title={dictionary.previousNotesPageLabel}
                  className="border-border/80 text-muted hover:border-primary/40 hover:text-foreground grid h-10 w-10 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setShelfPage(item)}
                      aria-current={item === safeShelfPage ? "page" : undefined}
                      className={cn(
                        "focus-visible:ring-primary/35 h-10 min-w-10 rounded-full px-3 font-mono text-xs font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:outline-none",
                        item === safeShelfPage
                          ? "bg-foreground text-background"
                          : "text-muted hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {item + 1}
                    </button>
                  ) : (
                    <span key={item} className="text-muted px-1 text-xs" aria-hidden="true">
                      …
                    </span>
                  )
                )}
                <button
                  type="button"
                  data-shelf-page-next
                  onClick={() => setShelfPage((page) => Math.min(totalShelfPages - 1, page + 1))}
                  disabled={safeShelfPage >= totalShelfPages - 1}
                  aria-label={dictionary.nextNotesPageLabel}
                  title={dictionary.nextNotesPageLabel}
                  className="bg-foreground text-background disabled:bg-secondary disabled:text-muted grid h-10 w-10 place-items-center rounded-full transition hover:opacity-85 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </div>
        ) : (
          <div className="border-border/70 border-y py-14 text-center" data-shelf-empty>
            <Search className="text-muted mx-auto h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            <p className="text-foreground mt-3 text-sm font-medium">
              {dictionary.categoryFilterEmptyLabel}
            </p>
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
    </div>
  );
}
