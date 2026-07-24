import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("reading briefing deployment", () => {
  it("schedules the synchronized reading report at 18:00 Asia/Shanghai", () => {
    const timer = read("deploy/systemd/newblog-weread-sync.timer");
    const service = read("deploy/systemd/newblog-weread-sync.service");

    expect(timer).toContain("OnCalendar=*-*-* 18:00:00 Asia/Shanghai");
    expect(timer).toContain("Persistent=true");
    expect(timer).not.toContain("RandomizedDelaySec");
    expect(service).toContain("EnvironmentFile=/etc/newblog-reading-briefing.env");
    expect(service).toContain("reading-briefing.py sync-report");
  });

  it("schedules the nightly reflection at 23:00 Asia/Shanghai", () => {
    const timer = read("deploy/systemd/newblog-evening-reading.timer");
    const service = read("deploy/systemd/newblog-evening-reading.service");

    expect(timer).toContain("OnCalendar=*-*-* 23:00:00 Asia/Shanghai");
    expect(timer).toContain("Persistent=true");
    expect(service).toContain("reading-briefing.py evening");
  });

  it("keeps model generation bounded and provides non-model fallbacks", () => {
    const script = read("scripts/reading-briefing.py");

    expect(script).toContain('"readingTime"');
    expect(script).toContain("fallback_reading_message");
    expect(script).toContain("fallback_evening_message");
    expect(script).toContain("readingReportDate");
    expect(script).toContain("eveningMessageDate");
  });
});
