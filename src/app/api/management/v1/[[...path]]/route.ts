import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getIdempotentResponse,
  getManagementAuditLogs,
  readIdempotencyKey,
  recordManagementAudit,
  storeIdempotentResponse,
  type AuditEvent,
} from "@/lib/management/audit";
import { createManagementBackup, listManagementBackups } from "@/lib/management/backups";
import {
  createManagedBookNote,
  deleteManagedBookNote,
  getManagedBook,
  listManagedBooks,
  syncManagedWeread,
  updateManagedBook,
} from "@/lib/management/books";
import {
  createManagedCategory,
  createManagedDaily,
  createManagedPost,
  deleteManagedCategory,
  deleteManagedComment,
  deleteManagedDaily,
  deleteManagedPost,
  deleteManagedTag,
  getManagedAbout,
  getManagedDaily,
  getManagedPost,
  getManagedTaxonomy,
  listManagedComments,
  listManagedDaily,
  listManagedPosts,
  updateManagedAbout,
  updateManagedComment,
  updateManagedDaily,
  updateManagedPost,
} from "@/lib/management/content";
import {
  MANAGEMENT_MEDIA_BODY_LIMIT,
  ManagementApiError,
  authenticateManagementRequest,
  enforceManagementRateLimit,
  errorResponsePayload,
  getLimit,
  getPositiveInteger,
  hashManagementRequest,
  readManagementJson,
  requireDeleteConfirmation,
  type ManagementPrincipal,
} from "@/lib/management/core";
import { saveManagementImage, type ManagementMediaPurpose } from "@/lib/management/media";
import { getManagementStatus } from "@/lib/management/status";
import {
  getManagedUser,
  listManagedUsers,
  updateManagedUser,
} from "@/lib/management/users";
import { optionalString } from "@/lib/management/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

type DispatchResult = {
  data: unknown;
  status?: number;
  audit?: Omit<AuditEvent, "requestId" | "actor" | "status">;
};

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function decodeSegment(value: string, field: string) {
  try {
    const decoded = decodeURIComponent(value).trim();
    if (!decoded || decoded.length > 500) {
      throw new Error("invalid");
    }
    return decoded;
  } catch {
    throw new ManagementApiError(400, "invalid_parameter", `${field} is invalid.`);
  }
}

function mutationSummary(body: Record<string, unknown>) {
  const changedFields = Object.keys(body).filter((key) => key !== "expectedUpdatedAt");
  const content = typeof body.content === "string" ? body.content : null;
  const images = Array.isArray(body.images) ? body.images : null;
  return {
    changedFields,
    ...(content === null ? {} : { contentLength: content.length }),
    ...(images === null ? {} : { imageCount: images.length }),
  };
}

async function readMediaRequest(request: Request) {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MANAGEMENT_MEDIA_BODY_LIMIT) {
    throw new ManagementApiError(413, "payload_too_large", "The media request is too large.");
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new ManagementApiError(415, "unsupported_media", "A multipart form request is required.");
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MANAGEMENT_MEDIA_BODY_LIMIT) {
    throw new ManagementApiError(413, "payload_too_large", "The media request is too large.");
  }
  const formData = await new Response(bytes, {
    headers: { "Content-Type": contentType },
  }).formData();
  const file = formData.get("file");
  const rawPurpose = formData.get("purpose");
  if (!(file instanceof File)) {
    throw new ManagementApiError(400, "invalid_field", "A file field is required.");
  }
  const purpose: ManagementMediaPurpose = rawPurpose === "daily" ? "daily" : "post";
  return { file, purpose };
}

async function dispatch(
  request: Request,
  method: string,
  path: string[],
  body: Record<string, unknown>
): Promise<DispatchResult> {
  const url = new URL(request.url);
  const [resource, id, child, childId] = path;

  if (method === "GET" && (!resource || (resource === "status" && !id))) {
    return { data: await getManagementStatus() };
  }
  if (method === "GET" && resource === "posts" && !id) {
    return { data: await listManagedPosts(url) };
  }
  if (method === "POST" && resource === "posts" && !id) {
    const post = await createManagedPost(body);
    return {
      data: post,
      status: 201,
      audit: {
        action: "create",
        resourceType: "post",
        resourceId: post.id,
        summary: mutationSummary(body),
      },
    };
  }
  if (resource === "posts" && id && !child) {
    const postId = getPositiveInteger(id, "post id");
    if (method === "GET") return { data: await getManagedPost(postId) };
    if (method === "PATCH") {
      const post = await updateManagedPost(postId, body);
      return {
        data: post,
        audit: {
          action: "update",
          resourceType: "post",
          resourceId: postId,
          summary: mutationSummary(body),
        },
      };
    }
    if (method === "DELETE") {
      requireDeleteConfirmation(request, "post", postId);
      return {
        data: await deleteManagedPost(postId),
        audit: { action: "delete", resourceType: "post", resourceId: postId },
      };
    }
  }

  if (method === "GET" && resource === "daily" && !id) {
    return { data: await listManagedDaily(url) };
  }
  if (method === "POST" && resource === "daily" && !id) {
    const entry = await createManagedDaily(body);
    return {
      data: entry,
      status: 201,
      audit: {
        action: "create",
        resourceType: "daily",
        resourceId: entry.id,
        summary: mutationSummary(body),
      },
    };
  }
  if (resource === "daily" && id && !child) {
    const entryId = getPositiveInteger(id, "daily id");
    if (method === "GET") return { data: await getManagedDaily(entryId) };
    if (method === "PATCH") {
      const entry = await updateManagedDaily(entryId, body);
      return {
        data: entry,
        audit: {
          action: "update",
          resourceType: "daily",
          resourceId: entryId,
          summary: mutationSummary(body),
        },
      };
    }
    if (method === "DELETE") {
      requireDeleteConfirmation(request, "daily", entryId);
      return {
        data: await deleteManagedDaily(entryId),
        audit: { action: "delete", resourceType: "daily", resourceId: entryId },
      };
    }
  }

  if (resource === "about" && !id) {
    if (method === "GET") return { data: await getManagedAbout() };
    if (method === "PUT") {
      return {
        data: await updateManagedAbout(body),
        audit: {
          action: "update",
          resourceType: "about",
          resourceId: "about",
          summary: mutationSummary(body),
        },
      };
    }
  }
  if (method === "GET" && resource === "taxonomy" && !id) {
    return { data: await getManagedTaxonomy() };
  }
  if (method === "POST" && resource === "categories" && !id) {
    const category = await createManagedCategory(body);
    return {
      data: category,
      status: 201,
      audit: { action: "create", resourceType: "category", resourceId: category.id },
    };
  }
  if (method === "DELETE" && resource === "categories" && id && !child) {
    const categoryId = getPositiveInteger(id, "category id");
    requireDeleteConfirmation(request, "category", categoryId);
    return {
      data: await deleteManagedCategory(categoryId),
      audit: { action: "delete", resourceType: "category", resourceId: categoryId },
    };
  }
  if (method === "DELETE" && resource === "tags" && id && !child) {
    const tagId = getPositiveInteger(id, "tag id");
    requireDeleteConfirmation(request, "tag", tagId);
    return {
      data: await deleteManagedTag(tagId),
      audit: { action: "delete", resourceType: "tag", resourceId: tagId },
    };
  }

  if (method === "GET" && resource === "comments" && !id) {
    return { data: await listManagedComments(url) };
  }
  if (resource === "comments" && id && !child) {
    const commentId = getPositiveInteger(id, "comment id");
    if (method === "PATCH") {
      return {
        data: await updateManagedComment(commentId, body),
        audit: {
          action: "moderate",
          resourceType: "comment",
          resourceId: commentId,
          summary: mutationSummary(body),
        },
      };
    }
    if (method === "DELETE") {
      requireDeleteConfirmation(request, "comment", commentId);
      return {
        data: await deleteManagedComment(commentId),
        audit: { action: "delete", resourceType: "comment", resourceId: commentId },
      };
    }
  }

  if (method === "GET" && resource === "users" && !id) {
    return { data: await listManagedUsers(url) };
  }
  if (resource === "users" && id && !child) {
    const userId = getPositiveInteger(id, "user id");
    if (method === "GET") {
      return { data: await getManagedUser(userId) };
    }
    if (method === "PATCH") {
      return {
        data: await updateManagedUser(userId, body),
        audit: {
          action: "update-access",
          resourceType: "user",
          resourceId: userId,
          summary: mutationSummary(body),
        },
      };
    }
  }

  if (method === "GET" && resource === "books" && !id) {
    return { data: await listManagedBooks(url) };
  }
  if (resource === "books" && id) {
    const sourceId = decodeSegment(id, "book source id");
    if (!child && method === "GET") return { data: await getManagedBook(sourceId) };
    if (!child && method === "PATCH") {
      return {
        data: await updateManagedBook(sourceId, body),
        audit: {
          action: "update",
          resourceType: "book",
          resourceId: sourceId,
          summary: mutationSummary(body),
        },
      };
    }
    if (child === "notes" && !childId && method === "POST") {
      const note = await createManagedBookNote(sourceId, body);
      return {
        data: note,
        status: 201,
        audit: {
          action: "create-note",
          resourceType: "book",
          resourceId: sourceId,
          summary: mutationSummary(body),
        },
      };
    }
    if (child === "notes" && childId && method === "DELETE") {
      const noteId = decodeSegment(childId, "book note id");
      requireDeleteConfirmation(request, "book-note", noteId);
      return {
        data: await deleteManagedBookNote(sourceId, noteId),
        audit: {
          action: "delete-note",
          resourceType: "book",
          resourceId: sourceId,
          summary: { noteId },
        },
      };
    }
  }
  if (method === "POST" && resource === "reading" && id === "sync" && !child) {
    return {
      data: await syncManagedWeread(),
      audit: { action: "sync", resourceType: "reading", resourceId: "weread" },
    };
  }

  if (method === "POST" && resource === "media" && !id) {
    const { file, purpose } = await readMediaRequest(request);
    const media = await saveManagementImage(file, purpose);
    return {
      data: media,
      status: 201,
      audit: {
        action: "upload",
        resourceType: "media",
        resourceId: media.url,
        summary: { purpose, mimeType: media.mimeType, size: media.size },
      },
    };
  }
  if (method === "GET" && resource === "audit" && !id) {
    return { data: { items: await getManagementAuditLogs(getLimit(url.searchParams.get("limit"), 50, 200)) } };
  }
  if (resource === "backups" && !id) {
    if (method === "GET") return { data: { items: await listManagementBackups() } };
    if (method === "POST") {
      const label = optionalString(body, "label", 40, { nullable: true });
      const backup = await createManagementBackup(label);
      return {
        data: backup,
        status: 201,
        audit: { action: "create", resourceType: "database-backup", resourceId: backup.name },
      };
    }
  }

  throw new ManagementApiError(404, "not_found", "Management endpoint not found.");
}

async function handle(request: Request, context: RouteContext) {
  let principal: ManagementPrincipal | null = null;
  let requestId = request.headers.get("x-request-id")?.trim().slice(0, 80) || randomUUID();
  const method = request.method.toUpperCase();
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  let path: string[] = [];
  let audit: DispatchResult["audit"];

  try {
    principal = authenticateManagementRequest(request);
    requestId = principal.requestId;
    enforceManagementRateLimit(principal.actor);
    path = (await context.params).path ?? [];

    const isMedia = method === "POST" && path[0] === "media";
    const parsed = mutation && !isMedia ? await readManagementJson(request) : { raw: "", value: {} };
    const pathname = `/${path.join("/")}`;
    const idempotencyKey = mutation && !isMedia ? readIdempotencyKey(request) : null;
    const requestHash = hashManagementRequest(method, pathname, parsed.raw);

    if (idempotencyKey) {
      const cached = await getIdempotentResponse(principal.actor, idempotencyKey, requestHash);
      if (cached) {
        return json(cached.body, cached.status, { "X-Idempotent-Replay": "true" });
      }
    }

    const result = await dispatch(request, method, path, parsed.value);
    audit = result.audit;
    const status = result.status ?? 200;
    const responseBody = { ok: true, data: result.data, requestId };

    if (idempotencyKey) {
      try {
        await storeIdempotentResponse({
          actor: principal.actor,
          key: idempotencyKey,
          method,
          path: pathname,
          requestHash,
          status,
          body: responseBody,
        });
      } catch (idempotencyError) {
        console.error("Unable to store management idempotency result", idempotencyError);
      }
    }
    if (audit) {
      try {
        await recordManagementAudit({
          ...audit,
          actor: principal.actor,
          requestId,
          status: "success",
        });
      } catch (auditError) {
        console.error("Unable to record management audit success", auditError);
      }
    }

    return json(responseBody, status);
  } catch (error) {
    if (!(error instanceof ManagementApiError)) {
      console.error("Management API request failed", { requestId, method, path, error });
    }
    const response = errorResponsePayload(error, requestId);
    if (principal && mutation) {
      try {
        await recordManagementAudit({
          requestId,
          actor: principal.actor,
          action: audit?.action ?? method.toLowerCase(),
          resourceType: audit?.resourceType ?? path[0] ?? "unknown",
          resourceId: audit?.resourceId ?? path[1] ?? null,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (auditError) {
        console.error("Unable to record management audit failure", auditError);
      }
    }
    return json(response.body, response.status);
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
