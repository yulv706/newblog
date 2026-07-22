import { NextResponse } from "next/server";
import { getPublishedPosts } from "@/lib/posts";
import { getDailySitemapEntries } from "@/lib/daily";
import { buildSitemapXml } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [publishedPosts, dailyEntries] = await Promise.all([
    getPublishedPosts(),
    getDailySitemapEntries(),
  ]);
  const xml = buildSitemapXml(publishedPosts, dailyEntries);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
