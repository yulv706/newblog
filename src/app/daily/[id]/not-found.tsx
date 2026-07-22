import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { getDailyCopy } from "@/lib/daily-copy";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function DailyNotFound() {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).public;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center py-16 text-center">
      <div className="border-border text-muted grid h-12 w-12 place-items-center rounded-full border">
        <FileQuestion aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <h1 className="text-foreground mt-6 text-2xl font-semibold">{copy.notFoundTitle}</h1>
      <p className="text-muted mt-3 max-w-md text-sm leading-7">{copy.notFoundDescription}</p>
      <Link
        href="/daily"
        className="text-foreground hover:text-primary focus-visible:text-primary mt-7 inline-flex min-h-10 items-center gap-2 text-sm font-medium transition-colors outline-none"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {copy.backLabel}
      </Link>
    </div>
  );
}
