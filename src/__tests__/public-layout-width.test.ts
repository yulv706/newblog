import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public layout width refinement", () => {
  it("removes the single global narrow main-content cap", () => {
    const rootLayoutSource = readSource("src/app/layout.tsx");

    expect(rootLayoutSource).not.toContain("max-w-[var(--content-max-width)]");
    expect(rootLayoutSource).toContain(
      '<main className="w-full flex-1 px-[var(--spacing-page)]">'
    );
  });

  it("uses a wider centered shell on public browse pages", () => {
    const expectedShellClass = "mx-auto w-full max-w-[var(--content-wide-max-width)]";

    const homePageSource = readSource("src/app/page.tsx");
    const blogPageSource = readSource("src/app/blog/page.tsx");
    const searchPageSource = readSource("src/app/search/page.tsx");
    const aboutPageSource = readSource("src/app/about/page.tsx");

    expect(homePageSource).toContain(expectedShellClass);
    expect(blogPageSource).toContain(expectedShellClass);
    expect(searchPageSource).toContain(expectedShellClass);
    expect(aboutPageSource).toContain(expectedShellClass);
  });

  it("keeps blog post detail prose readable inside a wider outer shell", () => {
    const globalsSource = readSource("src/app/globals.css");
    const postPageSource = readSource("src/app/blog/[slug]/page.tsx");

    expect(globalsSource).toContain("--content-post-max-width:");
    expect(postPageSource).toContain("mx-auto w-full max-w-[var(--content-post-max-width)]");
    expect(postPageSource).toContain("lg:max-w-[72ch]");
  });
});
