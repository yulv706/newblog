import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const globalsCssPath = join(repoRoot, "src/app/globals.css");
const layoutPath = join(repoRoot, "src/app/layout.tsx");
const mobileNavPath = join(repoRoot, "src/components/layout/mobile-nav.tsx");

describe("foundation fixes for overflow and CJK typography", () => {
  it("wires a bundled CJK webfont into the root layout", () => {
    const layoutSource = readFileSync(layoutPath, "utf8");

    expect(layoutSource).toContain("localFont");
    expect(layoutSource).toContain("./fonts/NotoSansCJKsc-Regular.otf");
    expect(layoutSource).toContain('variable: "--font-cjk"');
    expect(layoutSource).toContain("inter.variable");
    expect(layoutSource).toContain("notoSansSc.variable");
    expect(layoutSource).toContain("jetBrainsMono.variable");
  });

  it("applies the bundled CJK font variable to global sans + prose typography", () => {
    const css = readFileSync(globalsCssPath, "utf8");

    expect(css).toContain("var(--font-inter)");
    expect(css).toContain("var(--font-cjk)");
    expect(css).toMatch(
      /\.prose\s*\{[\s\S]*font-family:\s*var\(--font-inter\), var\(--font-cjk\)/
    );
  });

  it("mounts mobile drawer conditionally to avoid closed-state width contribution", () => {
    const mobileNavSource = readFileSync(mobileNavPath, "utf8");

    expect(mobileNavSource).toContain(
      "const [isDrawerMounted, setIsDrawerMounted]"
    );
    expect(mobileNavSource).toContain("{isDrawerMounted && (");
  });

  it("constrains mobile drawer width to viewport", () => {
    const mobileNavSource = readFileSync(mobileNavPath, "utf8");

    expect(mobileNavSource).toContain("w-[min(20rem,100vw)]");
  });
});
