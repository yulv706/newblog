import type { Metadata } from "next";
import { getRequestI18n } from "@/lib/i18n/server";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { buildLocalizedMetadataFields } from "@/lib/seo";
import { getAboutContentForPublic } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dictionary } = await getRequestI18n();
  const aboutDictionary = dictionary.public.about;

  return buildLocalizedMetadataFields(locale, {
    title: aboutDictionary.title,
    description: aboutDictionary.description,
    path: "/about",
  });
}

export default async function AboutPage() {
  const { dictionary } = await getRequestI18n();
  const aboutDictionary = dictionary.public.about;
  const content = await getAboutContentForPublic();
  const html = await renderMarkdownToHtml(content);

  return (
    <article className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-8 py-8 sm:space-y-10 sm:py-12">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-border/55 bg-card/65 p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-60 w-60 rounded-full bg-primary/[0.08] blur-3xl" />
        <p className="mb-5 font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary">ABOUT / NOTES</p>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          {aboutDictionary.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {aboutDictionary.description}
        </p>
      </header>
      <section
        className="about-prose prose markdown-prose mx-auto w-full max-w-[78ch] rounded-[1.75rem] border border-border/55 bg-card/45 p-6 prose-neutral sm:p-10 lg:p-12 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
