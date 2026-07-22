import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DailyTimelineEntry } from "@/components/daily/daily-timeline-entry";
import { FadeIn } from "@/components/ui/animations";
import { getPublishedDailyEntryById } from "@/lib/daily";
import { getDailyCopy } from "@/lib/daily-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import {
  buildDailyPostingJsonLd,
  buildLocalizedMetadataFields,
  buildMetaDescription,
  serializeJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DailyDetailPageProps = {
  params: Promise<{ id: string }>;
};

function parseEntryId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 && String(id) === value ? id : null;
}

export async function generateMetadata({ params }: DailyDetailPageProps): Promise<Metadata> {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).public;
  const id = parseEntryId((await params).id);
  const entry = id ? await getPublishedDailyEntryById(id) : null;

  if (!entry) {
    return buildLocalizedMetadataFields(locale, {
      title: copy.notFoundTitle,
      description: copy.notFoundDescription,
      path: id ? `/daily/${id}` : "/daily",
    });
  }

  return buildLocalizedMetadataFields(locale, {
    title: buildMetaDescription(entry.content, copy.metadataTitle, 52),
    description: buildMetaDescription(entry.content, copy.metadataDescription),
    path: `/daily/${entry.id}`,
    imageUrl: entry.images[0],
    type: "article",
  });
}

export default async function DailyDetailPage({ params }: DailyDetailPageProps) {
  const { locale } = await getRequestI18n();
  const copy = getDailyCopy(locale).public;
  const id = parseEntryId((await params).id);
  if (!id) {
    notFound();
  }

  const entry = await getPublishedDailyEntryById(id);
  if (!entry) {
    notFound();
  }
  const jsonLd = buildDailyPostingJsonLd(entry, {
    authorName: copy.profileName,
  });

  return (
    <div className="mx-auto w-full max-w-[48rem] pt-8 pb-20 sm:pt-12 sm:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <FadeIn>
        <Link
          href="/daily"
          className="text-muted hover:text-foreground focus-visible:text-foreground inline-flex min-h-10 items-center gap-2 text-sm font-medium transition-colors outline-none"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {copy.backLabel}
        </Link>

        <div className="border-border/70 mt-5 border-y">
          <DailyTimelineEntry entry={entry} locale={locale} showDetailLink={false} />
        </div>
      </FadeIn>
    </div>
  );
}
