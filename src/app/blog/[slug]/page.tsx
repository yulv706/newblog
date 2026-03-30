import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlockEnhancer } from "@/components/blog/code-block-enhancer";
import { PostPaginationNav } from "@/components/blog/post-pagination-nav";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { extractTableOfContents, renderPostMarkdownToHtml } from "@/lib/markdown";
import { getAdjacentPublishedPosts, getPublishedPostDetailBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "—";
  }

  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedPostDetailBySlug(slug);

  if (!post) {
    notFound();
  }

  const [html, tocHeadings, adjacentPosts] = await Promise.all([
    renderPostMarkdownToHtml(post.content),
    Promise.resolve(extractTableOfContents(post.content)),
    getAdjacentPublishedPosts(post.id),
  ]);

  return (
    <div className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <article className="min-w-0 space-y-8">
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
              {post.category ? (
                <>
                  <span>•</span>
                  <Link
                    href={`/blog?category=${post.category.slug}`}
                    className="rounded-full border border-border/70 px-2.5 py-1 transition hover:border-primary/40 hover:text-foreground"
                  >
                    {post.category.name}
                  </Link>
                </>
              ) : null}
              {post.tags.length > 0 ? (
                <>
                  <span>•</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={`/blog?tag=${tag.slug}`}
                        className="rounded-full border border-border/70 px-2.5 py-1 transition hover:border-primary/40 hover:text-foreground"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </header>

          {post.coverImage ? (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
              <img
                src={post.coverImage}
                alt={`${post.title} cover image`}
                className="h-auto max-h-[460px] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="lg:hidden">
            <TableOfContents headings={tocHeadings} collapsible />
          </div>

          <section
            id="blog-post-content"
            className="prose markdown-prose max-w-none prose-neutral dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <CodeBlockEnhancer containerId="blog-post-content" />

          <PostPaginationNav previous={adjacentPosts.previous} next={adjacentPosts.next} />
        </article>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <TableOfContents headings={tocHeadings} />
        </aside>
      </div>
    </div>
  );
}
