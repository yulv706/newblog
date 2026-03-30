"use server";

import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategoryById,
  deleteTagIfUnused,
} from "@/lib/admin/category-tags";

export type CategoryFormActionState = {
  error: string | null;
  success: string | null;
};

const INITIAL_CATEGORY_FORM_STATE: CategoryFormActionState = {
  error: null,
  success: null,
};

function getFormIdValue(formData: FormData, fieldName: string) {
  const raw = formData.get(fieldName);
  if (typeof raw !== "string") {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function revalidateCategoryAndTagPaths() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/posts/new");
  revalidatePath("/blog");
}

export async function createCategoryAction(
  _previousState: CategoryFormActionState = INITIAL_CATEGORY_FORM_STATE,
  formData: FormData
): Promise<CategoryFormActionState> {
  const nameValue = formData.get("name");
  const name = typeof nameValue === "string" ? nameValue : "";

  if (!name.trim()) {
    return {
      error: "Category name is required.",
      success: null,
    };
  }

  try {
    const created = await createCategory(name);
    revalidateCategoryAndTagPaths();

    return {
      error: null,
      success: `Created category “${created.name}” (${created.slug}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create category.";

    return {
      error: message,
      success: null,
    };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const categoryId = getFormIdValue(formData, "categoryId");
  if (!categoryId) {
    return;
  }

  await deleteCategoryById(categoryId);
  revalidateCategoryAndTagPaths();
}

export async function deleteTagAction(formData: FormData) {
  const tagId = getFormIdValue(formData, "tagId");
  if (!tagId) {
    return;
  }

  await deleteTagIfUnused(tagId);
  revalidateCategoryAndTagPaths();
}
