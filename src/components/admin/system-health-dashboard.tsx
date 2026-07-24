"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  HardDrive,
  Mail,
  MemoryStick,
  RefreshCw,
  Rss,
  Server,
  ShieldCheck,
  TimerReset,
  XCircle,
} from "lucide-react";
import type {
  SystemHealthCheck,
  SystemHealthGroup,
  SystemHealthSnapshot,
  SystemHealthStatus,
} from "@/lib/admin/system-health";
import type { AppLocale } from "@/lib/i18n/config";
import type { SystemHealthCopy } from "@/lib/system-health-copy";
import { cn } from "@/lib/utils";

const GROUP_ORDER: SystemHealthGroup[] = ["application", "automation", "infrastructure", "system"];

const STATUS_STYLES: Record<SystemHealthStatus, string> = {
  healthy: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  critical: "border-destructive/25 bg-destructive/10 text-destructive",
  unknown: "border-border bg-secondary text-muted",
};

const CHECK_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  app_runtime: Activity,
  monitor_freshness: TimerReset,
  app_container: Server,
  nginx_container: Globe2,
  site_https: Globe2,
  rss_feed: Rss,
  database: Database,
  smtp_delivery: Mail,
  registration_notifications: BellRing,
  weread_sync: BookOpen,
  hermes_gateway: Bot,
  proactive_push: BellRing,
  tls_certificate: ShieldCheck,
  disk_space: HardDrive,
  memory: MemoryStick,
  backups: Database,
};

function StatusIcon({ status, className }: { status: SystemHealthStatus; className?: string }) {
  if (status === "healthy") {
    return <CheckCircle2 aria-hidden="true" className={className} />;
  }
  if (status === "warning") {
    return <AlertTriangle aria-hidden="true" className={className} />;
  }
  if (status === "critical") {
    return <XCircle aria-hidden="true" className={className} />;
  }
  return <Clock3 aria-hidden="true" className={className} />;
}

function formatTimestamp(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function HealthRow({ check, copy }: { check: SystemHealthCheck; copy: SystemHealthCopy }) {
  const Icon = CHECK_ICONS[check.id] ?? Activity;

  return (
    <div className="border-border/60 grid min-h-20 gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            STATUS_STYLES[check.status]
          )}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-foreground font-medium">{copy.checkTitles[check.id] ?? check.title}</p>
          <p className="text-muted mt-1 text-sm leading-6">{check.summary}</p>
        </div>
      </div>

      <span
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
          STATUS_STYLES[check.status]
        )}
      >
        <StatusIcon status={check.status} className="h-3.5 w-3.5" />
        {copy.statuses[check.status]}
      </span>
    </div>
  );
}

export function SystemHealthDashboard({
  initialSnapshot,
  copy,
  locale,
}: {
  initialSnapshot: SystemHealthSnapshot;
  copy: SystemHealthCopy;
  locale: AppLocale;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/system-health", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setSnapshot((await response.json()) as SystemHealthSnapshot);
      setRefreshError("");
    } catch {
      setRefreshError(copy.refreshError);
    } finally {
      setIsRefreshing(false);
    }
  }, [copy.refreshError]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        checks: snapshot.checks.filter((check) => check.group === group),
      })).filter((item) => item.checks.length > 0),
    [snapshot.checks]
  );

  return (
    <div className="space-y-7">
      <header className="border-border/70 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                snapshot.overall === "healthy"
                  ? STATUS_STYLES.healthy
                  : snapshot.overall === "degraded"
                    ? STATUS_STYLES.warning
                    : STATUS_STYLES.critical
              )}
            >
              <StatusIcon
                status={
                  snapshot.overall === "healthy"
                    ? "healthy"
                    : snapshot.overall === "degraded"
                      ? "warning"
                      : "critical"
                }
                className="h-3.5 w-3.5"
              />
              {copy.overall[snapshot.overall]}
            </span>
          </div>
          <p className="text-muted text-sm sm:text-base">{copy.description}</p>
          <p className="text-muted text-xs">
            {copy.lastCheckedLabel} {formatTimestamp(snapshot.generatedAt, locale)}
            <span className="text-border mx-2">/</span>
            {copy.versionLabel} {snapshot.release.version}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-muted flex items-center gap-2 text-sm">
            <span>{copy.autoRefreshLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoRefresh}
              onClick={() => setAutoRefresh((value) => !value)}
              className={cn(
                "relative h-6 w-10 rounded-full border transition",
                autoRefresh ? "border-primary bg-primary" : "border-border bg-secondary"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  autoRefresh ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </label>
          <button
            type="button"
            title={copy.refreshLabel}
            aria-label={copy.refreshLabel}
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="border-border bg-background text-foreground hover:bg-secondary flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </button>
        </div>
      </header>

      <section className="divide-border/60 border-border/60 grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-4 sm:divide-y-0">
        {(["healthy", "warning", "critical", "unknown"] as const).map((status) => (
          <div key={status} className="px-4 py-4 first:pl-0 sm:py-3">
            <p className="text-muted text-xs font-medium">{copy.summary[status]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{snapshot.counts[status]}</p>
          </div>
        ))}
      </section>

      {refreshError ? (
        <p className="border-warning/25 bg-warning/10 text-warning rounded-lg border px-3 py-2 text-sm">
          {refreshError}
        </p>
      ) : null}

      <div className="space-y-7">
        {groups.map(({ group, checks }) => (
          <section key={group} aria-labelledby={`health-group-${group}`}>
            <h2 id={`health-group-${group}`} className="text-foreground text-sm font-semibold">
              {copy.groups[group]}
            </h2>
            <div className="mt-2">
              {checks.map((check) => (
                <HealthRow key={check.id} check={check} copy={copy} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
