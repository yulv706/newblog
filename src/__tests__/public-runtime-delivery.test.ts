import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const repoRoot = process.cwd();
const nextConfigPath = join(repoRoot, "next.config.ts");
const dockerfilePath = join(repoRoot, "Dockerfile");

describe("public runtime delivery hardening", () => {
  it("allows the published proxy hostname for remote image optimization", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:8080";

    const { default: nextConfig } = await import("@/../next.config");

    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "http",
          hostname: "localhost",
          port: "8080",
        }),
      ])
    );
  });

  it("prefers a safe production default origin when NEXT_PUBLIC_SITE_URL is absent", async () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    vi.resetModules();
    const { getSiteUrl } = await import("@/lib/seo");

    expect(getSiteUrl()).toBe("http://localhost:8080");

    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("ships a Node runtime bootstrap for Web Crypto in production containers", () => {
    const dockerfile = readFileSync(dockerfilePath, "utf8");

    expect(dockerfile).toContain("NODE_OPTIONS=--require=/app/scripts/node-runtime-setup.cjs");
    expect(dockerfile).toContain("COPY --from=builder /app/scripts ./scripts");
  });

  it("keeps next config source aligned with runtime-delivery expectations", () => {
    const nextConfig = readFileSync(nextConfigPath, "utf8");

    expect(nextConfig).toContain("remotePatterns");
    expect(nextConfig).toContain("localhost");
    expect(nextConfig).toContain("8080");
  });

  it("avoids build-time Google font fetches in the root layout", async () => {
    const { readFileSync } = await import("node:fs");
    const layoutSource = readFileSync(join(repoRoot, "src", "app", "layout.tsx"), "utf8");

    expect(layoutSource).not.toContain('from "next/font/google"');
    expect(layoutSource).toContain('localFont({');
  });
});
