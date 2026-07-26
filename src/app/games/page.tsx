import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { InteractiveGameLibrary } from "@/components/games/interactive-game-library";
import { FadeIn } from "@/components/ui/animations";
import { getPublicSteamLibrary } from "@/lib/games";
import { getGamesCopy } from "@/lib/games-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import { buildLocalizedMetadataFields } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestI18n();
  const copy = getGamesCopy(locale).public;

  return {
    ...buildLocalizedMetadataFields(locale, {
      title: copy.title,
      description: copy.description,
      path: "/games",
    }),
    robots: { index: false, follow: false },
  };
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-border/70 min-w-0 border-l pl-2 first:border-l-0 first:pl-0 sm:pl-6">
      <p className="text-muted truncate text-[0.68rem] font-medium">{label}</p>
      <p className="text-foreground mt-1.5 truncate text-lg font-semibold tabular-nums sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export default async function GamesPage() {
  const { locale } = await getRequestI18n();
  const copy = getGamesCopy(locale).public;
  const { games, profile, stats, configured } = await getPublicSteamLibrary();
  const totalPlaytime = `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(stats.totalPlaytimeMinutes / 60)}h`;

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-12 pt-6 pb-16 sm:space-y-16 sm:pt-9">
      <FadeIn>
        <header className="border-border/70 grid gap-8 border-b pb-9 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)] lg:items-end lg:pb-11">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-primary text-xs font-semibold">{copy.eyebrow}</p>
              {profile ? (
                <Link
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs transition"
                >
                  {profile.avatarUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="border-border h-6 w-6 rounded-full border object-cover"
                      />
                    </>
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        profile.personaState > 0 ? "bg-[#66c0f4]" : "bg-muted/55"
                      }`}
                    />
                  )}
                  <span>{profile.personaName || copy.profileLabel}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-foreground text-4xl leading-tight font-semibold sm:text-5xl">
                {copy.title}
              </h1>
              <p className="text-muted max-w-2xl text-base leading-relaxed sm:text-lg">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="border-border/70 grid grid-cols-4 gap-3 border-y py-4 lg:border-t lg:border-b-0 lg:pt-5 lg:pb-0">
            <StatItem label={copy.stats.games} value={stats.total} />
            <StatItem label={copy.stats.hours} value={totalPlaytime} />
            <StatItem label={copy.stats.recent} value={stats.recent} />
            <StatItem label={copy.stats.reviews} value={stats.reviewed} />
          </div>
        </header>
      </FadeIn>

      <InteractiveGameLibrary games={games} locale={locale} copy={copy} configured={configured} />
    </div>
  );
}
