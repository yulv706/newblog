import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { siteSettings } from "@/lib/db/schema";
import {
  ABOUT_CONTENT_KEY,
  DEFAULT_ABOUT_CONTENT_PLACEHOLDER,
  getAboutContent,
  getAboutContentForPublic,
  saveAboutContent,
} from "@/lib/site-settings";

describe("about content settings", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-about-test-"));
    dbPath = path.join(tempDir, "about-feature.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });

    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uses placeholder content when no about content exists", async () => {
    const database = testDb as unknown as Parameters<typeof getAboutContent>[0];

    const rawContent = await getAboutContent(database);
    const publicContent = await getAboutContentForPublic(database);

    expect(rawContent).toBeNull();
    expect(publicContent).toBe(DEFAULT_ABOUT_CONTENT_PLACEHOLDER);
  });

  it("treats blank about content as missing and falls back to placeholder", async () => {
    const now = new Date().toISOString();
    testDb
      .insert(siteSettings)
      .values({
        key: ABOUT_CONTENT_KEY,
        value: "   ",
        updatedAt: now,
      })
      .run();

    const database = testDb as unknown as Parameters<
      typeof getAboutContentForPublic
    >[0];
    const publicContent = await getAboutContentForPublic(database);

    expect(publicContent).toBe(DEFAULT_ABOUT_CONTENT_PLACEHOLDER);
  });

  it("saves and updates about content in site_settings", async () => {
    const database = testDb as unknown as Parameters<typeof saveAboutContent>[1];

    await saveAboutContent("# First version", database);
    await saveAboutContent("## Updated version", database);

    const aboutSettingRows = testDb
      .select({
        value: siteSettings.value,
      })
      .from(siteSettings)
      .where(eq(siteSettings.key, ABOUT_CONTENT_KEY))
      .all();

    const publicContent = await getAboutContentForPublic(database);

    expect(aboutSettingRows).toHaveLength(1);
    expect(aboutSettingRows[0].value).toBe("## Updated version");
    expect(publicContent).toBe("## Updated version");
  });
});
