"use server";

import { revalidatePath } from "next/cache";
import { approveComment, createPendingComment, deleteComment } from "@/lib/comments";

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
  const postId = parseIntegerField(formData, "postId");
  const postSlug = parseStringField(formData, "postSlug").trim();

  if (!postId) {
    return {
      status: "error",
      message: "Unable to submit comment for this post.",
      errors: {},
    };
  }

  const result = await createPendingComment({
    postId,
    nickname: parseStringField(formData, "nickname"),
    email: parseStringField(formData, "email"),
    body: parseStringField(formData, "body"),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.errors.form ?? "Please fix the highlighted fields.",
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
    message: "Thanks! Your comment is pending approval.",
    errors: {},
  };
}

export async function approveCommentAction(formData: FormData) {
  const commentId = parseIntegerField(formData, "commentId");
  const postSlug = parseStringField(formData, "postSlug").trim();
  if (!commentId) {
    return;
  }

  await approveComment(commentId);
  revalidateCommentRelatedPaths(postSlug || undefined);
}

export async function deleteCommentAction(formData: FormData) {
  const commentId = parseIntegerField(formData, "commentId");
  const postSlug = parseStringField(formData, "postSlug").trim();
  if (!commentId) {
    return;
  }

  await deleteComment(commentId);
  revalidateCommentRelatedPaths(postSlug || undefined);
}
