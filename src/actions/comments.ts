"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import {
  approveComment,
  createPendingComment,
  deleteComment,
  type CommentMessageOverrides,
} from "@/lib/comments";
import { getAccountCopy } from "@/lib/account-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import { requireUserSession } from "@/lib/user-auth";

type CommentFieldErrors = {
  nickname?: string;
  email?: string;
  body?: string;
};

export type SubmitCommentActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  errors: CommentFieldErrors;
};

function parseIntegerField(formData: FormData, field: string) {
  const rawValue = formData.get(field);
  if (typeof rawValue !== "string") {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseStringField(formData: FormData, field: string) {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
}

function revalidateCommentRelatedPaths(postSlug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/comments");
  if (postSlug) {
    revalidatePath(`/blog/${postSlug}`);
  }
}

export async function submitCommentAction(
  _previousState: SubmitCommentActionState,
  formData: FormData
): Promise<SubmitCommentActionState> {
  const { dictionary, locale } = await getRequestI18n();
  const commentDictionary = dictionary.public.post.comments;
  const accountCommentCopy = getAccountCopy(locale).comments;
  const commentMessages: CommentMessageOverrides = {
    nicknameRequired: commentDictionary.form.messages.nicknameRequired,
    emailRequired: commentDictionary.form.messages.emailRequired,
    emailInvalid: commentDictionary.form.messages.emailInvalid,
    bodyRequired: commentDictionary.form.messages.bodyRequired,
    bodyTooLongTemplate: commentDictionary.form.messages.bodyTooLongTemplate,
    onlyPublished: commentDictionary.form.messages.onlyPublished,
    submitFailed: commentDictionary.form.messages.retry,
  };
  const postId = parseIntegerField(formData, "postId");
  const postSlug = parseStringField(formData, "postSlug").trim();

  if (!postId) {
    return {
      status: "error",
      message: commentDictionary.form.messages.invalidPost,
      errors: {},
    };
  }

  let user;
  try {
    user = await requireUserSession();
  } catch {
    return {
      status: "error",
      message: accountCommentCopy.loginRequired,
      errors: {},
    };
  }

  const result = await createPendingComment({
    postId,
    userId: user.id,
    nickname: user.displayName,
    email: user.email,
    body: parseStringField(formData, "body"),
  }, undefined, commentMessages);

  if (!result.ok) {
    return {
      status: "error",
      message: result.errors.form ?? commentDictionary.form.messages.retry,
      errors: {
        nickname: result.errors.nickname,
        email: result.errors.email,
        body: result.errors.body,
      },
    };
  }

  revalidateCommentRelatedPaths(postSlug || undefined);

  return {
    status: "success",
    message: commentDictionary.form.messages.success,
    errors: {},
  };
}

export async function approveCommentAction(formData: FormData) {
  await requireAdminSession();
  const commentId = parseIntegerField(formData, "commentId");
  const postSlug = parseStringField(formData, "postSlug").trim();
  if (!commentId) {
    return;
  }

  await approveComment(commentId);
  revalidateCommentRelatedPaths(postSlug || undefined);
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdminSession();
  const commentId = parseIntegerField(formData, "commentId");
  const postSlug = parseStringField(formData, "postSlug").trim();
  if (!commentId) {
    return;
  }

  await deleteComment(commentId);
  revalidateCommentRelatedPaths(postSlug || undefined);
}
