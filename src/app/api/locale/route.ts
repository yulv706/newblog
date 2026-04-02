import { NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_NAME,
  getLocaleCookieOptions,
  isSupportedLocale,
  normalizeLocale,
} from "@/lib/i18n/config";
import { getRequestI18n } from "@/lib/i18n/server";

type SetLocaleRequestBody = {
  locale?: string;
};

export async function POST(request: NextRequest) {
  const { locale, dictionary } = await getRequestI18n();
  const currentLocale = normalizeLocale(locale);
  let body: SetLocaleRequestBody | null = null;

  try {
    body = (await request.json()) as SetLocaleRequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          currentLocale === "zh-CN"
            ? "请求数据格式无效。"
            : "Invalid request payload.",
      },
      { status: 400 }
    );
  }

  const requestedLocale = body?.locale;
  if (!requestedLocale || !isSupportedLocale(requestedLocale)) {
    return NextResponse.json(
      {
        error:
          currentLocale === "zh-CN" ? "不支持该语言。" : "Unsupported locale.",
      },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    locale: requestedLocale,
    message:
      requestedLocale === "zh-CN"
        ? dictionary.shell.languageSwitcher.pendingLabel
        : "Language updated.",
  });
  response.cookies.set(LOCALE_COOKIE_NAME, requestedLocale, getLocaleCookieOptions());

  return response;
}
