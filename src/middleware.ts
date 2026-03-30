import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

function getLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

function getUnauthorizedApiResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/admin/login");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (isLoginRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return isAdminApiRoute
      ? getUnauthorizedApiResponse()
      : getLoginRedirectResponse(request);
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return isAdminApiRoute
      ? getUnauthorizedApiResponse()
      : getLoginRedirectResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
