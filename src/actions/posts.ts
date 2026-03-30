"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPost,
  deletePost,
  togglePostStatus,
  type PostFormInput,
  updatePost,
} from "@/lib/posts";

export type PostFormActionState = {
  error: string | null;
};

const DEFAULT_STATE: PostFormActionState = {
  error: null,
};

function getFieldValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function getPostId(formData: FormData) {
  const value = formData.get("postId");
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function readPostFormData(formData: FormData): PostFormInput {
  return {
    title: getFieldValue(formData, "title"),
    slug: getFieldValue(formData, "slug"),
    content: getFieldValue(formData, "content"),
    excerpt: getFieldValue(formData, "excerpt"),
    categoryId: getFieldValue(formData, "categoryId"),
    tags: getFieldValue(formData, "tags"),
    coverImage: getFieldValue(formData, "coverImage"),
    status: getFieldValue(formData, "status"),
  };
}

function validateFormData(input: PostFormInput) {
  if (!input.title.trim()) {
    return "Title is required.";
  }

  if (!input.slug.trim()) {
    return "Slug is required.";
  }

  if (!input.content.trim()) {
    return "Content is required.";
  }

  return null;
}

function revalidateAdminAndBlogPaths(slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/blog");

  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

export async function createPostAction(
  _previousState: PostFormActionState = DEFAULT_STATE,
  formData: FormData
): Promise<PostFormActionState> {
  const input = readPostFormData(formData);
  const validationError = validateFormData(input);

  if (validationError) {
    return {
      error: validationError,
    };
  }

  const result = await createPost(input);
  revalidateAdminAndBlogPaths(result.slug);
  redirect("/admin/posts");
}

export async function updatePostAction(
  _previousState: PostFormActionState = DEFAULT_STATE,
  formData: FormData
): Promise<PostFormActionState> {
  const postId = getPostId(formData);
  if (!postId) {
    return {
      error: "Invalid post id.",
    };
  }

  const input = readPostFormData(formData);
  const validationError = validateFormData(input);

  if (validationError) {
    return {
      error: validationError,
    };
  }

  const result = await updatePost(postId, input);
  if (!result) {
    return {
      error: "Post not found.",
    };
  }

  revalidateAdminAndBlogPaths(result.slug);
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData) {
  const postId = getPostId(formData);
  if (!postId) {
    return;
  }

  const deletedSlug = await deletePost(postId);
  revalidateAdminAndBlogPaths(deletedSlug);
}

export async function togglePostStatusAction(formData: FormData) {
  const postId = getPostId(formData);
  if (!postId) {
    return;
  }

  const result = await togglePostStatus(postId);
  revalidateAdminAndBlogPaths(result?.slug ?? null);
}
