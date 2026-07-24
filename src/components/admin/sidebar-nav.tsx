"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { ADMIN_SIDEBAR_LINKS, isAdminPathActive } from "@/lib/admin/navigation";
import { getDailyCopy } from "@/lib/daily-copy";
import { getAccountCopy } from "@/lib/account-copy";
import { getSystemHealthCopy } from "@/lib/system-health-copy";
import { cn } from "@/lib/utils";

export function AdminSidebarNav() {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const { dictionary, locale } = useLocaleContext();
  const sidebarDictionary = dictionary.admin;

  const localizedLabels = {
    Dashboard: sidebarDictionary.dashboard.title,
    Posts: sidebarDictionary.posts.title,
    "Categories/Tags": sidebarDictionary.categories.title,
    Comments: sidebarDictionary.comments.title,
    Users: getAccountCopy(locale).adminUsers.title,
    Daily: getDailyCopy(locale).admin.title,
    Books: sidebarDictionary.books.title,
    About: sidebarDictionary.about.title,
    System: getSystemHealthCopy(locale).title,
  } as const;

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [pathname]);

  return (
    <nav
      aria-label={dictionary.admin.sidebar.title}
      className="flex min-w-0 flex-1 gap-1 overflow-x-auto lg:mt-4 lg:grid lg:gap-2"
    >
      {ADMIN_SIDEBAR_LINKS.map((link) => {
        const isActive = isAdminPathActive(pathname, link.href);

        return (
          <Link
            ref={isActive ? activeLinkRef : undefined}
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition",
              isActive
                ? "bg-secondary text-foreground ring-border/70 shadow-xs ring-1"
                : "text-muted hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="font-medium">{localizedLabels[link.label] ?? link.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "bg-primary h-1.5 w-1.5 rounded-full transition-opacity",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
