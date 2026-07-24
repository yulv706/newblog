import { setUserStatusAction } from "@/actions/users";
import { getAccountCopy } from "@/lib/account-copy";
import { getUsersForAdmin } from "@/lib/admin/users";
import { getDateLocale } from "@/lib/i18n/config";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function AdminUsersPage() {
  const { locale } = await getRequestI18n();
  const copy = getAccountCopy(locale).adminUsers;
  const users = getUsersForAdmin();
  const dateFormatter = new Intl.DateTimeFormat(getDateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.description}</p>
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-x-auto border-y border-border/70">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-border/70">
                <th className="px-3 py-3 font-medium">{copy.nameLabel}</th>
                <th className="px-3 py-3 font-medium">{copy.statusLabel}</th>
                <th className="px-3 py-3 font-medium">{copy.commentsLabel}</th>
                <th className="px-3 py-3 font-medium">{copy.lastLoginLabel}</th>
                <th className="px-3 py-3 text-right font-medium">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((user) => {
                const isActive = user.status === "active";
                return (
                  <tr key={user.id}>
                    <td className="px-3 py-4">
                      <p className="font-medium text-foreground">
                        {user.displayName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted">{user.email}</p>
                        {user.role === "admin" ? (
                          <span className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                            {copy.administratorLabel}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          isActive
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-destructive"
                        }
                      >
                        {isActive ? copy.activeLabel : copy.disabledLabel}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-mono text-muted">
                      {user.commentCount}
                    </td>
                    <td className="px-3 py-4 text-muted">
                      {user.lastLoginAt
                        ? dateFormatter.format(new Date(user.lastLoginAt))
                        : copy.neverLabel}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={isActive ? "disabled" : "active"}
                        />
                        <button
                          type="submit"
                          className="text-muted hover:text-foreground min-h-9 rounded-md px-3 text-xs font-medium transition-colors hover:bg-secondary"
                        >
                          {isActive ? copy.disableButton : copy.enableButton}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
