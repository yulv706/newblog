export const ADMIN_SIDEBAR_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/categories", label: "Categories/Tags" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/about", label: "About" },
] as const;

export function isAdminPathActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
