import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("public i18n dictionaries", () => {
  it("provides localized public UI labels for zh-CN and en", () => {
    const zh = getDictionary("zh-CN") as unknown as Record<string, unknown>;
    const en = getDictionary("en") as unknown as Record<string, unknown>;

    expect(zh.public).toBeDefined();
    expect(en.public).toBeDefined();
    expect(zh.public).not.toEqual(en.public);
  });
});

describe("public i18n route wiring", () => {
  const appRoot = path.join(process.cwd(), "src/app");
  const componentRoot = path.join(process.cwd(), "src/components/blog");

  it("wires server pages to request locale dictionaries", () => {
    const homepageSource = fs.readFileSync(path.join(appRoot, "page.tsx"), "utf8");
    const blogSource = fs.readFileSync(path.join(appRoot, "blog/page.tsx"), "utf8");
    const searchSource = fs.readFileSync(path.join(appRoot, "search/page.tsx"), "utf8");
    const postDetailSource = fs.readFileSync(
      path.join(appRoot, "blog/[slug]/page.tsx"),
      "utf8"
    );

    for (const source of [homepageSource, blogSource, searchSource, postDetailSource]) {
      expect(source).toContain("getRequestI18n");
      expect(source).toContain("dictionary.public");
    }
  });

  it("wires interactive post-detail chrome to locale context", () => {
    const commentForm = fs.readFileSync(
      path.join(componentRoot, "comment-form.tsx"),
      "utf8"
    );
    const tableOfContents = fs.readFileSync(
      path.join(componentRoot, "table-of-contents.tsx"),
      "utf8"
    );
    const codeBlockEnhancer = fs.readFileSync(
      path.join(componentRoot, "code-block-enhancer.tsx"),
      "utf8"
    );

    expect(commentForm).toContain("useLocaleContext");
    expect(tableOfContents).toContain("useLocaleContext");
    expect(codeBlockEnhancer).toContain("useLocaleContext");
  });
});
