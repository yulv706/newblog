import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { managementApiRequests, managementAuditLogs } from "@/lib/db/schema";
import { ManagementApiError } from "@/lib/management/core";

export type AuditEvent = {
  requestId: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  status: "success" | "error";
  summary?: Record<string, unknown>;
  error?: string | null;
};

function safeJson(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export async function recordManagementAudit(event: AuditEvent) {
  db.insert(managementAuditLogs)
    .values({
      requestId: event.requestId,
      actor: event.actor,
      action: event.action,
      resourceType: event.resourceType,
      resourceId:
        event.resourceId === undefined || event.resourceId === null
          ? null
          : String(event.resourceId),
      status: event.status,
      summary: safeJson(event.summary ?? {}, "{}"),
      error: event.error?.slice(0, 500) ?? null,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export async function getManagementAuditLogs(limit: number) {
  return db
    .select()
    .from(managementAuditLogs)
    .orderBy(desc(managementAuditLogs.createdAt), desc(managementAuditLogs.id))
    .limit(Math.min(200, Math.max(1, limit)))
    .all()
    .map((row) => ({
      ...row,
      summary: (() => {
        try {
          return JSON.parse(row.summary) as unknown;
        } catch {
          return {};
        }
      })(),
    }));
}

function getIdempotencyId(actor: string, key: string) {
  return createHash("sha256").update(`${actor}\0${key}`).digest("hex");
}

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!value) {
    return null;
  }
  if (value.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(value)) {
    throw new ManagementApiError(
      400,
      "invalid_idempotency_key",
      "Idempotency-Key must contain at most 128 safe characters."
    );
  }
  return value;
}

export async function getIdempotentResponse(
  actor: string,
  key: string,
  requestHash: string
) {
  const row = db
    .select()
    .from(managementApiRequests)
    .where(eq(managementApiRequests.id, getIdempotencyId(actor, key)))
    .get();

  if (!row) {
    return null;
  }
  if (row.requestHash !== requestHash) {
    throw new ManagementApiError(
      409,
      "idempotency_conflict",
      "This idempotency key was already used for a different request."
    );
  }

  try {
    return {
      status: row.statusCode,
      body: JSON.parse(row.responseBody) as unknown,
    };
  } catch {
    throw new ManagementApiError(500, "idempotency_corrupt", "Stored idempotency data is invalid.");
  }
}

export async function storeIdempotentResponse(input: {
  actor: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  status: number;
  body: unknown;
}) {
  db.insert(managementApiRequests)
    .values({
      id: getIdempotencyId(input.actor, input.key),
      actor: input.actor,
      method: input.method,
      path: input.path,
      requestHash: input.requestHash,
      statusCode: input.status,
      responseBody: safeJson(input.body, "{}"),
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();
}
