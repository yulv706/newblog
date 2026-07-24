import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  AUTH_COOKIE_NAME,
  USER_AUTH_COOKIE_NAME,
  signAdminSessionToken,
  signUserSessionToken,
  verifySessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";

const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
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

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: cryptoImpl,
  });
}

function uninstallTestCrypto() {
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, "crypto");
}

function removeTestCrypto() {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: undefined,
  });
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

  afterEach(() => {
    uninstallTestCrypto();
  });

  it("signs and verifies a valid session token", async () => {
    const token = await signAdminSessionToken(12);
    const payload = await verifySessionToken(token);

    expect(payload?.sub).toBe("user:12");
    expect(payload?.exp).toBeTypeOf("number");
    expect(payload?.iat).toBeTypeOf("number");
  });

  it("rejects tampered tokens", async () => {
    const token = await signAdminSessionToken(12);
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
    const token = await signAdminSessionToken(12, {
      now: 1_000,
      expiresInSeconds: 1,
    });

    const payload = await verifySessionToken(token, { now: 3_000 });
    expect(payload).toBeNull();
  });

  it("keeps admin and user tokens isolated by token kind", async () => {
    const adminToken = await signAdminSessionToken(12);
    const userToken = await signUserSessionToken(12);

    expect(await verifySessionToken(userToken)).toBeNull();
    expect(await verifyUserSessionToken(adminToken)).toBeNull();
    expect((await verifyUserSessionToken(userToken))?.sub).toBe("12");
  });
});

describe("auth runtime requirements", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  afterEach(() => {
    uninstallTestCrypto();
  });

  it("fails clearly when Web Crypto is unavailable", async () => {
    removeTestCrypto();

    await expect(signAdminSessionToken(12)).rejects.toThrow(
      "A Web Crypto implementation is unavailable in this runtime."
    );
  });
});

describe("admin middleware protection", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  afterEach(() => {
    uninstallTestCrypto();
  });

  it("redirects /admin to email login when auth cookie is missing", async () => {
    const request = createRequest("/admin");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/account/login");
    expect(decodeURIComponent(location)).toContain("next=/admin");
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
    const token = await signAdminSessionToken(12);
    const request = createRequest("/admin", `${AUTH_COOKIE_NAME}=${token}`);
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("redirects malformed JWT cookies to email login", async () => {
    const request = createRequest("/admin", `${AUTH_COOKIE_NAME}=invalid.tampered.token`);
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/account/login");
  });
});

describe("daily user middleware protection", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
    installTestCrypto();
  });

  afterEach(() => {
    uninstallTestCrypto();
  });

  it("redirects anonymous daily requests to email login with a return path", async () => {
    const response = await middleware(createRequest("/daily/2?from=test"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/account/login");
    expect(decodeURIComponent(location)).toContain("next=/daily/2?from=test");
  });

  it("allows daily requests with a valid user session", async () => {
    const token = await signUserSessionToken(12);
    const response = await middleware(createRequest("/daily", `${USER_AUTH_COOKIE_NAME}=${token}`));

    expect(response.status).toBe(200);
  });

  it("requires the reader session even when an admin cookie is present", async () => {
    const token = await signAdminSessionToken(12);
    const response = await middleware(createRequest("/daily", `${AUTH_COOKIE_NAME}=${token}`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/account/login");
  });
});
