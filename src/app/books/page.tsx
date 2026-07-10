import type { Metadata } from "next";
import { InteractiveBookshelf } from "@/components/books/interactive-bookshelf";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import {
  getBooksByStatus,
  getReadingStats,
  getRecentBookNotes,
  type ReadingBook,
} from "@/lib/books";
import { getDateLocale } from "@/lib/i18n/config";
import { getRequestI18n } from "@/lib/i18n/server";
import { getPublicReadingBooks } from "@/lib/reading-books";
import { buildLocalizedMetadataFields } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.public.books;

  return buildLocalizedMetadataFields(locale, {
    title: booksDictionary.title,
    description: booksDictionary.description,
    path: "/books",
  });
}

type BooksDictionary = Awaited<ReturnType<typeof getRequestI18n>>["dictionary"]["public"]["books"];

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function NoteCard({
  book,
  locale,
  dictionary,
}: {
  book: ReadingBook;
  locale: "zh-CN" | "en";
  dictionary: BooksDictionary;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/80 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {dictionary.noteLabel}
      </p>
      <blockquote className="mt-3 text-base leading-relaxed text-foreground">
        “{book.quote[locale]}”
      </blockquote>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-10 w-7 rounded-md border border-white/40 shadow-sm"
          style={{ background: book.cover.background }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{book.title}</p>
          <p className="truncate text-xs text-muted">{book.author}</p>
        </div>
      </div>
    </article>
  );
}

export default async function BooksPage() {
  const { locale, dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.public.books;
  const dateLocale = getDateLocale(locale);
  const books = await getPublicReadingBooks();
  const stats = getReadingStats(books);
  const currentBooks = getBooksByStatus("reading", books).slice(0, 6);
  const recentNotes = getRecentBookNotes(books);

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-14 pt-8 pb-12 sm:pt-10 sm:pb-14">
      <FadeIn className="space-y-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              {booksDictionary.eyebrow}
            </p>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {booksDictionary.title}
              </h1>
              <p className="text-base leading-relaxed text-muted">
                {booksDictionary.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label={booksDictionary.stats.totalLabel} value={stats.total} />
            <StatTile label={booksDictionary.stats.readingLabel} value={stats.reading} />
            <StatTile label={booksDictionary.stats.finishedLabel} value={stats.finished} />
            <StatTile label={booksDictionary.stats.queuedLabel} value={stats.queued} />
          </div>
        </section>

      </FadeIn>

      <InteractiveBookshelf
        currentBooks={currentBooks}
        books={books}
        locale={locale}
        dateLocale={dateLocale}
        dictionary={booksDictionary}
      />

      {recentNotes.length > 0 ? (
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {booksDictionary.sections.notesHeading}
            </h2>
            <p className="text-sm text-muted">
              {booksDictionary.sections.notesDescription}
            </p>
          </div>

          <StaggeredList className="grid gap-5 md:grid-cols-3">
            {recentNotes.map((book) => (
              <StaggeredItem key={book.id}>
                <NoteCard book={book} locale={locale} dictionary={booksDictionary} />
              </StaggeredItem>
            ))}
          </StaggeredList>
        </section>
      ) : null}
    </div>
  );
}
