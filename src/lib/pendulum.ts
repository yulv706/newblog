import { renderPostMarkdownToHtml } from "@/lib/markdown";

export type ContentSegment =
  | { type: "html"; html: string }
  | { type: "pendulum"; text: string };

const PENDULUM_PATTERN = /:::pendulum\s*\n([\s\S]*?)\n:::/g;

export function hasPendulumContent(content: string): boolean {
  return PENDULUM_PATTERN.test(content);
}

export function extractPendulumTexts(content: string): string[] {
  const texts: string[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(PENDULUM_PATTERN);
  while ((match = pattern.exec(content)) !== null) {
    texts.push(match[1].trim());
  }
  return texts;
}

export async function parseContentSegments(
  content: string
): Promise<ContentSegment[]> {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(PENDULUM_PATTERN);

  while ((match = pattern.exec(content)) !== null) {
    // Markdown before the pendulum block
    const before = content.slice(lastIndex, match.index).trim();
    if (before) {
      const html = await renderPostMarkdownToHtml(before);
      segments.push({ type: "html", html });
    }

    // Pendulum text
    const pendulumText = match[1].trim();
    if (pendulumText) {
      segments.push({ type: "pendulum", text: pendulumText });
    }

    lastIndex = pattern.lastIndex;
  }

  // Trailing markdown
  const after = content.slice(lastIndex).trim();
  if (after) {
    const html = await renderPostMarkdownToHtml(after);
    segments.push({ type: "html", html });
  }

  return segments;
}
