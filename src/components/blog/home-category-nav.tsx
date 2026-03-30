import Link from "next/link";

type HomeCategory = {
  name: string;
  slug: string;
};

export function HomeCategoryNav({ categories }: { categories: HomeCategory[] }) {
  return (
    <aside className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Browse Categories</h2>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No categories available yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/blog?category=${encodeURIComponent(category.slug)}`}
                className="inline-flex rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
