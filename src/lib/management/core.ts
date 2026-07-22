import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export const MANAGEMENT_JSON_BODY_LIMIT = 512 * 1024;
export const MANAGEMENT_MEDIA_BODY_LIMIT = 5 * 1024 * 1024;

export type ManagementPrincipal = {
  actor: string;
  requestId: string;
};

export class ManagementApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ManagementApiError";
  }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function tokensMatch(received: string, expected: string) {
  return timingSafeEqual(digest(received), digest(expected));
}

function sanitizeActor(value: string | null) {
  const normalized = value?.trim().slice(0, 64) ?? "";
  return /^[a-zA-Z0-9._:@/-]+$/.test(normalized) ? normalized : "hermes";
}

function sanitizeRequestId(value: string | null) {
  const normalized = value?.trim().slice(0, 80) ?? "";
  return /^[a-zA-Z0-9._:-]+$/.test(normalized) ? normalized : randomUUID();
}

export function authenticateManagementRequest(request: Request): ManagementPrincipal {
  const expectedToken = process.env.BLOG_MANAGEMENT_API_TOKEN?.trim() ?? "";
  if (expectedToken.length < 32) {
    throw new ManagementApiError(
      503,
      "management_api_unavailable",
      "The management API is not configured."
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match || !tokensMatch(match[1], expectedToken)) {
    throw new ManagementApiError(401, "unauthorized", "A valid bearer token is required.");
  }

  return {
    actor: sanitizeActor(request.headers.get("x-management-actor")),
    requestId: sanitizeRequestId(request.headers.get("x-request-id")),
  };
}

type RateBucket = {
  startedAt: number;
  count: number;
};

const globalForRateLimit = globalThis as unknown as {
  managementRateLimits?: Map<string, RateBucket>;
};
const rateLimits = globalForRateLimit.managementRateLimits ?? new Map<string, RateBucket>();
globalForRateLimit.managementRateLimits = rateLimits;

export function enforceManagementRateLimit(actor: string, now = Date.now()) {
  const configured = Number.parseInt(process.env.BLOG_MANAGEMENT_RATE_LIMIT ?? "120", 10);
  const limit = Number.isFinite(configured) ? Math.min(600, Math.max(20, configured)) : 120;
  const bucket = rateLimits.get(actor);

  if (!bucket || now - bucket.startedAt >= 60_000) {
    rateLimits.set(actor, { startedAt: now, count: 1 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ManagementApiError(
      429,
      "rate_limited",
      "Too many management requests. Retry after the current minute."
    );
  }
}

export async function readManagementJson(request: Request) {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MANAGEMENT_JSON_BODY_LIMIT) {
    throw new ManagementApiError(413, "payload_too_large", "The JSON payload is too large.");
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MANAGEMENT_JSON_BODY_LIMIT) {
    throw new ManagementApiError(413, "payload_too_large", "The JSON payload is too large.");
  }

  if (!raw.trim()) {
    return { raw: "{}", value: {} as Record<string, unknown> };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return { raw, value: parsed as Record<string, unknown> };
  } catch {
    throw new ManagementApiError(400, "invalid_json", "The request body must be a JSON object.");
  }
}

export function getPositiveInteger(value: string, field = "id") {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new ManagementApiError(400, "invalid_parameter", `${field} must be a positive integer.`);
  }
  return parsed;
}

export function getPage(value: string | null, fallback = 1) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getLimit(value: string | null, fallback = 20, maximum = 100) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function requireDeleteConfirmation(
  request: Request,
  resource: string,
  id: string | number
) {
  const expected = `delete:${resource}:${id}`;
  if (request.headers.get("x-management-confirm") !== expected) {
    throw new ManagementApiError(
      428,
      "confirmation_required",
      `Set X-Management-Confirm to ${expected} to confirm this deletion.`
    );
  }
}

export function hashManagementRequest(method: string, path: string, rawBody: string) {
  return createHash("sha256")
    .update(`${method.toUpperCase()}\n${path}\n${rawBody}`)
    .digest("hex");
}

export function errorResponsePayload(error: unknown, requestId: string) {
  if (error instanceof ManagementApiError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
        requestId,
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "internal_error",
        message: "The management request could not be completed.",
      },
      requestId,
    },
  };
}
