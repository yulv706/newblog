import type { AppLocale } from "@/lib/i18n/config";

export const SITE_NAME = "Tech Blog";
export const DEFAULT_SITE_DESCRIPTION =
  "Practical insights on modern web engineering, frontend architecture, and production-ready full-stack development.";
export const LOCALIZED_SITE_NAMES: Record<AppLocale, string> = {
  "zh-CN": "技术博客",
  en: "Tech Blog",
};
export const LOCALIZED_SITE_DESCRIPTIONS: Record<AppLocale, string> = {
  "zh-CN": "聚焦现代 Web 工程、前端架构与可用于生产的全栈开发实践洞察。",
  en: DEFAULT_SITE_DESCRIPTION,
};
export const LOCALE_OG_MAP: Record<AppLocale, string> = {
  "zh-CN": "zh_CN",
  en: "en_US",
};

const DEFAULT_SITE_URL = "http://localhost:8080";

export type SeoPostEntry = {
  title: string;
  slug: string;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  coverImage?: string | null;
};

type LocalizedMetadataInput = {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  type?: "website" | "article";
};

type RssFeedOptions = {
  locale?: AppLocale;
  siteTitle?: string;
  siteDescription?: string;
  language?: string;
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

export function getLocalizedSiteName(locale: AppLocale) {
  return LOCALIZED_SITE_NAMES[locale];
}

export function getLocalizedSiteDescription(locale: AppLocale) {
  return LOCALIZED_SITE_DESCRIPTIONS[locale];
}

export function buildLocalizedMetadataAlternates(pathname: string) {
  const url = getAbsoluteUrl(pathname);

  return {
    canonical: url,
    languages: {
      "zh-CN": url,
      en: url,
      "x-default": url,
    },
  };
}

export function buildLocalizedMetadataFields(
  locale: AppLocale,
  input: LocalizedMetadataInput
) {
  const siteName = getLocalizedSiteName(locale);
  const url = getAbsoluteUrl(input.path);

  return {
    title: {
      absolute: `${input.title} | ${siteName}`,
    },
    description: input.description,
    alternates: buildLocalizedMetadataAlternates(input.path),
    openGraph: {
      type: input.type ?? "website",
      siteName,
      locale: LOCALE_OG_MAP[locale],
      title: input.title,
      description: input.description,
      url,
      images: [
        {
          url: resolveOgImageUrl(input.imageUrl),
        },
      ],
    },
  };
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

export function buildRssFeedXml(posts: SeoPostEntry[], options: RssFeedOptions = {}) {
  const locale = options.locale ?? "en";
  const siteTitle = options.siteTitle ?? getLocalizedSiteName(locale);
  const siteDescription = options.siteDescription ?? getLocalizedSiteDescription(locale);
  const language = options.language ?? (locale === "zh-CN" ? "zh-CN" : "en-US");
  const feedLink = getAbsoluteUrl("/feed.xml");
  const siteLink = getAbsoluteUrl("/");
  const lastBuildDate = posts[0]
    ? toRssPubDate(posts[0].updatedAt || posts[0].publishedAt || posts[0].createdAt)
    : toRssPubDate(new Date().toISOString());

  const itemsXml = posts
    .map((post) => {
      const postUrl = getAbsoluteUrl(`/blog/${post.slug}`);
      const description = buildMetaDescription(post.excerpt, `${post.title} — ${siteTitle}`, 500);
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
    `<title>${escapeXml(siteTitle)}</title>`,
    `<link>${escapeXml(siteLink)}</link>`,
    `<description>${escapeXml(siteDescription)}</description>`,
    `<atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`,
    `<language>${escapeXml(language)}</language>`,
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
