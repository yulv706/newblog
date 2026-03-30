"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });

  redirect("/admin/login");
}
