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

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border/70 min-w-0 border-l pl-4 first:border-l-0 first:pl-0 sm:pl-6">
      <p className="text-muted font-mono text-[0.68rem] font-medium tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function NoteCard({
  book,
  index,
  locale,
}: {
  book: ReadingBook;
  index: number;
  locale: "zh-CN" | "en";
}) {
  return (
    <article className="border-border/70 h-full w-full min-w-0 border-t pt-5">
      <div className="text-muted flex items-center justify-between gap-3 font-mono text-[0.68rem] tracking-[0.12em] uppercase">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="truncate">{book.title}</span>
      </div>
      <blockquote className="text-foreground mt-5 text-base leading-[1.85] break-words">
        “{book.quote[locale]}”
      </blockquote>
      <p className="text-muted mt-4 truncate text-xs">{book.author}</p>
    </article>
  );
}

export default async function BooksPage() {
  const { locale, dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.public.books;
  const dateLocale = getDateLocale(locale);
  const books = await getPublicReadingBooks();
  const stats = getReadingStats(books);
  const currentBooks = getBooksByStatus("reading", books).slice(0, 8);
  const recentNotes = getRecentBookNotes(books);

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-16 pt-6 pb-14 sm:space-y-20 sm:pt-9 sm:pb-16">
      <FadeIn>
        <section className="border-border/70 grid gap-8 border-b pb-9 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)] lg:items-end lg:pb-11">
          <div className="space-y-5">
            <p className="text-primary/80 text-xs font-semibold tracking-[0.18em] uppercase">
              {booksDictionary.eyebrow}
            </p>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-foreground text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
                {booksDictionary.title}
              </h1>
              <p className="text-muted max-w-2xl text-base leading-relaxed sm:text-lg">
                {booksDictionary.description}
              </p>
            </div>
          </div>

          <div className="border-border/70 grid grid-cols-4 gap-3 border-y py-4 lg:border-t lg:border-b-0 lg:pt-5 lg:pb-0">
            <StatItem label={booksDictionary.stats.totalLabel} value={stats.total} />
            <StatItem label={booksDictionary.stats.readingLabel} value={stats.reading} />
            <StatItem label={booksDictionary.stats.finishedLabel} value={stats.finished} />
            <StatItem label={booksDictionary.stats.notesLabel} value={stats.notes} />
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
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.5fr)] sm:items-end">
            <div className="space-y-2">
              <p className="text-primary/80 text-xs font-semibold tracking-[0.16em] uppercase">
                {booksDictionary.notesArchiveLabel}
              </p>
              <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                {booksDictionary.sections.notesHeading}
              </h2>
            </div>
            <p className="text-muted text-sm leading-relaxed sm:text-right">
              {booksDictionary.sections.notesDescription}
            </p>
          </div>

          <StaggeredList className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {recentNotes.map((book, index) => (
              <StaggeredItem key={book.id}>
                <NoteCard book={book} index={index} locale={locale} />
              </StaggeredItem>
            ))}
          </StaggeredList>
        </section>
      ) : null}
    </div>
  );
}
