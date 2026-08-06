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
    const delivery = read("scripts/hermes_delivery.py");
    const readingBriefing = read("scripts/reading-briefing.py");
    const registrationNotifier = read("scripts/dispatch-registration-notifications.py");

    expect(script).toContain("check_registration_notifications");
    expect(script).toContain("smtp_check");
    expect(script).toContain("check_hermes");
    expect(script).toContain("check_proactive_push");
    expect(script).toContain("check_weread");
    expect(script).toContain("check_steam_games");
    expect(script).toContain('is-active", "newblog-weread-sync.timer"');
    expect(script).toContain('is-active", "newblog-steam-sync.timer"');
    expect(script).toContain("FROM steam_sync_state");
    expect(script).toContain('config.site_url + "/games"');
    expect(script).toContain('"accessProtected": route_ok');
    expect(script).toContain("check_tls");
    expect(script).toContain("check_backups");
    expect(script).toContain('config.site_url + "/feed.xml"');
    expect(script).not.toContain('config.site_url + "/rss.xml"');
    expect(script).toContain("should_repeat");
    expect(script).toContain("recoveries");
    expect(script).toContain("HEALTH_ALERT_FAILURE_RETRY_SECONDS");
    expect(script).toContain("lastDeliveryError");
    expect(script).toContain("gateway_heartbeat_path");
    expect(script).toContain('systemd_unit_state("newblog-weread-sync.service")');
    expect(script).toContain('systemd_unit_state("newblog-evening-reading.service")');
    expect(script).toContain("expected_delivery_date");
    expect(script).toContain("delivery_is_fresh");
    expect(delivery).toContain("cooldown active");
    expect(delivery).toContain("HERMES_MIN_SEND_INTERVAL_SECONDS");
    expect(delivery).toContain("HERMES_RATE_LIMIT_BASE_SECONDS");
    expect(delivery).toContain("delivery.lock");
    expect(delivery).toContain("recentDeliveries");
    expect(delivery).toContain("X-Webhook-Signature-V2");
    expect(delivery).toContain("X-Webhook-Timestamp");
    expect(delivery).toContain("HERMES_WEBHOOK_SECRET_FILE");
    expect(delivery).toContain("HERMES_UPSTREAM_REJECTION_BACKOFF_SECONDS");
    expect(delivery).toContain("HERMES_WEIXIN_CONTEXT_DIR");
    expect(delivery).toContain("context refreshed; shared cooldown released");
    expect(delivery).toContain("requiresContextRefresh");
    expect(delivery).toContain("ensure_hermes_delivery_ready");
    expect(script).toContain("deliveryContextRefreshRequired");
    expect(script).toContain("微信尽力推送会话待刷新");
    expect(script).toContain("emailPrimary");
    expect(script).toContain("send_email");
    expect(script).toContain("allow_weixin");
    expect(delivery).not.toContain('"hermes",\n        "send"');
    expect(delivery).toContain("retrying in {}s");
    expect(delivery).toContain("time.sleep(delay)");
    expect(script).toContain("NON_HERMES_ALERTABLE_CHECKS");
    expect(script).toContain("HEALTH_WARNING_CONFIRM_SECONDS");
    expect(script).toContain("HEALTH_SEND_RECOVERY_ALERTS");
    expect(readingBriefing).toContain("from hermes_delivery import send_hermes_message");
    expect(readingBriefing).toContain("ensure_hermes_delivery_ready(logger=log)");
    expect(readingBriefing).toContain('"reading-report:{}".format(day)');
    expect(readingBriefing).toContain('"evening-reading:{}".format(day)');
    expect(registrationNotifier).toContain("from hermes_delivery import send_hermes_message");
    expect(registrationNotifier).toContain(
      'idempotency_key = "registration:{}".format(row["id"])',
    );
    expect(registrationNotifier).toContain("send_email(");
  });

  it("shows the Steam archive as a first-class monitored integration", () => {
    const component = read("src/components/admin/system-health-dashboard.tsx");
    const copy = read("src/lib/system-health-copy.ts");

    expect(component).toContain("steam_games: Gamepad2");
    expect(copy).toContain('steam_games: "Steam 游戏档案"');
    expect(copy).toContain('steam_games: "Steam game archive"');
  });

  it("keeps the auto-refresh thumb within its fixed switch track", () => {
    const component = read("src/components/admin/system-health-dashboard.tsx");

    expect(component).toContain("relative h-6 w-11 shrink-0 overflow-hidden");
    expect(component).toContain("absolute top-0.5 left-0.5 h-5 w-5");
    expect(component).toContain('autoRefresh ? "translate-x-5" : "translate-x-0"');
  });

  it("keeps the health API admin-only and uncached", () => {
    const route = read("src/app/api/admin/system-health/route.ts");

    expect(route).toContain("getAdminSession");
    expect(route).toContain("status: 401");
    expect(route).toContain("private, no-store");
  });
});
