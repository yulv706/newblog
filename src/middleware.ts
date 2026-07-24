import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  USER_AUTH_COOKIE_NAME,
  verifySessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";
export const runtime = "nodejs";

function getLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL("/account/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function getUserLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL("/account/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function getUnauthorizedApiResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDailyRoute = pathname === "/daily" || pathname.startsWith("/daily/");
  const isLoginRoute = pathname.startsWith("/admin/login");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (isDailyRoute) {
    const userToken = request.cookies.get(USER_AUTH_COOKIE_NAME)?.value;
    const userSession = userToken ? await verifyUserSessionToken(userToken) : null;
    if (userSession) {
      return NextResponse.next();
    }

    return getUserLoginRedirectResponse(request);
  }

  if (isLoginRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return isAdminApiRoute ? getUnauthorizedApiResponse() : getLoginRedirectResponse(request);
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return isAdminApiRoute ? getUnauthorizedApiResponse() : getLoginRedirectResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/daily/:path*"],
};
