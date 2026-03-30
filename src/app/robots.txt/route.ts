import { NextResponse } from "next/server";
import { getAbsoluteUrl } from "@/lib/seo";

export function GET() {
  const body = [`User-agent: *`, `Allow: /`, `Sitemap: ${getAbsoluteUrl("/sitemap.xml")}`].join(
    "\n"
  );

  return new NextResponse(`${body}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
