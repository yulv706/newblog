import { notFound } from "next/navigation";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { getPublishedPostBySlug } from "@/lib/posts";

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
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const html = await renderMarkdownToHtml(post.content);

  return (
    <article className="space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          <span>•</span>
          <span>{post.categoryName ?? "Uncategorized"}</span>
          {post.tags.length > 0 ? (
            <>
              <span>•</span>
              <span>{post.tags.join(", ")}</span>
            </>
          ) : null}
        </div>
      </header>

      <section
        className="prose max-w-none prose-neutral dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
