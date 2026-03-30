import Link from "next/link";
import {
  DASHBOARD_QUICK_ACTIONS,
  getDashboardStats,
} from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUICK_ACTION_DESCRIPTIONS: Record<
  (typeof DASHBOARD_QUICK_ACTIONS)[number]["label"],
  string
> = {
  "New Post": "Jump into the post workspace and start writing.",
  "View Blog": "Open the public blog and preview published content.",
  "Manage Comments": "Review and moderate incoming comments.",
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const statCards = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      helper: "Draft + published",
    },
    {
      label: "Published Posts",
      value: stats.publishedPosts,
      helper: "Live on the public site",
    },
    {
      label: "Total Comments",
      value: stats.totalComments,
      helper: "Pending + approved",
    },
    {
      label: "Pending Comments",
      value: stats.pendingComments,
      helper: "Awaiting moderation",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted sm:text-base">
          A quick snapshot of your blog content and moderation queue.
        </p>
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
          <h2 className="text-base font-semibold tracking-tight">No data yet</h2>
          <p className="mt-2 text-sm text-muted">
            Your dashboard is ready. Create your first post to start seeing
            activity.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DASHBOARD_QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-border hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{action.label}</span>
                <span
                  aria-hidden="true"
                  className="text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground"
                >
                  →
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {QUICK_ACTION_DESCRIPTIONS[action.label]}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
