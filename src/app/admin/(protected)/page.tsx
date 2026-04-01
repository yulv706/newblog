import Link from "next/link";
import {
  DASHBOARD_QUICK_ACTIONS,
  getDashboardStats,
} from "@/lib/admin/dashboard";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const { dictionary } = await getRequestI18n();
  const dashboardDictionary = dictionary.admin.dashboard;
  const stats = await getDashboardStats();
  const statCards = [
    {
      label: dashboardDictionary.stats.totalPostsLabel,
      value: stats.totalPosts,
      helper: dashboardDictionary.stats.totalPostsHelper,
    },
    {
      label: dashboardDictionary.stats.publishedPostsLabel,
      value: stats.publishedPosts,
      helper: dashboardDictionary.stats.publishedPostsHelper,
    },
    {
      label: dashboardDictionary.stats.totalCommentsLabel,
      value: stats.totalComments,
      helper: dashboardDictionary.stats.totalCommentsHelper,
    },
    {
      label: dashboardDictionary.stats.pendingCommentsLabel,
      value: stats.pendingComments,
      helper: dashboardDictionary.stats.pendingCommentsHelper,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dashboardDictionary.title}
        </h1>
        <p className="text-sm text-muted sm:text-base">{dashboardDictionary.description}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {statCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-border/70 bg-background/70 p-5 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-muted">{card.helper}</p>
          </article>
        ))}
      </section>

      {!stats.hasData && (
        <section className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
          <h2 className="text-base font-semibold tracking-tight">
            {dashboardDictionary.emptyStateTitle}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {dashboardDictionary.emptyStateDescription}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {dashboardDictionary.quickActionsHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DASHBOARD_QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-border hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {action.label === "New Post"
                    ? dashboardDictionary.quickActions.newPostLabel
                    : action.label === "View Blog"
                      ? dashboardDictionary.quickActions.viewBlogLabel
                      : dashboardDictionary.quickActions.manageCommentsLabel}
                </span>
                <span
                  aria-hidden="true"
                  className="text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground"
                >
                  →
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {action.label === "New Post"
                  ? dashboardDictionary.quickActions.newPostDescription
                  : action.label === "View Blog"
                    ? dashboardDictionary.quickActions.viewBlogDescription
                    : dashboardDictionary.quickActions.manageCommentsDescription}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
