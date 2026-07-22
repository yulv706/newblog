import { describe, expect, it } from "vitest";
import { renderDailyMarkdownToHtml } from "@/lib/markdown";

describe("daily markdown rendering", () => {
  it("renders compact markdown written by Hermes", async () => {
    const html = await renderDailyMarkdownToHtml(
      "**山东人的赶海**\n\n夜色一落，拎上手电就出发。\n第二行继续记录。"
    );

    expect(html).toContain("<strong>山东人的赶海</strong>");
    expect(html).toContain("<p>夜色一落，拎上手电就出发。\n第二行继续记录。</p>");
    expect(html).not.toContain("**山东人的赶海**");
  });

  it("keeps daily topics clickable without rewriting links or inline code", async () => {
    const html = await renderDailyMarkdownToHtml(
      "记录 #赶海，访问 https://example.com，保留 `#原样` 和 [#链接](/daily)。"
    );

    expect(html).toContain(
      '<a href="/daily?tag=%E8%B5%B6%E6%B5%B7" class="daily-topic-link">#赶海</a>'
    );
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noreferrer noopener">https://example.com</a>'
    );
    expect(html).toContain("<code>#原样</code>");
    expect(html).toContain('<a href="/daily">#链接</a>');
  });

  it("sanitizes executable markup", async () => {
    const html = await renderDailyMarkdownToHtml(
      "正文<script>alert('unsafe')</script>\n\n[危险链接](javascript:alert('unsafe'))"
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
});
