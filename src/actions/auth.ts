"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestI18n } from "@/lib/i18n/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getUserAuthCookieOptions,
  USER_AUTH_COOKIE_NAME,
} from "@/lib/auth";

export async function logout() {
  await getRequestI18n();
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
  cookieStore.set(USER_AUTH_COOKIE_NAME, "", {
    ...getUserAuthCookieOptions(),
    maxAge: 0,
  });

  redirect("/account/login");
}
