import Image from "next/image";
import Link from "next/link";
import { Edit3, Eye, EyeOff, Pin, PinOff } from "lucide-react";
import {
  createDailyEntryAction,
  deleteDailyEntryAction,
  toggleDailyEntryPinnedAction,
  toggleDailyEntryStatusAction,
} from "@/actions/daily";
import { DailyDeleteButton } from "@/components/admin/daily-delete-button";
import { DailyEntryForm } from "@/components/admin/daily-entry-form";
import { getAdminDailyEntries } from "@/lib/daily";
import { getDailyCopy } from "@/lib/daily-copy";
import { getDateLocale } from "@/lib/i18n/config";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDailyPage() {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).admin;
  const entries = await getAdminDailyEntries();
  const dateLocale = getDateLocale(locale);

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">{copy.title}</h1>
        <p className="text-muted text-sm">{copy.description}</p>
      </header>

      <section className="border-border/70 space-y-5 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-lg font-semibold tracking-normal">
            {copy.composerTitle}
          </h2>
          <p className="text-muted text-sm">{copy.composerDescription}</p>
        </div>
        <DailyEntryForm
          mode="create"
          action={createDailyEntryAction}
          initialValues={{
            content: "",
            location: "",
            status: "published",
            isPinned: false,
            occurredAt: new Date().toISOString(),
            images: [],
          }}
        />
      </section>

      <section className="border-border/70 space-y-5 border-t pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-foreground text-lg font-semibold tracking-normal">
              {copy.listHeading}
            </h2>
            <p className="text-muted text-sm">{copy.listDescription}</p>
          </div>
          <span className="text-muted font-mono text-xs tabular-nums">
            {String(entries.length).padStart(2, "0")}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="border-border border-y border-dashed py-10 text-center">
            <h3 className="text-foreground text-base font-semibold">{copy.emptyTitle}</h3>
            <p className="text-muted mt-2 text-sm">{copy.emptyDescription}</p>
          </div>
        ) : (
          <div className="divide-border/70 border-border/70 divide-y border-y">
            {entries.map((entry) => (
              <article key={entry.id} className="grid gap-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)]">
                <div className="border-border bg-secondary relative aspect-square overflow-hidden rounded-lg border">
                  {entry.images[0] ? (
                    <Image
                      src={entry.images[0]}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-muted grid h-full place-items-center font-mono text-xs">
                      {String(entry.id).padStart(2, "0")}
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="text-muted flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={entry.status === "published" ? "text-success" : "text-warning"}
                    >
                      {entry.status === "published" ? copy.publishedLabel : copy.draftLabel}
                    </span>
                    {entry.isPinned ? (
                      <span className="inline-flex items-center gap-1">
                        <Pin aria-hidden="true" className="h-3 w-3" />
                        {copy.pinLabel}
                      </span>
                    ) : null}
                    <time dateTime={entry.occurredAt}>
                      {new Date(entry.occurredAt).toLocaleString(dateLocale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="text-foreground line-clamp-3 text-sm leading-6 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Link
                      href={`/admin/daily/${entry.id}/edit`}
                      className="hover:bg-secondary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />
                      {copy.editLabel}
                    </Link>
                    <form action={toggleDailyEntryStatusAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="hover:bg-secondary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                      >
                        {entry.status === "published" ? (
                          <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {entry.status === "published" ? copy.unpublishLabel : copy.publishLabel}
                      </button>
                    </form>
                    <form action={toggleDailyEntryPinnedAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="hover:bg-secondary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                      >
                        {entry.isPinned ? (
                          <PinOff aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Pin aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {entry.isPinned ? copy.unpinLabel : copy.pinLabel}
                      </button>
                    </form>
                    <DailyDeleteButton
                      entryId={entry.id}
                      label={copy.deleteLabel}
                      confirmMessage={copy.deleteConfirmTemplate}
                      action={deleteDailyEntryAction}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
