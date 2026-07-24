"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { setUserStatus } from "@/lib/admin/users";

export async function setUserStatusAction(formData: FormData) {
  await requireAdminSession();
  const userId = Number.parseInt(String(formData.get("userId") ?? ""), 10);
  const status = formData.get("status");
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    (status !== "active" && status !== "disabled")
  ) {
    return;
  }

  setUserStatus(userId, status);
  revalidatePath("/admin/users");
}
