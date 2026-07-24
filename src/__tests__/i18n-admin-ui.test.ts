import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("admin i18n dictionaries", () => {
  it("provides localized admin UI labels for zh-CN and en", () => {
    const zh = getDictionary("zh-CN") as unknown as Record<string, unknown>;
    const en = getDictionary("en") as unknown as Record<string, unknown>;

    const zhAdmin = zh.admin as Record<string, unknown> | undefined;
    const enAdmin = en.admin as Record<string, unknown> | undefined;

    expect(zhAdmin).toBeDefined();
    expect(enAdmin).toBeDefined();
    expect(zhAdmin).not.toEqual(enAdmin);

    for (const key of [
      "sidebar",
      "dashboard",
      "posts",
      "categories",
      "comments",
      "books",
      "about",
      "messages",
    ]) {
      expect(zhAdmin).toHaveProperty(key);
      expect(enAdmin).toHaveProperty(key);
    }
  });
});

describe("admin i18n route and component wiring", () => {
  const appRoot = path.join(process.cwd(), "src/app/admin");
  const componentRoot = path.join(process.cwd(), "src/components/admin");
  const actionRoot = path.join(process.cwd(), "src/actions");

  it("wires admin server pages/layouts to request locale dictionaries", () => {
    const serverFiles = [
      "(protected)/layout.tsx",
      "(protected)/page.tsx",
      "(protected)/posts/page.tsx",
      "(protected)/categories/page.tsx",
      "(protected)/comments/page.tsx",
      "(protected)/books/page.tsx",
    ];

    for (const relativePath of serverFiles) {
      const source = fs.readFileSync(path.join(appRoot, relativePath), "utf8");
      expect(source).toContain("getRequestI18n");
      expect(source).toContain("dictionary.admin");
    }
  });

  it("wires interactive admin components to locale context", () => {
    const clientFiles = [
      "sidebar-nav.tsx",
      "post-editor-form.tsx",
      "category-create-form.tsx",
      "about-editor-form.tsx",
      "weread-sync-form.tsx",
      "delete-post-button.tsx",
    ];

    for (const relativePath of clientFiles) {
      const source = fs.readFileSync(path.join(componentRoot, relativePath), "utf8");
      expect(source).toContain("useLocaleContext");
      expect(source).toContain("dictionary.admin");
    }
  });

  it("localizes admin action feedback and locale updates", () => {
    const localizedActionFiles = ["posts.ts", "categories-tags.ts", "about.ts", "reading.ts"];

    for (const relativePath of localizedActionFiles) {
      const source = fs.readFileSync(path.join(actionRoot, relativePath), "utf8");
      expect(source).toContain("getRequestI18n");
      expect(source).toContain("dictionary.admin");
    }

    const localeRouteSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/locale/route.ts"),
      "utf8"
    );
    expect(localeRouteSource).toContain("normalizeLocale");
  });

  it("routes the legacy admin login URL to passwordless email authentication", () => {
    const source = fs.readFileSync(path.join(appRoot, "login/page.tsx"), "utf8");

    expect(source).toContain('redirect("/account/login?next=/admin")');
    expect(source).not.toContain("password");
    expect(source).not.toContain("LoginForm");
  });
});
