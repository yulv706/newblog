import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getUserAuthCookieOptions,
  signAdminSessionToken,
  signUserSessionToken,
  USER_SESSION_TTL_SECONDS,
  USER_AUTH_COOKIE_NAME,
} from "@/lib/auth";
import { getAccountCopy } from "@/lib/account-copy";
import { verifyEmailChallenge } from "@/lib/email-auth";
import { getRequestI18n } from "@/lib/i18n/server";
import { isSameOriginRequest } from "@/lib/request-security";

type RequestBody = {
  challengeId?: unknown;
  code?: unknown;
};

export async function POST(request: Request) {
  const { locale } = await getRequestI18n();
  const messages = getAccountCopy(locale).login.errors;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_request", message: messages.invalidRequest },
      { status: 403 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_request", message: messages.invalidRequest },
      { status: 400 }
    );
  }

  const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_code", message: messages.invalidCode },
      { status: 400 }
    );
  }

  const result = verifyEmailChallenge({ challengeId, code });
  if (!result.ok) {
    const messageByReason = {
      invalid_code: messages.invalidCode,
      expired_code: messages.expiredCode,
      too_many_attempts: messages.tooManyAttempts,
      disabled_user: messages.disabledUser,
    } as const;

    return NextResponse.json(
      { ...result, message: messageByReason[result.reason] },
      { status: result.reason === "disabled_user" ? 403 : 400 }
    );
  }

  const token = await signUserSessionToken(result.user.id);
  const response = NextResponse.json({
    ok: true,
    isNewUser: result.isNewUser,
    user: result.user,
  });
  response.cookies.set(USER_AUTH_COOKIE_NAME, token, getUserAuthCookieOptions());
  if (result.user.role === "admin") {
    const adminToken = await signAdminSessionToken(result.user.id, {
      expiresInSeconds: USER_SESSION_TTL_SECONDS,
    });
    response.cookies.set(AUTH_COOKIE_NAME, adminToken, {
      ...getAuthCookieOptions(),
      maxAge: USER_SESSION_TTL_SECONDS,
    });
  }
  response.headers.set("Cache-Control", "no-store");

  return response;
}
