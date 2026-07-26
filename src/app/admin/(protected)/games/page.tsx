import Link from "next/link";
import { ExternalLink, Gamepad2, KeyRound, ShieldCheck, Terminal } from "lucide-react";
import { syncSteamGamesAction } from "@/actions/games";
import { SteamAdminLibrary } from "@/components/admin/steam-admin-library";
import { SteamSyncPanel } from "@/components/admin/steam-sync-panel";
import { getSteamAdminLibrary, getSteamSyncSummary } from "@/lib/games";
import { getGamesCopy } from "@/lib/games-copy";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConnectionRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="border-border/60 flex min-w-0 items-center justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-muted text-sm">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-sm font-medium ${
          ready ? "text-foreground" : "text-destructive"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function AdminGamesPage() {
  const { locale } = await getRequestI18n();
  const copy = getGamesCopy(locale);
  const [summary, games] = await Promise.all([getSteamSyncSummary(), getSteamAdminLibrary()]);
  const configured = summary.hasApiKey && Boolean(summary.steamId);
  const lastSync = formatDateTime(summary.state?.finishedAt, locale);
  const stats = [
    { label: copy.admin.stats.total, value: summary.totalGames },
    { label: copy.admin.stats.visible, value: summary.visibleGames },
    { label: copy.admin.stats.reviewed, value: summary.reviewedGames },
    { label: copy.admin.stats.recent, value: summary.recentlyPlayed },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-primary h-5 w-5" aria-hidden="true" />
          <h1 className="text-foreground text-2xl font-semibold">{copy.admin.title}</h1>
        </div>
        <p className="text-muted max-w-3xl text-sm leading-relaxed">{copy.admin.description}</p>
      </header>

      <section className="border-border/70 grid grid-cols-2 border-y py-4 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`min-w-0 px-4 first:pl-0 ${index > 0 ? "border-border/60 border-l" : ""}`}
          >
            <p className="text-muted truncate text-xs font-medium">{stat.label}</p>
            <p className="text-foreground mt-1.5 text-2xl font-semibold tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="border-border/70 grid overflow-hidden rounded-lg border lg:grid-cols-2">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="text-primary h-4 w-4" aria-hidden="true" />
            <h2 className="text-foreground font-semibold">{copy.admin.connection.title}</h2>
          </div>
          <dl className="mt-4">
            <ConnectionRow
              label={copy.admin.connection.apiKey}
              value={
                summary.hasApiKey ? copy.admin.connection.configured : copy.admin.connection.missing
              }
              ready={summary.hasApiKey}
            />
            <ConnectionRow
              label={copy.admin.connection.steamId}
              value={summary.steamId ?? copy.admin.connection.missing}
              ready={Boolean(summary.steamId)}
            />
            <ConnectionRow
              label={copy.admin.connection.profile}
              value={summary.profile?.personaName || copy.admin.connection.notSynced}
              ready={Boolean(summary.profile)}
            />
          </dl>
          <div className="border-border/60 mt-5 space-y-3 border-t pt-4">
            <p className="text-muted flex gap-2 text-xs leading-relaxed">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{copy.admin.connection.keyHint}</span>
            </p>
            <p className="text-muted text-xs leading-relaxed">
              {copy.admin.connection.privacyHint}
            </p>
            <Link
              href="https://steamcommunity.com/dev/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              {copy.admin.connection.keyLinkLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="border-border/70 p-4 sm:p-5 lg:border-l">
          <div className="flex items-center gap-2">
            <Terminal className="text-primary h-4 w-4" aria-hidden="true" />
            <h2 className="text-foreground font-semibold">{copy.admin.sync.commandTitle}</h2>
          </div>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            {copy.admin.sync.commandDescription}
          </p>
          <pre className="border-border bg-secondary/55 text-foreground mt-4 overflow-x-auto rounded-lg border p-3 text-xs">
            <code>{copy.admin.sync.command}</code>
          </pre>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{copy.admin.sync.lastSync}</dt>
              <dd className="text-foreground text-right">{lastSync ?? copy.admin.sync.never}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{copy.admin.sync.status}</dt>
              <dd className="text-foreground text-right">
                {summary.state?.status ?? copy.admin.connection.notSynced}
              </dd>
            </div>
            {summary.state?.message ? (
              <div className="pt-1">
                <dt className="text-muted">{copy.admin.sync.message}</dt>
                <dd className="text-foreground mt-1 text-xs leading-relaxed break-words">
                  {summary.state.message}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <SteamSyncPanel action={syncSteamGamesAction} disabled={!configured} />
      <SteamAdminLibrary games={games} />
    </div>
  );
}
