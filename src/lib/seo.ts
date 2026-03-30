export const SITE_NAME = "Tech Blog";
export const DEFAULT_SITE_DESCRIPTION =
  "Practical insights on modern web engineering, frontend architecture, and production-ready full-stack development.";

const DEFAULT_SITE_URL = "http://localhost:3100";

export type SeoPostEntry = {
  title: string;
  slug: string;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  coverImage?: string | null;
};

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return DEFAULT_SITE_URL;
  }

  return configured.replace(/\/+$/, "") || DEFAULT_SITE_URL;
}

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, `${getSiteUrl()}/`).toString();
}

export function resolveOgImageUrl(imageUrl?: string | null) {
  const normalized = imageUrl?.trim();
  if (!normalized) {
    return getDefaultOgImageUrl();
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const normalizedPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return getAbsoluteUrl(normalizedPath);
}

export function getDefaultOgImageUrl() {
  return getAbsoluteUrl("/og-default.svg");
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMetaDescription(
  source: string | null | undefined,
  fallback = DEFAULT_SITE_DESCRIPTION,
  maxLength = 160
) {
  const normalized = source ? stripMarkdown(source) : "";
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toRssPubDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export function toLastModifiedDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function buildRssFeedXml(posts: SeoPostEntry[]) {
  const feedLink = getAbsoluteUrl("/feed.xml");
  const siteLink = getAbsoluteUrl("/");
  const lastBuildDate = posts[0]
    ? toRssPubDate(posts[0].updatedAt || posts[0].publishedAt || posts[0].createdAt)
    : toRssPubDate(new Date().toISOString());

  const itemsXml = posts
    .map((post) => {
      const postUrl = getAbsoluteUrl(`/blog/${post.slug}`);
      const description = buildMetaDescription(post.excerpt, `${post.title} — ${SITE_NAME}`, 500);
      const pubDate = toRssPubDate(post.publishedAt ?? post.createdAt);

      return [
        "<item>",
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(postUrl)}</link>`,
        `<guid>${escapeXml(postUrl)}</guid>`,
        `<description>${escapeXml(description)}</description>`,
        `<pubDate>${escapeXml(pubDate)}</pubDate>`,
        "</item>",
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(SITE_NAME)}</title>`,
    `<link>${escapeXml(siteLink)}</link>`,
    `<description>${escapeXml(DEFAULT_SITE_DESCRIPTION)}</description>`,
    `<atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`,
    "<language>en-US</language>",
    `<lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    itemsXml,
    "</channel>",
    "</rss>",
  ].join("");
}

export function buildSitemapXml(posts: SeoPostEntry[]) {
  const generatedAt = new Date().toISOString();
  const staticEntries = ["/", "/about"];
  const staticXml = staticEntries
    .map((pathname) =>
      [
        "<url>",
        `<loc>${escapeXml(getAbsoluteUrl(pathname))}</loc>`,
        `<lastmod>${escapeXml(generatedAt)}</lastmod>`,
        "</url>",
      ].join("")
    )
    .join("");

  const postXml = posts
    .map((post) =>
      [
        "<url>",
        `<loc>${escapeXml(getAbsoluteUrl(`/blog/${post.slug}`))}</loc>`,
        `<lastmod>${escapeXml(toLastModifiedDate(post.updatedAt || post.publishedAt || post.createdAt))}</lastmod>`,
        "</url>",
      ].join("")
    )
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    staticXml,
    postXml,
    "</urlset>",
  ].join("");
}

type StructuredDataInput = Pick<
  SeoPostEntry,
  "title" | "slug" | "excerpt" | "createdAt" | "updatedAt" | "publishedAt" | "coverImage"
>;

export function buildBlogPostingJsonLd(
  post: StructuredDataInput,
  options?: {
    authorName?: string;
  }
) {
  const authorName = options?.authorName?.trim() || SITE_NAME;
  const publishedAt = post.publishedAt ?? post.createdAt;
  const url = getAbsoluteUrl(`/blog/${post.slug}`);
  const description = buildMetaDescription(post.excerpt, `${post.title} — ${SITE_NAME}`);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    datePublished: publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: authorName,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: resolveOgImageUrl(post.coverImage),
    url,
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
