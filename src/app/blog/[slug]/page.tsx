import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlockEnhancer } from "@/components/blog/code-block-enhancer";
import { CommentForm } from "@/components/blog/comment-form";
import { CommentList } from "@/components/blog/comment-list";
import { PostPaginationNav } from "@/components/blog/post-pagination-nav";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { getApprovedCommentsForPost } from "@/lib/comments";
import { extractTableOfContents, renderPostMarkdownToHtml } from "@/lib/markdown";
import { getAdjacentPublishedPosts, getPublishedPostDetailBySlug } from "@/lib/posts";
import {
  SITE_NAME,
  buildBlogPostingJsonLd,
  buildMetaDescription,
  getAbsoluteUrl,
  resolveOgImageUrl,
  serializeJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostDetailBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested post could not be found.",
    };
  }

  const description = buildMetaDescription(
    post.excerpt,
    `Read ${post.title} on ${SITE_NAME}.`
  );
  const canonicalUrl = getAbsoluteUrl(`/blog/${post.slug}`);

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: resolveOgImageUrl(post.coverImage),
        },
      ],
      publishedTime: post.publishedAt ?? post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [SITE_NAME],
    },
  };
}

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

  const [html, tocHeadings, adjacentPosts, approvedComments] = await Promise.all([
    renderPostMarkdownToHtml(post.content),
    Promise.resolve(extractTableOfContents(post.content)),
    getAdjacentPublishedPosts(post.id),
    getApprovedCommentsForPost(post.id),
  ]);
  const blogPostingJsonLd = buildBlogPostingJsonLd(post, {
    authorName: SITE_NAME,
  });

  return (
    <div className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <article className="min-w-0 space-y-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(blogPostingJsonLd),
            }}
          />
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
              <span>•</span>
              <span>
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </span>
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

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Comments
              </h2>
              <p className="text-sm text-muted">
                {post.commentCount > 0
                  ? `${post.commentCount} approved ${post.commentCount === 1 ? "comment" : "comments"}`
                  : "Comments are moderated before they appear publicly."}
              </p>
            </div>

            <CommentForm postId={post.id} postSlug={post.slug} />
            <CommentList comments={approvedComments} />
          </section>

          <PostPaginationNav previous={adjacentPosts.previous} next={adjacentPosts.next} />
        </article>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <TableOfContents headings={tocHeadings} />
        </aside>
      </div>
    </div>
  );
}
