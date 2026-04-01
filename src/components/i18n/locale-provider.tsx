"use client";

import { createContext, useContext } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import type { AppDictionary } from "@/lib/i18n/dictionaries";

type LocaleContextValue = {
  locale: AppLocale;
  dictionary: AppDictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = LocaleContextValue & {
  children: React.ReactNode;
};

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: LocaleProviderProps) {
  return (
    <LocaleContext.Provider value={{ locale, dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }

  return context;
}
