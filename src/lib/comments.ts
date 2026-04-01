import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";

type CommentDatabase = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete"
>;

export type CommentValidationErrors = {
  nickname?: string;
  email?: string;
  body?: string;
  form?: string;
};

export type CreatePendingCommentInput = {
  postId: number;
  nickname: string;
  email: string;
  body: string;
};

type CommentMessageCatalog = {
  nicknameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  bodyRequired: string;
  bodyTooLongTemplate: string;
  onlyPublished: string;
  submitFailed: string;
};

export type CommentMessageOverrides = Partial<CommentMessageCatalog>;

export type CreatePendingCommentResult =
  | {
      ok: true;
      commentId: number;
    }
  | {
      ok: false;
      errors: CommentValidationErrors;
    };

export type ApprovedComment = {
  id: number;
  nickname: string;
  body: string;
  createdAt: string;
};

export type PendingAdminComment = {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  nickname: string;
  email: string;
  body: string;
  createdAt: string;
};

export type ApprovedAdminComment = PendingAdminComment;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_MAX_LENGTH = 60;
const COMMENT_BODY_MAX_LENGTH = 10_000;
const AVATAR_COLOR_VARIANTS = [
  "bg-pink-500/15 text-pink-700 dark:text-pink-200",
  "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  "bg-violet-500/15 text-violet-700 dark:text-violet-200",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200",
] as const;

const DEFAULT_COMMENT_MESSAGES: CommentMessageCatalog = {
  nicknameRequired: "Nickname is required.",
  emailRequired: "Email is required.",
  emailInvalid: "Please enter a valid email address.",
  bodyRequired: "Comment body is required.",
  bodyTooLongTemplate: `Comment must be ${COMMENT_BODY_MAX_LENGTH} characters or fewer.`,
  onlyPublished: "Comments can only be submitted to published posts.",
  submitFailed: "Unable to submit comment. Please try again.",
};

function toCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10) || 0;
  }

  return 0;
}

function hashString(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function sanitizeNickname(rawNickname: string) {
  return rawNickname
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH);
}

export function sanitizeCommentBody(rawBody: string) {
  return rawBody
    .replace(/\r\n?/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function resolveCommentMessages(
  overrides: CommentMessageOverrides = {}
): CommentMessageCatalog {
  return {
    ...DEFAULT_COMMENT_MESSAGES,
    ...overrides,
  };
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function validateCommentInput(
  input: CreatePendingCommentInput,
  messages: CommentMessageCatalog
): CommentValidationErrors {
  const errors: CommentValidationErrors = {};
  const nickname = sanitizeNickname(input.nickname);
  const email = input.email.trim();
  const body = sanitizeCommentBody(input.body);

  if (!nickname) {
    errors.nickname = messages.nicknameRequired;
  }

  if (!email) {
    errors.email = messages.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = messages.emailInvalid;
  }

  if (!body) {
    errors.body = messages.bodyRequired;
  } else if (body.length > COMMENT_BODY_MAX_LENGTH) {
    errors.body = interpolateTemplate(messages.bodyTooLongTemplate, {
      max: COMMENT_BODY_MAX_LENGTH,
    });
  }

  return errors;
}

function hasValidationErrors(errors: CommentValidationErrors) {
  return Object.values(errors).some(Boolean);
}

export async function createPendingComment(
  input: CreatePendingCommentInput,
  database: CommentDatabase = db,
  messageOverrides: CommentMessageOverrides = {}
): Promise<CreatePendingCommentResult> {
  const messages = resolveCommentMessages(messageOverrides);
  const validationErrors = validateCommentInput(input, messages);
  if (hasValidationErrors(validationErrors)) {
    return {
      ok: false,
      errors: validationErrors,
    };
  }

  const post = database
    .select({
      id: posts.id,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, input.postId))
    .get();

  if (!post || post.status !== "published") {
    return {
      ok: false,
      errors: {
        form: messages.onlyPublished,
      },
    };
  }

  const inserted = database
    .insert(comments)
    .values({
      postId: input.postId,
      nickname: sanitizeNickname(input.nickname),
      email: input.email.trim().toLowerCase(),
      body: sanitizeCommentBody(input.body),
      approved: false,
    })
    .returning({ id: comments.id })
    .get();

  if (!inserted) {
    return {
      ok: false,
      errors: {
        form: messages.submitFailed,
      },
    };
  }

  return {
    ok: true,
    commentId: inserted.id,
  };
}

export async function getApprovedCommentsForPost(
  postId: number,
  database: CommentDatabase = db
): Promise<ApprovedComment[]> {
  const rows = database
    .select({
      id: comments.id,
      nickname: comments.nickname,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.approved, true)))
    .orderBy(asc(comments.createdAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    nickname: sanitizeNickname(row.nickname) || "Anonymous",
    body: sanitizeCommentBody(row.body),
    createdAt: row.createdAt,
  }));
}

export async function getPendingCommentsForAdmin(
  database: CommentDatabase = db
): Promise<PendingAdminComment[]> {
  const rows = database
    .select({
      id: comments.id,
      postId: comments.postId,
      postTitle: posts.title,
      postSlug: posts.slug,
      nickname: comments.nickname,
      email: comments.email,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.approved, false))
    .orderBy(asc(comments.createdAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    postTitle: row.postTitle,
    postSlug: row.postSlug,
    nickname: sanitizeNickname(row.nickname) || "Anonymous",
    email: row.email,
    body: sanitizeCommentBody(row.body),
    createdAt: row.createdAt,
  }));
}

export async function getApprovedCommentsForAdmin(
  database: CommentDatabase = db,
  limit = 30
): Promise<ApprovedAdminComment[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const rows = database
    .select({
      id: comments.id,
      postId: comments.postId,
      postTitle: posts.title,
      postSlug: posts.slug,
      nickname: comments.nickname,
      email: comments.email,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.approved, true))
    .orderBy(asc(comments.createdAt))
    .limit(safeLimit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    postTitle: row.postTitle,
    postSlug: row.postSlug,
    nickname: sanitizeNickname(row.nickname) || "Anonymous",
    email: row.email,
    body: sanitizeCommentBody(row.body),
    createdAt: row.createdAt,
  }));
}

export async function approveComment(
  commentId: number,
  database: CommentDatabase = db
) {
  const result = database
    .update(comments)
    .set({
      approved: true,
    })
    .where(eq(comments.id, commentId))
    .run();

  return result.changes > 0;
}

export async function deleteComment(
  commentId: number,
  database: CommentDatabase = db
) {
  const result = database.delete(comments).where(eq(comments.id, commentId)).run();
  return result.changes > 0;
}

export async function getApprovedCommentCountForPost(
  postId: number,
  database: CommentDatabase = db
) {
  return toCount(
    database
      .select({ count: count() })
      .from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.approved, true)))
      .get()?.count
  );
}

export function getCommentAvatarPlaceholder(nickname: string) {
  const normalizedNickname = sanitizeNickname(nickname) || "?";
  const initial = Array.from(normalizedNickname)[0]?.toUpperCase() ?? "?";
  const variantIndex = hashString(normalizedNickname) % AVATAR_COLOR_VARIANTS.length;

  return {
    label: initial,
    className: AVATAR_COLOR_VARIANTS[variantIndex],
  };
}

export function formatCommentTimestamp(
  dateString: string,
  locale = "en-US",
  unknownDateLabel = "Unknown date"
) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return unknownDateLabel;
  }

  return date.toLocaleString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
