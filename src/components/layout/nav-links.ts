import type { NavLinkKey } from "@/lib/i18n/config";

export const NAV_LINKS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/blog", key: "blog", label: "Blog" },
  { href: "/about", key: "about", label: "About" },
] as const satisfies readonly {
  href: string;
  key: NavLinkKey;
  label: string;
}[];

export type NavLink = (typeof NAV_LINKS)[number];
