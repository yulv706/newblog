import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/app-version", () => ({
  getAppVersionInfo: () => ({
    version: "9.9.9-test",
    revision: "test",
    builtAt: "2026-07-24T00:00:00.000Z",
  }),
}));

vi.mock("@/lib/runtime-health", () => ({
  getRuntimeHealth: () => ({
    status: "ok",
    checks: {
      app: "ok",
      database: "ok",
      persistence: "ok",
    },
    release: {
      version: "9.9.9-test",
      revision: "test",
      builtAt: "2026-07-24T00:00:00.000Z",
    },
    databasePath: "/tmp/blog.db",
    timestamp: new Date().toISOString(),
  }),
}));

import { getSystemHealthSnapshot } from "@/lib/admin/system-health";

describe("admin system health snapshot", () => {
  let tempDir = "";
  let snapshotPath = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "newblog-health-"));
    snapshotPath = path.join(tempDir, "system-health.json");
    process.env.SERVER_HEALTH_SNAPSHOT_PATH = snapshotPath;
  });

  afterEach(() => {
    delete process.env.SERVER_HEALTH_SNAPSHOT_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("combines the app runtime with a fresh host snapshot", () => {
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify({
        schemaVersion: 1,
        service: "newblog-server-monitor",
        generatedAt: new Date().toISOString(),
        checks: [
          {
            id: "smtp_delivery",
            group: "application",
            status: "healthy",
            title: "邮箱注册",
            summary: "SMTP 登录验证通过",
            checkedAt: new Date().toISOString(),
          },
        ],
      })
    );

    const snapshot = getSystemHealthSnapshot();

    expect(snapshot.overall).toBe("healthy");
    expect(snapshot.release.version).toBe("9.9.9-test");
    expect(snapshot.checks.map((check) => check.id)).toEqual([
      "app_runtime",
      "monitor_freshness",
      "smtp_delivery",
    ]);
    expect(snapshot.counts.healthy).toBe(3);
  });

  it("marks a host snapshot critical after thirty minutes", () => {
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
        checks: [],
      })
    );

    const snapshot = getSystemHealthSnapshot();
    const freshness = snapshot.checks.find((check) => check.id === "monitor_freshness");

    expect(snapshot.overall).toBe("critical");
    expect(freshness?.status).toBe("critical");
  });

  it("returns an explicit unknown state when no host snapshot exists", () => {
    const snapshot = getSystemHealthSnapshot();
    const freshness = snapshot.checks.find((check) => check.id === "monitor_freshness");

    expect(freshness?.status).toBe("unknown");
    expect(snapshot.counts.unknown).toBe(1);
  });
});

describe("server health monitor deployment", () => {
  const repoRoot = process.cwd();
  const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

  it("runs the low-priority monitor every five minutes", () => {
    const service = read("deploy/systemd/newblog-health-monitor.service");
    const timer = read("deploy/systemd/newblog-health-monitor.timer");

    expect(service).toContain("scripts/server-health-monitor.py");
    expect(service).toContain("Nice=10");
    expect(service).toContain("IOSchedulingPriority=7");
    expect(timer).toContain("OnUnitActiveSec=5min");
    expect(timer).toContain("RandomizedDelaySec=20s");
    expect(timer).toContain("Persistent=true");
  });

  it("keeps alerts transition-based and checks critical integrations", () => {
    const script = read("scripts/server-health-monitor.py");

    expect(script).toContain("check_registration_notifications");
    expect(script).toContain("smtp_check");
    expect(script).toContain("check_hermes");
    expect(script).toContain("check_proactive_push");
    expect(script).toContain("check_weread");
    expect(script).toContain("check_tls");
    expect(script).toContain("check_backups");
    expect(script).toContain('config.site_url + "/feed.xml"');
    expect(script).not.toContain('config.site_url + "/rss.xml"');
    expect(script).toContain("should_repeat");
    expect(script).toContain("recoveries");
  });

  it("keeps the health API admin-only and uncached", () => {
    const route = read("src/app/api/admin/system-health/route.ts");

    expect(route).toContain("getAdminSession");
    expect(route).toContain("status: 401");
    expect(route).toContain("private, no-store");
  });
});
