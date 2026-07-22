import { renderDailyMarkdownToHtml } from "@/lib/markdown";

type DailyContentProps = {
  content: string;
};

export async function DailyContent({ content }: DailyContentProps) {
  const html = await renderDailyMarkdownToHtml(content);

  return (
    <div
      className="daily-markdown prose prose-neutral dark:prose-invert max-w-none text-[1rem] leading-7 sm:text-[1.03rem] sm:leading-8"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
