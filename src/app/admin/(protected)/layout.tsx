import Link from "next/link";
import { logout } from "@/actions/auth";

const SIDEBAR_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/categories", label: "Categories/Tags" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/about", label: "About" },
] as const;

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="px-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Admin
          </h2>
          <nav className="mt-4 space-y-1">
            {SIDEBAR_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="mt-4 border-t border-border/60 pt-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-foreground transition hover:bg-secondary"
            >
              Logout
            </button>
          </form>
        </aside>

        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          {children}
        </section>
      </div>
    </div>
  );
}
