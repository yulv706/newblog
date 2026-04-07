"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPost,
  deletePost,
  togglePostStatus,
  type PostFormInput,
  updatePost,
} from "@/lib/posts";
import {
  buildImageReferenceReplacements,
  parseMarkdownUpload,
  rewriteMarkdownImageReferences,
} from "@/lib/markdown-upload";
import { getRequestI18n } from "@/lib/i18n/server";
import { createSlug } from "@/lib/slug";

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
    date: getFieldValue(formData, "date"),
    content: getFieldValue(formData, "content"),
    excerpt: getFieldValue(formData, "excerpt"),
    categoryId: getFieldValue(formData, "categoryId"),
    tags: getFieldValue(formData, "tags"),
    coverImage: getFieldValue(formData, "coverImage"),
    status: getFieldValue(formData, "status"),
  };
}

function getValidationErrorMessage(input: PostFormInput, messages?: {
  titleRequired: string;
  slugRequired: string;
  contentRequired: string;
}) {
  if (!input.title.trim()) {
    return messages?.titleRequired ?? "Title is required.";
  }

  if (!input.slug.trim()) {
    return messages?.slugRequired ?? "Slug is required.";
  }

  if (!input.content.trim()) {
    return messages?.contentRequired ?? "Content is required.";
  }

  const normalizedCoverImage = input.coverImage.trim();
  if (
    normalizedCoverImage &&
    !normalizedCoverImage.startsWith("/") &&
    !/^https?:\/\//i.test(normalizedCoverImage)
  ) {
    return "Cover image must be an absolute http(s) URL or a root-relative path starting with '/'.";
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

export type ParseMarkdownUploadActionResult = {
  error: string | null;
  frontmatter: {
    title: string;
    date: string;
    tags: string;
    category: string;
    excerpt: string;
    coverImage: string;
  };
  content: string;
  localImageReferences: string[];
};

const EMPTY_UPLOAD_PARSE_RESULT: ParseMarkdownUploadActionResult = {
  error: null,
  frontmatter: {
    title: "",
    date: "",
    tags: "",
    category: "",
    excerpt: "",
    coverImage: "",
  },
  content: "",
  localImageReferences: [],
};

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const nameWithoutExtension = path.basename(fileName, extension);
  const safeBaseName = createSlug(nameWithoutExtension || "image");
  return {
    extension,
    safeBaseName,
  };
}

async function getUniqueUploadFileName(
  directoryPath: string,
  originalFileName: string
) {
  const { extension, safeBaseName } = sanitizeFileName(originalFileName);
  const safeExtension = extension || ".png";
  let candidate = `${safeBaseName}${safeExtension}`;
  let suffix = 1;

  while (true) {
    try {
      await fs.access(path.join(directoryPath, candidate));
      candidate = `${safeBaseName}-${suffix}${safeExtension}`;
      suffix += 1;
    } catch {
      return candidate;
    }
  }
}

export async function parseMarkdownUploadAction(
  markdownSource: string
): Promise<ParseMarkdownUploadActionResult> {
  const { dictionary } = await getRequestI18n();
  try {
    const parsed = parseMarkdownUpload(markdownSource);
    return {
      ...EMPTY_UPLOAD_PARSE_RESULT,
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      localImageReferences: parsed.localImageReferences,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : dictionary.admin.messages.parseFrontmatterFailed;

    return {
      ...EMPTY_UPLOAD_PARSE_RESULT,
      error: message,
    };
  }
}

export type UploadMarkdownImagesActionResult = {
  error: string | null;
  rewrittenContent: string;
  replacedReferences: Array<{
    reference: string;
    url: string;
  }>;
  unmatchedReferences: string[];
};

export async function uploadMarkdownImagesAction(
  formData: FormData
): Promise<UploadMarkdownImagesActionResult> {
  const { dictionary } = await getRequestI18n();
  const adminMessages = dictionary.admin.messages;
  const markdownContent = getFieldValue(formData, "markdownContent");
  const rawReferences = formData
    .getAll("localImageReference")
    .filter((value): value is string => typeof value === "string");
  const files = formData
    .getAll("imageFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!markdownContent.trim()) {
    return {
      error: adminMessages.uploadMarkdownFirst,
      rewrittenContent: markdownContent,
      replacedReferences: [],
      unmatchedReferences: rawReferences,
    };
  }

  if (rawReferences.length === 0) {
    return {
      error: adminMessages.noImageReferencesDetected,
      rewrittenContent: markdownContent,
      replacedReferences: [],
      unmatchedReferences: [],
    };
  }

  if (files.length === 0) {
    return {
      error: adminMessages.selectImagesFirst,
      rewrittenContent: markdownContent,
      replacedReferences: [],
      unmatchedReferences: rawReferences,
    };
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "images");
  await fs.mkdir(uploadDirectory, { recursive: true });

  const uploadedUrlsByFileName: Record<string, string> = {};
  for (const file of files) {
    const fileName = file.name.trim();
    if (!fileName) {
      continue;
    }

    const uniqueFileName = await getUniqueUploadFileName(uploadDirectory, fileName);
    const destinationPath = path.join(uploadDirectory, uniqueFileName);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(destinationPath, Buffer.from(bytes));

    uploadedUrlsByFileName[fileName.toLowerCase()] = `/uploads/images/${uniqueFileName}`;
  }

  const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
    rawReferences,
    uploadedUrlsByFileName
  );
  const rewrittenContent = rewriteMarkdownImageReferences(markdownContent, replacements);
  const replacedReferences = Object.entries(replacements).map(([reference, url]) => ({
    reference,
    url,
  }));

  return {
    error: null,
    rewrittenContent,
    replacedReferences,
    unmatchedReferences,
  };
}

export async function createPostAction(
  _previousState: PostFormActionState = DEFAULT_STATE,
  formData: FormData
): Promise<PostFormActionState> {
  const { dictionary } = await getRequestI18n();
  const input = readPostFormData(formData);
  const validationError = getValidationErrorMessage(input, dictionary.admin.messages);

  if (validationError) {
    return {
      error: validationError,
    };
  }

  try {
    const result = await createPost(input);
    revalidateAdminAndBlogPaths(result.slug);
  } catch (error) {
    console.error("createPostAction failed", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create post.",
    };
  }

  redirect("/admin/posts");
}

export async function updatePostAction(
  _previousState: PostFormActionState = DEFAULT_STATE,
  formData: FormData
): Promise<PostFormActionState> {
  const { dictionary } = await getRequestI18n();
  const postId = getPostId(formData);
  if (!postId) {
    return {
      error: dictionary.admin.messages.invalidPostId,
    };
  }

  const input = readPostFormData(formData);
  const validationError = getValidationErrorMessage(input, dictionary.admin.messages);

  if (validationError) {
    return {
      error: validationError,
    };
  }

  try {
    const result = await updatePost(postId, input);
    if (!result) {
      return {
        error: dictionary.admin.messages.postNotFound,
      };
    }

    revalidateAdminAndBlogPaths(result.slug);
  } catch (error) {
    console.error("updatePostAction failed", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update post.",
    };
  }

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
