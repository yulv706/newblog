import type { NavLinkKey } from "@/lib/i18n/config";

export const NAV_LINKS = [
  { href: "/", key: "home", label: "Home", requiresAuth: false },
  { href: "/blog", key: "blog", label: "Blog", requiresAuth: false },
  { href: "/daily", key: "daily", label: "Daily", requiresAuth: true },
  { href: "/books", key: "books", label: "Books", requiresAuth: false },
  { href: "/games", key: "games", label: "Games", requiresAuth: true },
  { href: "/about", key: "about", label: "About", requiresAuth: false },
] as const satisfies readonly {
  href: string;
  key: NavLinkKey;
  label: string;
  requiresAuth: boolean;
}[];

export type NavLink = (typeof NAV_LINKS)[number];
