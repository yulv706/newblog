import { renderMarkdownToHtml } from "@/lib/markdown";
import { getAboutContentForPublic } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AboutPage() {
  const content = await getAboutContentForPublic();
  const html = await renderMarkdownToHtml(content);

  return (
    <article className="py-12">
      <section
        className="prose max-w-none prose-neutral dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
