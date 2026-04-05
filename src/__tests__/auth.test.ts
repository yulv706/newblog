import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  AUTH_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth";

const originalCrypto = globalThis.crypto;
const nodeCrypto = process.versions.node
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("crypto").webcrypto as Crypto)
  : undefined;

function installTestCrypto() {
  const cryptoImpl = originalCrypto?.subtle ? originalCrypto : nodeCrypto;

  if (!cryptoImpl?.subtle) {
    throw new Error("Test runtime does not provide Web Crypto.");
  }

  globalThis.crypto = cryptoImpl;
}

function createRequest(path: string, cookie?: string) {
  const url = new URL(path, "http://localhost:3100");
  const headers = new Headers();

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new NextRequest(url, { headers });
}

describe("auth JWT session token", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  it("signs and verifies a valid session token", async () => {
    const token = await signSessionToken("admin");
    const payload = await verifySessionToken(token);

    expect(payload?.sub).toBe("admin");
    expect(payload?.exp).toBeTypeOf("number");
    expect(payload?.iat).toBeTypeOf("number");
  });

  it("rejects tampered tokens", async () => {
    const token = await signSessionToken("admin");
    const [header, payloadSegment, signature] = token.split(".");
    const firstSignatureChar = signature[0] ?? "";
    const replacementChar = firstSignatureChar === "a" ? "b" : "a";
    const tamperedToken = `${header}.${payloadSegment}.${replacementChar}${signature.slice(1)}`;
    const payload = await verifySessionToken(tamperedToken);

    expect(payload).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    const payload = await verifySessionToken("invalid.tampered.token");
    expect(payload).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await signSessionToken("admin", {
      now: 1_000,
      expiresInSeconds: 1,
    });

    const payload = await verifySessionToken(token, { now: 3_000 });
    expect(payload).toBeNull();
  });
});

describe("auth runtime requirements", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  it("fails clearly when Web Crypto is unavailable", async () => {
    globalThis.crypto = undefined as unknown as typeof globalThis.crypto;

    await expect(signSessionToken("admin")).rejects.toThrow(
      "A Web Crypto implementation is unavailable in this runtime."
    );
  });
});

describe("admin middleware protection", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  it("redirects /admin to /admin/login when auth cookie is missing", async () => {
    const request = createRequest("/admin");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/login");
  });

  it("returns 401 for /api/admin requests when auth cookie is missing", async () => {
    const request = createRequest("/api/admin/session");
    const response = await middleware(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });

  it("allows authenticated /admin request with a valid auth cookie", async () => {
    const token = await signSessionToken("admin");
    const request = createRequest("/admin", `${AUTH_COOKIE_NAME}=${token}`);
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("redirects malformed JWT cookies to /admin/login", async () => {
    const request = createRequest(
      "/admin",
      `${AUTH_COOKIE_NAME}=invalid.tampered.token`
    );
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/login");
  });
});
