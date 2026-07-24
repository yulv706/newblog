import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getUserAuthCookieOptions,
  USER_AUTH_COOKIE_NAME,
} from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_AUTH_COOKIE_NAME, "", {
    ...getUserAuthCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
