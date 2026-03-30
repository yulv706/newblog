import { NextResponse } from "next/server";
import { validateAdminCredentials } from "@/lib/admin-auth";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, signSessionToken } from "@/lib/auth";

const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials";

type LoginRequestBody = {
  username?: unknown;
  password?: unknown;
};

function getFieldValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const username = getFieldValue(body.username);
  const password = getFieldValue(body.password);

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const isValidCredentials = await validateAdminCredentials(username, password);

  if (!isValidCredentials) {
    return NextResponse.json(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401 }
    );
  }

  const sessionToken = await signSessionToken(username);
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, getAuthCookieOptions());

  return response;
}
