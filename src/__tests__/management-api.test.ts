import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import {
  ManagementApiError,
  authenticateManagementRequest,
  readManagementJson,
  requireDeleteConfirmation,
} from "@/lib/management/core";

const originalToken = process.env.BLOG_MANAGEMENT_API_TOKEN;

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.BLOG_MANAGEMENT_API_TOKEN;
  } else {
    process.env.BLOG_MANAGEMENT_API_TOKEN = originalToken;
  }
});

describe("management API security contract", () => {
  it("authenticates a bearer token without exposing it in the principal", () => {
    const token = "a".repeat(64);
    process.env.BLOG_MANAGEMENT_API_TOKEN = token;
    const principal = authenticateManagementRequest(
      new Request("http://blog-app:3000/api/management/v1/status", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Management-Actor": "hermes-weixin",
          "X-Request-ID": "request-123",
        },
      })
    );

    expect(principal).toEqual({ actor: "hermes-weixin", requestId: "request-123" });
    expect(JSON.stringify(principal)).not.toContain(token);
  });

  it("fails closed for missing configuration and invalid credentials", () => {
    delete process.env.BLOG_MANAGEMENT_API_TOKEN;
    expect(() =>
      authenticateManagementRequest(new Request("http://blog-app:3000/api/management/v1/status"))
    ).toThrowError(expect.objectContaining({ status: 503 }));

    process.env.BLOG_MANAGEMENT_API_TOKEN = "b".repeat(64);
    expect(() =>
      authenticateManagementRequest(
        new Request("http://blog-app:3000/api/management/v1/status", {
          headers: { Authorization: `Bearer ${"c".repeat(64)}` },
        })
      )
    ).toThrowError(expect.objectContaining({ status: 401 }));
  });

  it("requires an exact, resource-scoped deletion confirmation", () => {
    const missing = new Request("http://blog-app/posts/42", { method: "DELETE" });
    expect(() => requireDeleteConfirmation(missing, "post", 42)).toThrowError(
      expect.objectContaining({ status: 428 })
    );

    const confirmed = new Request("http://blog-app/posts/42", {
      method: "DELETE",
      headers: { "X-Management-Confirm": "delete:post:42" },
    });
    expect(() => requireDeleteConfirmation(confirmed, "post", 42)).not.toThrow();
  });

  it("accepts JSON objects and rejects arrays", async () => {
    const parsed = await readManagementJson(
      new Request("http://blog-app/posts", {
        method: "POST",
        body: JSON.stringify({ title: "Draft" }),
      })
    );
    expect(parsed.value).toEqual({ title: "Draft" });

    await expect(
      readManagementJson(
        new Request("http://blog-app/posts", {
          method: "POST",
          body: JSON.stringify(["not", "an", "object"]),
        })
      )
    ).rejects.toBeInstanceOf(ManagementApiError);
  });
});

describe("management deployment boundary", () => {
  it("migrates audit and idempotency tables", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-management-test-"));
    const sqlite = new Database(path.join(tempDir, "management.db"));
    migrate(drizzle(sqlite), {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });

    expect(tables.map((row) => row.name)).toContain("management_audit_logs");
    expect(tables.map((row) => row.name)).toContain("management_api_requests");
  });

  it("blocks the management path at public nginx and ships a typed Hermes bridge", () => {
    const nginx = fs.readFileSync(path.join(process.cwd(), "nginx/default.conf"), "utf8");
    const bridge = fs.readFileSync(
      path.join(process.cwd(), "integrations/hermes/blog_manager_mcp.py"),
      "utf8"
    );

    expect(nginx.match(/location \^~ \/api\/management\//g)).toHaveLength(2);
    expect(bridge).toContain("FastMCP");
    expect(bridge).toContain("BLOG_MANAGEMENT_API_TOKEN");
    expect(bridge).not.toContain("docker.sock");
    expect(bridge).not.toContain("subprocess");
  });
});
