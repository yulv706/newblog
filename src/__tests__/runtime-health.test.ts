import { afterEach, describe, expect, it, vi } from "vitest";

const mockDbRun = vi.fn();
const mockExistsSync = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    run: mockDbRun,
  },
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: mockExistsSync,
  },
  existsSync: mockExistsSync,
}));

afterEach(() => {
  mockDbRun.mockReset();
  mockExistsSync.mockReset();
  vi.resetModules();
});

describe("runtime health", () => {
  it("returns success only when database access and persistence are ready", async () => {
    mockDbRun.mockReturnValue(undefined);
    mockExistsSync.mockReturnValue(true);

    const { getRuntimeHealth } = await import("@/lib/runtime-health");
    const result = getRuntimeHealth();

    expect(result.status).toBe("ok");
    expect(result.checks).toEqual({
      app: "ok",
      database: "ok",
      persistence: "ok",
    });
    expect(result.databasePath).toContain("data/blog.db");
  });

  it("reports an unhealthy result when the database file is missing", async () => {
    mockDbRun.mockReturnValue(undefined);
    mockExistsSync.mockReturnValue(false);

    const { getRuntimeHealth } = await import("@/lib/runtime-health");
    const result = getRuntimeHealth();

    expect(result.status).toBe("error");
    expect(result.reason).toContain("Database file is missing");
    expect(result.checks.database).toBe("error");
  });

  it("reports an unhealthy result when the DB query fails", async () => {
    mockDbRun.mockImplementation(() => {
      throw new Error("SQLITE_CANTOPEN: unable to open database file");
    });
    mockExistsSync.mockReturnValue(true);

    const { getRuntimeHealth } = await import("@/lib/runtime-health");
    const result = getRuntimeHealth();

    expect(result.status).toBe("error");
    expect(result.reason).toContain("SQLITE_CANTOPEN");
    expect(result.checks).toEqual({
      app: "ok",
      database: "error",
      persistence: "error",
    });
  });
});
