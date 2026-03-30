import { logout } from "@/actions/auth";
import { AdminSidebarNav } from "@/components/admin/sidebar-nav";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="py-6 sm:py-8">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm lg:sticky lg:top-20">
          <h2 className="px-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Admin
          </h2>

          <AdminSidebarNav />

          <form action={logout} className="mt-4 border-t border-border/60 pt-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-foreground transition hover:bg-secondary"
            >
              Logout
            </button>
          </form>
        </aside>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
