import { NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_NAME,
  getLocaleCookieOptions,
  isSupportedLocale,
} from "@/lib/i18n/config";

type SetLocaleRequestBody = {
  locale?: string;
};

export async function POST(request: NextRequest) {
  let body: SetLocaleRequestBody | null = null;

  try {
    body = (await request.json()) as SetLocaleRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const requestedLocale = body?.locale;
  if (!requestedLocale || !isSupportedLocale(requestedLocale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const response = NextResponse.json({ locale: requestedLocale });
  response.cookies.set(LOCALE_COOKIE_NAME, requestedLocale, getLocaleCookieOptions());

  return response;
}
