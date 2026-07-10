import { syncWereadBooksAction } from "@/actions/reading";
import { WereadSyncForm } from "@/components/admin/weread-sync-form";
import { getRequestI18n } from "@/lib/i18n/server";
import { getReadingSyncSummary } from "@/lib/reading-books";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBooksPage() {
  const { locale, dictionary } = await getRequestI18n();
  const booksDictionary = dictionary.admin.books;
  const summary = await getReadingSyncSummary();
  const statCards = [
    {
      label: booksDictionary.stats.totalLabel,
      value: summary.totalBooks,
    },
    {
      label: booksDictionary.stats.visibleLabel,
      value: summary.visibleBooks,
    },
    {
      label: booksDictionary.stats.readingLabel,
      value: summary.readingBooks,
    },
    {
      label: booksDictionary.stats.notesLabel,
      value: summary.totalNotes,
    },
  ];
  const lastSyncedAt = summary.state?.finishedAt
    ? formatDateTime(summary.state.finishedAt, locale)
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {booksDictionary.title}
        </h1>
        <p className="text-sm text-muted">{booksDictionary.description}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-border/70 bg-background/70 p-4"
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <h2 className="text-base font-semibold tracking-tight">
            {booksDictionary.status.heading}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{booksDictionary.status.apiKeyLabel}</dt>
              <dd className={summary.hasApiKey ? "text-primary" : "text-destructive"}>
                {summary.hasApiKey
                  ? booksDictionary.status.apiKeyConfigured
                  : booksDictionary.status.apiKeyMissing}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{booksDictionary.status.lastSyncLabel}</dt>
              <dd className="text-right">
                {lastSyncedAt ?? booksDictionary.status.neverSynced}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{booksDictionary.status.lastStatusLabel}</dt>
              <dd>{summary.state?.status ?? booksDictionary.status.notRunLabel}</dd>
            </div>
            {summary.state?.message ? (
              <div className="space-y-1">
                <dt className="text-muted">{booksDictionary.status.messageLabel}</dt>
                <dd className="break-words rounded-xl bg-secondary/50 px-3 py-2">
                  {summary.state.message}
                </dd>
              </div>
            ) : null}
          </dl>
        </article>

        <article className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <h2 className="text-base font-semibold tracking-tight">
            {booksDictionary.command.heading}
          </h2>
          <p className="mt-2 text-sm text-muted">{booksDictionary.command.description}</p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground">
            <code>{booksDictionary.command.dockerCommand}</code>
          </pre>
        </article>
      </section>

      <WereadSyncForm action={syncWereadBooksAction} />
    </div>
  );
}
