import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const globalsCssPath = join(repoRoot, "src/app/globals.css");
const mobileNavPath = join(repoRoot, "src/components/layout/mobile-nav.tsx");

describe("foundation fixes for overflow and CJK typography", () => {
  it("defines a robust CJK-safe sans font stack and applies it to prose", () => {
    const css = readFileSync(globalsCssPath, "utf8");

    expect(css).toContain('"Noto Sans CJK SC"');
    expect(css).toContain('"Noto Sans SC"');
    expect(css).toContain('"WenQuanYi Micro Hei"');
    expect(css).toMatch(/\.prose\s*\{[\s\S]*font-family:\s*var\(--font-sans\)/);
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
