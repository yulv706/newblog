import type { NavLinkKey } from "@/lib/i18n/config";

export const NAV_LINKS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/blog", key: "blog", label: "Blog" },
  { href: "/daily", key: "daily", label: "Daily" },
  { href: "/books", key: "books", label: "Books" },
  { href: "/about", key: "about", label: "About" },
] as const satisfies readonly {
  href: string;
  key: NavLinkKey;
  label: string;
}[];

export type NavLink = (typeof NAV_LINKS)[number];
