import Link from "next/link";

type HomeCategory = {
  name: string;
  slug: string;
};

type HomeCategoryNavDictionary = {
  heading: string;
  description: string;
  emptyState: string;
};

export function HomeCategoryNav({
  categories,
  dictionary,
}: {
  categories: HomeCategory[];
  dictionary: HomeCategoryNavDictionary;
}) {
  return (
    <aside className="grid gap-5 rounded-[1.5rem] border border-border/60 bg-card/65 p-6 sm:grid-cols-[minmax(12rem,0.75fr)_minmax(0,1.25fr)] sm:items-center sm:p-8">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">{dictionary.heading}</h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.description}</p>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">{dictionary.emptyState}</p>
      ) : (
        <ul className="flex flex-wrap gap-2 sm:justify-end">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/blog?category=${encodeURIComponent(category.slug)}`}
                className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3.5 py-2 text-sm text-muted transition-[border-color,color,background-color] hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary" />
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
