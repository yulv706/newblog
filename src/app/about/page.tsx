import type { Metadata } from "next";
import { getRequestI18n } from "@/lib/i18n/server";
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
  const { dictionary } = await getRequestI18n();
  const aboutDictionary = dictionary.public.about;
  const content = await getAboutContentForPublic();
  const html = await renderMarkdownToHtml(content);

  return (
    <article className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {aboutDictionary.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {aboutDictionary.description}
        </p>
      </header>
      <section
        className="prose max-w-none prose-neutral dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
