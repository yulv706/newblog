import { NextResponse } from "next/server";
import { getPublishedPosts } from "@/lib/posts";
import { buildRssFeedXml } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const publishedPosts = await getPublishedPosts();
  const xml = buildRssFeedXml(publishedPosts);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
