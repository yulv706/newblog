"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getNextLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { locale, dictionary } = useLocaleContext();
  const nextLocale = getNextLocale(locale);

  const onSwitchLocale = async () => {
    setIsPending(true);

    const response = await fetch("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    if (!response.ok) {
      setIsPending(false);
      return;
    }

    router.refresh();
    window.location.reload();
  };

  return (
    <button
      onClick={onSwitchLocale}
      className={cn(
        "inline-flex h-9 min-w-12 items-center justify-center rounded-full px-3 text-xs font-semibold",
        "text-muted transition-colors duration-[var(--duration-fast)]",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={dictionary.shell.languageSwitcher.ariaLabel}
      disabled={isPending}
      type="button"
    >
      {isPending
        ? dictionary.shell.languageSwitcher.pendingLabel
        : dictionary.shell.languageSwitcher.switchTo[locale]}
    </button>
  );
}
