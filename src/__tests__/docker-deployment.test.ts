import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const dockerfilePath = join(repoRoot, "Dockerfile");
const composePath = join(repoRoot, "docker-compose.yml");
const nginxConfigPath = join(repoRoot, "nginx", "default.conf");

describe("docker deployment configuration", () => {
  it("defines a multi-stage Dockerfile with build and production stages", () => {
    expect(existsSync(dockerfilePath)).toBe(true);

    const dockerfile = readFileSync(dockerfilePath, "utf8");

    expect(dockerfile).toContain("AS builder");
    expect(dockerfile).toContain("RUN npm install");
    expect(dockerfile).toContain("RUN npm run build");
    expect(dockerfile).toContain("AS production");
    expect(dockerfile).toContain("npm install --omit=dev");
    expect(dockerfile).toContain("COPY --from=builder /app/.next ./.next");
    expect(dockerfile).toContain("COPY --from=builder /app/public ./public");
  });

  it("defines app and nginx services with persistence volumes in docker-compose", () => {
    expect(existsSync(composePath)).toBe(true);

    const compose = readFileSync(composePath, "utf8");

    expect(compose).toContain("services:");
    expect(compose).toContain("app:");
    expect(compose).toContain("nginx:");
    expect(compose).toContain("./data:/app/data");
    expect(compose).toContain("./public/uploads:/app/public/uploads");
    expect(compose).toContain("AUTH_SECRET");
    expect(compose).toContain("ADMIN_USERNAME");
    expect(compose).toContain("ADMIN_PASSWORD");
    expect(compose).toContain("NEXT_PUBLIC_SITE_URL");
  });

  it("configures nginx proxying and static file handling", () => {
    expect(existsSync(nginxConfigPath)).toBe(true);

    const nginxConfig = readFileSync(nginxConfigPath, "utf8");

    expect(nginxConfig).toContain("proxy_pass http://app:3000");
    expect(nginxConfig).toContain("location /uploads/");
    expect(nginxConfig).toContain("X-Forwarded-For");
    expect(nginxConfig).toContain("X-Forwarded-Proto");
  });
});
