"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { ADMIN_SIDEBAR_LINKS, isAdminPathActive } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebarNav() {
  const pathname = usePathname();
  const { dictionary } = useLocaleContext();
  const sidebarDictionary = dictionary.admin;

  const localizedLabels = {
    Dashboard: sidebarDictionary.dashboard.title,
    Posts: sidebarDictionary.posts.title,
    "Categories/Tags": sidebarDictionary.categories.title,
    Comments: sidebarDictionary.comments.title,
    About: sidebarDictionary.about.title,
  } as const;

  return (
    <nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {ADMIN_SIDEBAR_LINKS.map((link) => {
        const isActive = isAdminPathActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
              isActive
                ? "bg-secondary text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="font-medium">
              {localizedLabels[link.label] ?? link.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
