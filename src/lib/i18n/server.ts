import { cookies } from "next/headers";
import { getDictionary } from "./dictionaries";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "./config";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return normalizeLocale(localeCookie);
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    dictionary: getDictionary(locale),
  };
}
