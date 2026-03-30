"use server";

import { revalidatePath } from "next/cache";
import { saveAboutContent } from "@/lib/site-settings";

export type AboutEditorActionState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_STATE: AboutEditorActionState = {
  error: null,
  success: null,
};

export async function saveAboutContentAction(
  _previousState: AboutEditorActionState = DEFAULT_STATE,
  formData: FormData
): Promise<AboutEditorActionState> {
  const content = formData.get("content");
  if (typeof content !== "string") {
    return {
      error: "Invalid content payload.",
      success: null,
    };
  }

  await saveAboutContent(content);
  revalidatePath("/admin/about");
  revalidatePath("/about");

  return {
    error: null,
    success: "About content saved.",
  };
}
