import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export const ABOUT_CONTENT_KEY = "about_content";

export const DEFAULT_ABOUT_CONTENT_PLACEHOLDER = `# About Me

This page is still being written. Please check back soon.

这个页面内容正在完善中，敬请期待。`;

type SiteSettingsDatabase = Pick<typeof db, "select" | "insert">;

export async function getSiteSettingValue(
  key: string,
  database: SiteSettingsDatabase = db
) {
  const setting = database
    .select({
      value: siteSettings.value,
    })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .get();

  return setting?.value ?? null;
}

export async function saveSiteSettingValue(
  key: string,
  value: string,
  database: SiteSettingsDatabase = db
) {
  database
    .insert(siteSettings)
    .values({
      key,
      value,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();
}

export async function getAboutContent(database: SiteSettingsDatabase = db) {
  return getSiteSettingValue(ABOUT_CONTENT_KEY, database);
}

export async function getAboutContentForPublic(
  database: SiteSettingsDatabase = db
) {
  const content = await getAboutContent(database);
  if (!content || !content.trim()) {
    return DEFAULT_ABOUT_CONTENT_PLACEHOLDER;
  }

  return content;
}

export async function saveAboutContent(
  content: string,
  database: SiteSettingsDatabase = db
) {
  await saveSiteSettingValue(ABOUT_CONTENT_KEY, content, database);
}
