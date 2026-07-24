import { NextResponse } from "next/server";
import { getAccountCopy } from "@/lib/account-copy";
import { issueEmailChallenge } from "@/lib/email-auth";
import { getRequestI18n } from "@/lib/i18n/server";
import {
  getClientIpAddress,
  isSameOriginRequest,
} from "@/lib/request-security";

type RequestBody = {
  email?: unknown;
  displayName?: unknown;
};

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

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

  const result = await issueEmailChallenge({
    email: typeof body.email === "string" ? body.email : "",
    displayName:
      typeof body.displayName === "string" ? body.displayName : undefined,
    ipAddress: getClientIpAddress(request),
    locale,
  });

  if (result.ok) {
    return NextResponse.json(result);
  }

  if (result.reason === "invalid_email") {
    return NextResponse.json(
      { ...result, message: messages.invalidEmail },
      { status: 400 }
    );
  }

  if (result.reason === "rate_limited") {
    const retryAfterSeconds = result.retryAfterSeconds ?? 60;
    return NextResponse.json(
      {
        ...result,
        message: interpolate(messages.rateLimitedTemplate, {
          seconds: retryAfterSeconds,
        }),
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  return NextResponse.json(
    { ...result, message: messages.deliveryUnavailable },
    { status: 503 }
  );
}
