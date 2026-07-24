import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MessageCircle } from "lucide-react";
import { ArticleReadingTools } from "@/components/blog/article-reading-tools";
import { CodeBlockEnhancer } from "@/components/blog/code-block-enhancer";
import { CommentForm } from "@/components/blog/comment-form";
import { CommentList } from "@/components/blog/comment-list";
import { CoverMedia } from "@/components/blog/cover-media";
import { PostPaginationNav } from "@/components/blog/post-pagination-nav";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { getApprovedCommentsForPost } from "@/lib/comments";
import { getDateLocale } from "@/lib/i18n/config";
import { getRequestI18n } from "@/lib/i18n/server";
import { extractTableOfContents, renderPostMarkdownToHtml } from "@/lib/markdown";
import { getAdjacentPublishedPosts, getPublishedPostDetailBySlug } from "@/lib/posts";
import { getReadingMetrics } from "@/lib/reading";
import {
  buildBlogPostingJsonLd,
  buildLocalizedMetadataFields,
  buildMetaDescription,
  getLocalizedSiteName,
  resolveOgImageUrl,
  serializeJsonLd,
} from "@/lib/seo";
import { getCurrentUser } from "@/lib/user-auth";

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
  const { locale } = await getRequestI18n();
  const { slug } = await params;
  const post = await getPublishedPostDetailBySlug(slug);

  if (!post) {
    return buildLocalizedMetadataFields(locale, {
      title: locale === "zh-CN" ? "文章未找到" : "Post Not Found",
      description:
        locale === "zh-CN"
          ? "请求的文章不存在。"
          : "The requested post could not be found.",
      path: `/blog/${slug}`,
      type: "article",
    });
  }

  const description = buildMetaDescription(
    post.excerpt,
    locale === "zh-CN"
      ? `阅读《${post.title}》，来自${getLocalizedSiteName(locale)}。`
      : `Read ${post.title} on ${getLocalizedSiteName(locale)}.`
  );
  const localizedMetadata = buildLocalizedMetadataFields(locale, {
    title: post.title,
    description,
    path: `/blog/${post.slug}`,
    imageUrl: post.coverImage,
    type: "article",
  });

  return {
    ...localizedMetadata,
    openGraph: {
      ...localizedMetadata.openGraph,
      images: [
        {
          url: resolveOgImageUrl(post.coverImage),
        },
      ],
      publishedTime: post.publishedAt ?? post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [getLocalizedSiteName(locale)],
    },
  };
}

function formatDate(dateString: string | null, locale: string, fallbackLabel: string) {
  if (!dateString) {
    return fallbackLabel;
  }

  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, dictionary } = await getRequestI18n();
  const dateLocale = getDateLocale(locale);
  const postDictionary = dictionary.public.post;
  const commonDictionary = dictionary.public.common;
  const { slug } = await params;
  const post = await getPublishedPostDetailBySlug(slug);

  if (!post) {
    notFound();
  }

  const [html, tocHeadings, adjacentPosts, approvedComments, viewer] = await Promise.all([
    renderPostMarkdownToHtml(post.content),
    Promise.resolve(extractTableOfContents(post.content)),
    getAdjacentPublishedPosts(post.id),
    getApprovedCommentsForPost(post.id),
    getCurrentUser(),
  ]);
  const blogPostingJsonLd = buildBlogPostingJsonLd(post, {
    authorName: getLocalizedSiteName(locale),
  });
  const publishedAt = post.publishedAt ?? post.createdAt;
  const readingMetrics = getReadingMetrics(post.content);
  const commentsLabel = interpolateTemplate(
    post.commentCount === 1
      ? postDictionary.commentsCountSingularTemplate
      : postDictionary.commentsCountPluralTemplate,
    { count: post.commentCount }
  );

  return (
    <div className="mx-auto w-full max-w-[var(--content-post-max-width)] pb-20 pt-8 sm:pb-24 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(blogPostingJsonLd),
        }}
      />

      <header className="border-b border-border/70 pb-10 sm:pb-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          {postDictionary.backToBlogLabel}
        </Link>

        <div className="mt-10 max-w-5xl space-y-6 sm:mt-12">
          <p className="font-mono text-[0.68rem] font-medium uppercase text-primary">
            {postDictionary.articleEyebrow}
          </p>
          <h1 className="max-w-5xl text-4xl font-semibold leading-[1.14] text-foreground sm:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="max-w-3xl text-base leading-8 text-muted sm:text-lg sm:leading-9">
              {post.excerpt}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-6 border-t border-border/55 pt-6 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
            <time dateTime={publishedAt}>
              {formatDate(
                publishedAt,
                dateLocale,
                commonDictionary.dateFallbackLabel
              )}
            </time>
            {post.category ? (
              <Link
                href={`/blog?category=${post.category.slug}`}
                className="font-medium text-primary outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
              >
                {post.category.name}
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} />
              {interpolateTemplate(postDictionary.readingTimeTemplate, {
                minutes: readingMetrics.minutes,
              })}
            </span>
            <a
              href="#comments"
              className="inline-flex items-center gap-1.5 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
            >
              <MessageCircle
                aria-hidden="true"
                className="h-4 w-4"
                strokeWidth={1.7}
              />
              {commentsLabel}
            </a>
          </div>

          <ArticleReadingTools
            containerId="blog-post-content"
            dictionary={{
              readingProgressLabel: postDictionary.readingProgressLabel,
              readerControlsLabel: postDictionary.readerControlsLabel,
              decreaseTextSizeLabel: postDictionary.decreaseTextSizeLabel,
              increaseTextSizeLabel: postDictionary.increaseTextSizeLabel,
              copyLinkLabel: postDictionary.copyLinkLabel,
              copiedLinkLabel: postDictionary.copiedLinkLabel,
            }}
          />
        </div>

        {post.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog?tag=${tag.slug}`}
                className="outline-none transition-colors hover:text-primary focus-visible:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <figure className="relative mt-8 aspect-[4/3] overflow-hidden rounded-lg bg-secondary shadow-[0_28px_80px_-48px_rgba(15,23,42,0.55)] sm:mt-10 sm:aspect-[16/9]">
        <CoverMedia
          src={post.coverImage}
          alt={postDictionary.coverImageAltTemplate.replace("{title}", post.title)}
          title={post.title}
          className="h-full w-full"
          fallbackClassName="h-full w-full"
          fallbackAccentClassName="inset-x-8 top-8"
          loading="eager"
        />
      </figure>

      <div className="grid min-w-0 gap-12 pt-10 lg:grid-cols-[minmax(0,72ch)_250px] lg:justify-between lg:gap-16 lg:pt-14">
        <article className="min-w-0">
          <div className="mb-8 lg:hidden">
            <TableOfContents headings={tocHeadings} collapsible />
          </div>

          <section
            id="blog-post-content"
            data-reading-size="comfortable"
            className="article-prose prose markdown-prose max-w-none prose-neutral dark:prose-invert lg:max-w-[72ch]"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <CodeBlockEnhancer containerId="blog-post-content" />

          <div className="mt-14 sm:mt-16">
            <PostPaginationNav
              previous={adjacentPosts.previous}
              next={adjacentPosts.next}
              dictionary={postDictionary.pagination}
            />
          </div>
        </article>

        <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <TableOfContents headings={tocHeadings} />
        </aside>
      </div>

      <section
        id="comments"
        className="mt-16 scroll-mt-28 border-t border-border/70 pt-10 sm:mt-20 sm:pt-12"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(12rem,0.38fr)_minmax(0,0.62fr)] lg:gap-14">
          <div className="space-y-2 lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {postDictionary.comments.heading}
            </h2>
            <p className="max-w-sm text-sm leading-7 text-muted">
              {post.commentCount > 0
                ? interpolateTemplate(
                    post.commentCount === 1
                      ? postDictionary.comments.approvedSummarySingularTemplate
                      : postDictionary.comments.approvedSummaryPluralTemplate,
                    { count: post.commentCount }
                  )
                : postDictionary.comments.moderationHint}
            </p>
          </div>

          <div className="min-w-0 space-y-8">
            <CommentForm
              postId={post.id}
              postSlug={post.slug}
              viewer={
                viewer
                  ? { displayName: viewer.displayName, email: viewer.email }
                  : null
              }
            />
            <CommentList
              comments={approvedComments}
              locale={locale}
              emptyStateLabel={postDictionary.comments.emptyState}
              unknownDateLabel={postDictionary.comments.unknownDateLabel}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
