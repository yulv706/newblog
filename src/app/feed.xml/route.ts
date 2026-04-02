import { NextResponse } from "next/server";
import { getRequestI18n } from "@/lib/i18n/server";
import { getPublishedPosts } from "@/lib/posts";
import {
  buildRssFeedXml,
  getLocalizedSiteDescription,
  getLocalizedSiteName,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { locale } = await getRequestI18n();
  const publishedPosts = await getPublishedPosts();
  const xml = buildRssFeedXml(publishedPosts, {
    locale,
    siteTitle: getLocalizedSiteName(locale),
    siteDescription: getLocalizedSiteDescription(locale),
    language: locale === "zh-CN" ? "zh-CN" : "en-US",
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
