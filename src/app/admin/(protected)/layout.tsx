import { logout } from "@/actions/auth";
import { AdminSidebarNav } from "@/components/admin/sidebar-nav";
import { getAdminSession } from "@/lib/admin-session";
import { getRequestI18n } from "@/lib/i18n/server";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/account/login?next=/admin");
  }
  const { dictionary } = await getRequestI18n();
  const sidebarDictionary = dictionary.admin.sidebar;

  return (
    <div className="py-6 sm:py-8">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="border-border/70 bg-card flex min-w-0 items-center gap-3 rounded-lg border p-3 shadow-sm lg:sticky lg:top-20 lg:block lg:p-4">
          <h2 className="text-muted hidden px-2 text-sm font-semibold tracking-wide uppercase lg:block">
            {sidebarDictionary.title}
          </h2>

          <AdminSidebarNav />

          <form
            action={logout}
            className="border-border/60 shrink-0 border-l pl-3 lg:mt-4 lg:border-t lg:border-l-0 lg:pt-4 lg:pl-0"
          >
            <button
              type="submit"
              title={sidebarDictionary.logoutButton}
              aria-label={sidebarDictionary.logoutButton}
              className="border-border text-foreground hover:bg-secondary flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition lg:h-auto lg:w-full lg:justify-start lg:gap-2 lg:px-3 lg:py-2"
            >
              <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{sidebarDictionary.logoutButton}</span>
            </button>
          </form>
        </aside>

        <section className="border-border/70 bg-card rounded-lg border p-4 shadow-sm sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
