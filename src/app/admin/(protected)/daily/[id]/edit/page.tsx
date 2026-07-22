import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { updateDailyEntryAction } from "@/actions/daily";
import { DailyEntryForm } from "@/components/admin/daily-entry-form";
import { getAdminDailyEntryById } from "@/lib/daily";
import { getDailyCopy } from "@/lib/daily-copy";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EditDailyEntryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDailyEntryPage({ params }: EditDailyEntryPageProps) {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).admin;
  const { id: rawId } = await params;
  const entryId = Number.parseInt(rawId, 10);
  const entry = Number.isInteger(entryId) ? await getAdminDailyEntryById(entryId) : null;

  if (!entry) {
    notFound();
  }

  return (
    <div className="space-y-7">
      <Link
        href="/admin/daily"
        className="text-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {copy.backLabel}
      </Link>

      <header className="border-border/70 space-y-1 border-b pb-5">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">{copy.editTitle}</h1>
        <p className="text-muted text-sm">{copy.editDescription}</p>
      </header>

      <DailyEntryForm
        mode="edit"
        entryId={entry.id}
        action={updateDailyEntryAction}
        initialValues={{
          content: entry.content,
          location: entry.location ?? "",
          status: entry.status,
          isPinned: entry.isPinned,
          occurredAt: entry.occurredAt,
          images: entry.images,
        }}
      />
    </div>
  );
}
