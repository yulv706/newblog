import { describe, it, expect } from "vitest";
import { NAV_LINKS } from "@/components/layout/nav-links";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  getLocaleCookieOptions,
  getNextLocale,
  isSupportedLocale,
  normalizeLocale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("i18n locale helpers", () => {
  it("supports zh-CN and en locales", () => {
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("ja")).toBe(false);
  });

  it("normalizes invalid locales to the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN");
    expect(normalizeLocale(undefined)).toBe("zh-CN");
    expect(normalizeLocale(null)).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("zh-CN");
  });

  it("toggles locale between zh-CN and en", () => {
    expect(getNextLocale("zh-CN")).toBe("en");
    expect(getNextLocale("en")).toBe("zh-CN");
  });

  it("defines server-readable locale cookie defaults", () => {
    const options = getLocaleCookieOptions();

    expect(LOCALE_COOKIE_NAME).toBe("locale");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBeGreaterThan(60 * 60 * 24 * 30);
  });
});

describe("i18n dictionaries", () => {
  it("provides localized shell labels for both locales", () => {
    const zh = getDictionary("zh-CN");
    const en = getDictionary("en");

    const zhLabels = NAV_LINKS.map((link) => zh.shell.navigation.links[link.key]);
    const enLabels = NAV_LINKS.map((link) => en.shell.navigation.links[link.key]);

    expect(zhLabels).toEqual(["首页", "博客", "关于"]);
    expect(enLabels).toEqual(["Home", "Blog", "About"]);
    expect(zh.shell.siteTitle).not.toBe(en.shell.siteTitle);
  });
});
