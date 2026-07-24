import fs from "node:fs";
import path from "node:path";
import { getAppVersionInfo, type AppVersionInfo } from "@/lib/app-version";
import { getRuntimeHealth } from "@/lib/runtime-health";

export type SystemHealthStatus = "healthy" | "warning" | "critical" | "unknown";
export type SystemHealthOverall = "healthy" | "degraded" | "critical";
export type SystemHealthGroup = "application" | "automation" | "infrastructure" | "system";

export type SystemHealthCheck = {
  id: string;
  group: SystemHealthGroup;
  status: SystemHealthStatus;
  title: string;
  summary: string;
  checkedAt: string;
  metrics?: Record<string, string | number | boolean | null>;
};

export type SystemHealthSnapshot = {
  schemaVersion: number;
  service: string;
  overall: SystemHealthOverall;
  generatedAt: string;
  checks: SystemHealthCheck[];
  counts: Record<SystemHealthStatus, number>;
  release: AppVersionInfo;
};

const DEFAULT_SNAPSHOT_PATH = path.join(process.cwd(), "data", "system-health.json");
const SNAPSHOT_STALE_WARNING_MS = 15 * 60 * 1000;
const SNAPSHOT_STALE_CRITICAL_MS = 30 * 60 * 1000;

function isHealthStatus(value: unknown): value is SystemHealthStatus {
  return value === "healthy" || value === "warning" || value === "critical" || value === "unknown";
}

function isHealthGroup(value: unknown): value is SystemHealthGroup {
  return (
    value === "application" ||
    value === "automation" ||
    value === "infrastructure" ||
    value === "system"
  );
}

function normalizeCheck(value: unknown): SystemHealthCheck | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SystemHealthCheck>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.checkedAt !== "string" ||
    !isHealthStatus(candidate.status) ||
    !isHealthGroup(candidate.group)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    group: candidate.group,
    status: candidate.status,
    title: candidate.title,
    summary: candidate.summary,
    checkedAt: candidate.checkedAt,
    ...(candidate.metrics && typeof candidate.metrics === "object"
      ? { metrics: candidate.metrics }
      : {}),
  };
}

function getOverall(checks: SystemHealthCheck[]): SystemHealthOverall {
  if (checks.some((check) => check.status === "critical")) {
    return "critical";
  }
  if (checks.some((check) => check.status === "warning")) {
    return "degraded";
  }
  return "healthy";
}

function countChecks(checks: SystemHealthCheck[]) {
  return checks.reduce<Record<SystemHealthStatus, number>>(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { healthy: 0, warning: 0, critical: 0, unknown: 0 }
  );
}

function getApplicationRuntimeCheck(): SystemHealthCheck {
  const health = getRuntimeHealth();
  return {
    id: "app_runtime",
    group: "application",
    status: health.status === "ok" ? "healthy" : "critical",
    title: "应用运行时",
    summary:
      health.status === "ok"
        ? "应用进程与持久化数据库连接正常"
        : health.reason || "应用运行时检查失败",
    checkedAt: health.timestamp,
    metrics: {
      version: health.release.version,
      database: health.checks.database,
      persistence: health.checks.persistence,
    },
  };
}

function unavailableSnapshot(now: string, reason: string): SystemHealthSnapshot {
  const checks: SystemHealthCheck[] = [
    getApplicationRuntimeCheck(),
    {
      id: "monitor_freshness",
      group: "system",
      status: "unknown",
      title: "服务器监测器",
      summary: reason,
      checkedAt: now,
    },
  ];

  return {
    schemaVersion: 1,
    service: "newblog-admin",
    overall: getOverall(checks),
    generatedAt: now,
    checks,
    counts: countChecks(checks),
    release: getAppVersionInfo(),
  };
}

export function getSystemHealthSnapshot(): SystemHealthSnapshot {
  const now = new Date();
  const nowIso = now.toISOString();
  const snapshotPath = process.env.SERVER_HEALTH_SNAPSHOT_PATH?.trim() || DEFAULT_SNAPSHOT_PATH;

  let parsed: {
    schemaVersion?: unknown;
    service?: unknown;
    generatedAt?: unknown;
    checks?: unknown;
  };

  try {
    parsed = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as typeof parsed;
  } catch {
    return unavailableSnapshot(nowIso, "尚未收到服务器监测快照");
  }

  if (typeof parsed.generatedAt !== "string" || !Array.isArray(parsed.checks)) {
    return unavailableSnapshot(nowIso, "服务器监测快照格式无效");
  }

  const hostChecks = parsed.checks
    .map(normalizeCheck)
    .filter((check): check is SystemHealthCheck => check !== null);
  const generatedAtMs = Date.parse(parsed.generatedAt);
  const ageMs = Number.isFinite(generatedAtMs)
    ? Math.max(0, now.getTime() - generatedAtMs)
    : Number.POSITIVE_INFINITY;

  let freshnessStatus: SystemHealthStatus = "healthy";
  let freshnessSummary = "服务器监测快照在有效期内";
  if (ageMs > SNAPSHOT_STALE_CRITICAL_MS) {
    freshnessStatus = "critical";
    freshnessSummary = "服务器监测快照已超过 30 分钟未更新";
  } else if (ageMs > SNAPSHOT_STALE_WARNING_MS) {
    freshnessStatus = "warning";
    freshnessSummary = "服务器监测快照已超过 15 分钟未更新";
  }

  const checks: SystemHealthCheck[] = [
    getApplicationRuntimeCheck(),
    {
      id: "monitor_freshness",
      group: "system",
      status: freshnessStatus,
      title: "服务器监测器",
      summary: freshnessSummary,
      checkedAt: nowIso,
      metrics: {
        snapshotAgeSeconds: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : -1,
      },
    },
    ...hostChecks,
  ];

  return {
    schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1,
    service: typeof parsed.service === "string" ? parsed.service : "newblog-server-monitor",
    overall: getOverall(checks),
    generatedAt: parsed.generatedAt,
    checks,
    counts: countChecks(checks),
    release: getAppVersionInfo(),
  };
}
