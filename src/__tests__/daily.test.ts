import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { dailyEntries } from "@/lib/db/schema";
import {
  createDailyEntry,
  deleteDailyEntry,
  extractDailyTags,
  getAdminDailyEntryById,
  getDailyTimeline,
  normalizeDailyLocation,
  toggleDailyEntryPinned,
  toggleDailyEntryStatus,
  updateDailyEntry,
} from "@/lib/daily";

describe("daily timeline", () => {
  let tempDir = "";
  let databasePath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-daily-test-"));
    databasePath = path.join(tempDir, "daily.test.db");
    sqlite = new Database(databasePath);
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  beforeEach(() => {
    testDb.delete(dailyEntries).run();
  });

  afterAll(() => {
    sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("normalizes metadata and extracts unique multilingual topics", () => {
    expect(normalizeDailyLocation("  杭州   西湖边  ")).toBe("杭州 西湖边");
    expect(extractDailyTags("散步 #杭州 #Reading\n再次提到 #杭州")).toEqual(["杭州", "Reading"]);
  });

  it("keeps drafts private and supports topic, year, pin, and pagination", async () => {
    const database = testDb as unknown as NonNullable<Parameters<typeof createDailyEntry>[1]>;

    for (let index = 0; index < 11; index += 1) {
      await createDailyEntry(
        {
          content: index === 0 ? "第一条 #杭州" : `公开记录 ${index} #阅读`,
          images: [],
          location: null,
          status: "published",
          isPinned: index === 0,
          occurredAt:
            index === 0
              ? "2025-12-31T08:00:00.000Z"
              : `2026-07-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
        },
        database
      );
    }
    await createDailyEntry(
      {
        content: "这是一条草稿 #杭州",
        images: [],
        status: "draft",
        isPinned: false,
        occurredAt: "2026-07-22T08:00:00.000Z",
      },
      database
    );

    const firstPage = await getDailyTimeline({}, database);
    expect(firstPage.totalPublished).toBe(11);
    expect(firstPage.entries).toHaveLength(10);
    expect(firstPage.entries[0].isPinned).toBe(true);
    expect(firstPage.entries.some((entry) => entry.content.includes("草稿"))).toBe(false);
    expect(firstPage.pagination.totalPages).toBe(2);

    const secondPage = await getDailyTimeline({ page: 2 }, database);
    expect(secondPage.entries).toHaveLength(1);

    const tagResult = await getDailyTimeline({ tag: "杭州" }, database);
    expect(tagResult.totalFiltered).toBe(1);
    expect(tagResult.entries[0].tags).toContain("杭州");

    const yearResult = await getDailyTimeline({ year: 2026 }, database);
    expect(yearResult.totalFiltered).toBe(10);
  });

  it("creates, updates, publishes, pins, and deletes an entry", async () => {
    const database = testDb as unknown as NonNullable<Parameters<typeof createDailyEntry>[1]>;
    const created = await createDailyEntry(
      {
        content: "初稿",
        images: [],
        status: "draft",
        isPinned: false,
        occurredAt: "2026-07-22T08:00:00.000Z",
      },
      database
    );

    await updateDailyEntry(
      created.id,
      {
        content: "修改后的内容 #测试",
        images: [],
        status: "draft",
        isPinned: false,
        occurredAt: "2026-07-22T09:00:00.000Z",
      },
      database
    );
    await toggleDailyEntryStatus(created.id, database);
    await toggleDailyEntryPinned(created.id, database);

    const updated = await getAdminDailyEntryById(created.id, database);
    expect(updated).toMatchObject({
      content: "修改后的内容 #测试",
      status: "published",
      isPinned: true,
    });

    const deleted = await deleteDailyEntry(created.id, database);
    expect(deleted?.id).toBe(created.id);
    expect(await getAdminDailyEntryById(created.id, database)).toBeNull();
  });
});
