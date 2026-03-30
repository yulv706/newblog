import type { Metadata } from "next";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { getDefaultOgImageUrl } from "@/lib/seo";
import { getAboutContentForPublic } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const aboutDescription =
  "Learn more about the author behind Tech Blog, including engineering background, interests, and writing focus.";

export const metadata: Metadata = {
  title: "About",
  description: aboutDescription,
  openGraph: {
    title: "About — Tech Blog",
    description: aboutDescription,
    url: "/about",
    images: [
      {
        url: getDefaultOgImageUrl(),
      },
    ],
  },
};

export default async function AboutPage() {
  const content = await getAboutContentForPublic();
  const html = await renderMarkdownToHtml(content);

  return (
    <article className="mx-auto w-full max-w-[var(--content-wide-max-width)] py-12">
      <section
        className="prose max-w-none prose-neutral dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
