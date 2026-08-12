import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  LockKeyhole,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { createPrivateEntryAction } from "@/actions/private-notes";
import { PrivateEntryActions } from "@/components/admin/private-entry-actions";
import { PrivateEntryForm } from "@/components/admin/private-entry-form";
import { getPrivateNotesCopy } from "@/lib/private-notes-copy";
import { getPrivateEntries, getPrivateEntryStats, type PrivateEntryView } from "@/lib/private-notes";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VIEWS: PrivateEntryView[] = ["all", "thought", "goal", "completed"];

function getView(value?: string): PrivateEntryView {
  return VIEWS.includes(value as PrivateEntryView) ? (value as PrivateEntryView) : "all";
}

function formatDate(value: string | null, locale: "zh-CN" | "en") {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function PrivateNotesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; q?: string }>;
}) {
  const { locale } = await getRequestI18n();
  const copy = getPrivateNotesCopy(locale);
  const params = (await searchParams) ?? {};
  const view = getView(params.view);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const [entries, stats] = await Promise.all([
    getPrivateEntries({ view, search }),
    getPrivateEntryStats(),
  ]);

  const tabs = [
    { key: "all" as const, label: copy.tabs.all, count: stats.all },
    { key: "thought" as const, label: copy.tabs.thought, count: stats.openThoughts },
    { key: "goal" as const, label: copy.tabs.goal, count: stats.activeGoals },
    { key: "completed" as const, label: copy.tabs.completed, count: stats.completed },
  ];

  const statsCards = [
    { label: copy.stats.all, value: stats.all, icon: Sparkles },
    { label: copy.stats.activeGoals, value: stats.activeGoals, icon: Target },
    { label: copy.stats.openThoughts, value: stats.openThoughts, icon: Flag },
    { label: copy.stats.completed, value: stats.completed, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-secondary/35 p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-45 [background-image:linear-gradient(to_right,transparent,var(--color-border)),linear-gradient(to_bottom,transparent_31px,color-mix(in_oklab,var(--color-border)_38%,transparent)_32px)] [background-size:100%_100%,100%_32px]" />
        <div className="relative max-w-2xl space-y-3">
          <div className="text-primary inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
              <p className="text-muted mt-2 max-w-xl text-sm leading-6">{copy.description}</p>
            </div>
            <span className="border-primary/20 bg-background/80 text-primary inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs">
              <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
              {copy.privacyLabel}
            </span>
          </div>
          <p className="text-muted flex items-center gap-2 text-xs">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            {copy.privacyDescription}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="border-border/70 bg-background/70 rounded-xl border p-4 shadow-xs">
            <div className="text-muted flex items-center justify-between gap-2 text-xs font-medium">
              <span>{label}</span>
              <Icon aria-hidden="true" className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(290px,0.72fr)_minmax(0,1.28fr)]">
        <div id="capture" className="border-border/70 bg-background rounded-2xl border p-5 shadow-sm sm:p-6">
          <PrivateEntryForm mode="create" action={createPrivateEntryAction} />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label={copy.title} className="border-border bg-secondary/55 flex min-w-0 gap-1 overflow-x-auto rounded-xl border p-1">
              {tabs.map((tab) => {
                const isActive = view === tab.key;
                const href = search ? `/admin/private?view=${tab.key}&q=${encodeURIComponent(search)}` : `/admin/private?view=${tab.key}`;
                return (
                  <Link
                    key={tab.key}
                    href={href}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive ? "bg-background text-foreground shadow-xs" : "text-muted hover:text-foreground"}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
                    <span className="text-[10px] tabular-nums opacity-65">{tab.count}</span>
                  </Link>
                );
              })}
            </nav>

            <form method="get" className="relative min-w-0 sm:w-52">
              <Search aria-hidden="true" className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input type="hidden" name="view" value={view} />
              <input
                name="q"
                defaultValue={search}
                placeholder={copy.searchPlaceholder}
                className="border-border bg-background focus:border-primary focus:ring-primary/15 h-10 w-full rounded-xl border pr-3 pl-9 text-xs outline-none transition-[border-color,box-shadow] focus:ring-2"
              />
            </form>
          </div>

          {entries.length === 0 ? (
            <div className="border-border bg-secondary/30 rounded-2xl border border-dashed p-8 text-center">
              <div className="bg-primary/10 text-primary mx-auto grid h-11 w-11 place-items-center rounded-full">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold tracking-tight">
                {search || view !== "all" ? copy.noResultsTitle : copy.emptyTitle}
              </h2>
              <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                {search || view !== "all" ? copy.noResultsDescription : copy.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const dateLabel = formatDate(entry.updatedAt, locale);
                const targetLabel = formatDate(entry.targetDate, locale);
                const statusLabel = copy.status[entry.status];
                return (
                  <article
                    key={entry.id}
                    className="group border-border/70 bg-background rounded-2xl border p-4 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-muted flex flex-wrap items-center gap-2 text-[11px] font-medium">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${entry.kind === "goal" ? "bg-primary/10 text-primary" : "bg-secondary text-muted"}`}>
                            {entry.kind === "goal" ? <Target aria-hidden="true" className="h-3 w-3" /> : <Sparkles aria-hidden="true" className="h-3 w-3" />}
                            {entry.kind === "goal" ? copy.goalLabel : copy.thoughtLabel}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${entry.status === "completed" ? "bg-success" : entry.priority === "high" ? "bg-warning" : "bg-primary"}`} />
                            {statusLabel}
                          </span>
                          <span className="text-muted/70">{copy.updatedTemplate.replace("{date}", dateLabel)}</span>
                        </div>
                        <h2 className="mt-3 truncate text-base font-semibold tracking-tight sm:text-lg">{entry.title}</h2>
                      </div>
                      <PrivateEntryActions
                        entry={entry}
                        labels={{
                          editButton: copy.editButton,
                          completeButton: copy.completeButton,
                          reopenButton: copy.reopenButton,
                          archiveButton: copy.archiveButton,
                          deleteButton: copy.deleteButton,
                          deleteConfirm: copy.deleteConfirm,
                        }}
                      />
                    </div>

                    <p className="text-muted mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6">{entry.content}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      {entry.kind === "goal" ? (
                        <span className="text-primary inline-flex items-center gap-2 font-medium">
                          <span className="bg-secondary h-1.5 w-24 overflow-hidden rounded-full">
                            <span className="bg-primary block h-full rounded-full transition-[width]" style={{ width: `${entry.progress}%` }} />
                          </span>
                          {entry.progress}%
                        </span>
                      ) : null}
                      {targetLabel ? (
                        <span className="text-muted inline-flex items-center gap-1.5">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                          {copy.targetTemplate.replace("{date}", targetLabel)}
                        </span>
                      ) : null}
                      {entry.tags.map((tag) => (
                        <span key={tag} className="text-muted bg-secondary rounded-full px-2 py-1">
                          #{tag}
                        </span>
                      ))}
                      <Link href={`/admin/private/${entry.id}/edit`} className="text-muted hover:text-primary ml-auto inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus:opacity-100">
                        {copy.editButton}
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
