import { deleteCategoryAction, deleteTagAction } from "@/actions/categories-tags";
import { CategoryCreateForm } from "@/components/admin/category-create-form";
import {
  getAdminCategorySummaries,
  getAdminTagSummaries,
} from "@/lib/admin/category-tags";
import { getRequestI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const { dictionary } = await getRequestI18n();
  const categoriesDictionary = dictionary.admin.categories;
  const [categories, tags] = await Promise.all([
    getAdminCategorySummaries(),
    getAdminTagSummaries(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{categoriesDictionary.title}</h1>
        <p className="text-sm text-muted">{categoriesDictionary.description}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {categoriesDictionary.createHeading}
        </h2>
        <CategoryCreateForm />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {categoriesDictionary.categoriesHeading}
          </h2>
          <p className="text-sm text-muted">{categoriesDictionary.categoriesDescription}</p>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted">
            {categoriesDictionary.emptyCategories}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.nameColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.slugColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.postsColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.actionsColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{category.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{category.slug}</td>
                    <td className="px-4 py-3 text-muted">{category.postCount}</td>
                    <td className="px-4 py-3">
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="categoryId" value={category.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-secondary"
                        >
                          {categoriesDictionary.actions.delete}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {categoriesDictionary.tagsHeading}
          </h2>
          <p className="text-sm text-muted">{categoriesDictionary.tagsDescription}</p>
        </div>

        {tags.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted">
            {categoriesDictionary.emptyTags}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.nameColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.slugColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.postsColumn}</th>
                  <th className="px-4 py-3 font-medium">{categoriesDictionary.table.actionsColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {tags.map((tag) => {
                  const isInUse = tag.postCount > 0;

                  return (
                    <tr key={tag.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{tag.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{tag.slug}</td>
                      <td className="px-4 py-3 text-muted">{tag.postCount}</td>
                      <td className="px-4 py-3">
                        <form action={deleteTagAction}>
                          <input type="hidden" name="tagId" value={tag.id} />
                          <button
                            type="submit"
                            disabled={isInUse}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                          {isInUse
                            ? categoriesDictionary.actions.inUse
                            : categoriesDictionary.actions.delete}
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
      </section>
    </div>
  );
}
