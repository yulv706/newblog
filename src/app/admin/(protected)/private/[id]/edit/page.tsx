import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { updatePrivateEntryAction } from "@/actions/private-notes";
import { PrivateEntryForm } from "@/components/admin/private-entry-form";
import { getPrivateNotesCopy } from "@/lib/private-notes-copy";
import { getPrivateEntryById } from "@/lib/private-notes";
import { getRequestI18n } from "@/lib/i18n/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditPrivateEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { locale } = await getRequestI18n();
  const copy = getPrivateNotesCopy(locale);
  const { id } = await params;
  const entryId = Number.parseInt(id, 10);
  const entry = Number.isInteger(entryId) ? await getPrivateEntryById(entryId) : null;
  if (!entry) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-4">
        <Link href="/admin/private" className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {copy.backButton}
        </Link>
        <div className="border-border/70 bg-secondary/35 rounded-2xl border p-5 sm:p-7">
          <div className="text-primary inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            {copy.privacyLabel}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{entry.title}</h1>
          <p className="text-muted mt-2 text-sm leading-6">{copy.privacyDescription}</p>
        </div>
      </header>

      <section className="border-border/70 bg-background rounded-2xl border p-5 shadow-sm sm:p-7">
        <PrivateEntryForm mode="edit" initialValues={entry} action={updatePrivateEntryAction} />
      </section>
    </div>
  );
}
