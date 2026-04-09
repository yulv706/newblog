import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import type { Element, Root as HastRoot } from "hast";
import type { Heading, PhrasingContent, Root as MdastRoot, Text } from "mdast";
import type { Plugin } from "unified";

const OBSIDIAN_WIKI_IMAGE_PATTERN = /!\[\[([^[\]\n]+?)]]/g;

function getWikiImageAltText(reference: string) {
  const normalized = reference.split(/[?#|]/, 1)[0]?.trim() ?? reference.trim();
  const fileName = normalized.split("/").at(-1) ?? normalized;
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension || "image";
}

function buildObsidianWikiImageNodes(value: string): PhrasingContent[] | null {
  const matches = Array.from(value.matchAll(OBSIDIAN_WIKI_IMAGE_PATTERN));
  if (matches.length === 0) {
    return null;
  }

  const children: PhrasingContent[] = [];
  let cursor = 0;

  for (const match of matches) {
    const fullMatch = match[0];
    const reference = match[1]?.trim();
    const startIndex = match.index ?? -1;

    if (!fullMatch || !reference || startIndex < 0) {
      continue;
    }

    const leadingText = value.slice(cursor, startIndex);
    if (leadingText) {
      children.push({
        type: "text",
        value: leadingText,
      });
    }

    children.push({
      type: "image",
      url: reference,
      alt: getWikiImageAltText(reference),
    });

    cursor = startIndex + fullMatch.length;
  }

  const trailingText = value.slice(cursor);
  if (trailingText) {
    children.push({
      type: "text",
      value: trailingText,
    });
  }

  return children;
}

const remarkObsidianWikiImages: Plugin<[], MdastRoot> = () => {
  return (tree) => {
    visit(tree, "paragraph", (node) => {
      const nextChildren: PhrasingContent[] = [];
      let didRewrite = false;

      for (const child of node.children) {
        if (child.type !== "text") {
          nextChildren.push(child);
          continue;
        }

        const rewrittenChildren = buildObsidianWikiImageNodes((child as Text).value);
        if (!rewrittenChildren) {
          nextChildren.push(child);
          continue;
        }

        nextChildren.push(...rewrittenChildren);
        didRewrite = true;
      }

      if (!didRewrite) {
        return;
      }

      node.children = nextChildren;
    });
  };
};

export type TableOfContentsItem = {
  id: string;
  text: string;
  depth: 2 | 3;
};

export async function renderMarkdownToHtml(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkObsidianWikiImages)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown || "");

  return String(file);
}

function getElementClassNames(element: Element) {
  const className = element.properties.className;
  if (Array.isArray(className)) {
    return className.filter((value): value is string => typeof value === "string");
  }
  if (typeof className === "string") {
    return className.split(/\s+/).filter(Boolean);
  }
  return [];
}

function extractCodeLanguage(preElement: Element) {
  const directLanguage = preElement.properties["data-language"];
  if (typeof directLanguage === "string" && directLanguage.trim()) {
    return directLanguage.trim();
  }

  const codeElement = preElement.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code"
  );
  if (!codeElement) {
    return "text";
  }

  const languageClass = getElementClassNames(codeElement).find((className) =>
    className.startsWith("language-")
  );

  return languageClass?.replace("language-", "") || "text";
}

function rehypeNormalizeCodeBlocks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre") {
        return;
      }

      const language = extractCodeLanguage(node);
      node.properties.className = Array.from(
        new Set([...getElementClassNames(node), "post-code-pre"])
      );
      node.properties["data-language"] = language;
      node.properties["data-line-numbers"] = "true";
    });
  };
}

const POST_MARKDOWN_THEME = {
  light: "github-light",
  dark: "github-dark",
} as const;

export async function renderPostMarkdownToHtml(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkObsidianWikiImages)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: {
        className: ["heading-anchor"],
        ariaLabel: "Link to this section",
      },
    })
    .use(rehypePrettyCode, {
      theme: POST_MARKDOWN_THEME,
      keepBackground: false,
      defaultLang: "text",
    })
    .use(rehypeNormalizeCodeBlocks)
    .use(rehypeStringify)
    .process(markdown || "");

  return String(file);
}

export function extractTableOfContents(markdown: string): TableOfContentsItem[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkObsidianWikiImages)
    .use(remarkGfm)
    .parse(markdown || "") as MdastRoot;
  const slugger = new GithubSlugger();
  const toc: TableOfContentsItem[] = [];

  visit(tree, "heading", (node: Heading) => {
    if (node.depth !== 2 && node.depth !== 3) {
      return;
    }

    const text = toString(node).trim();
    if (!text) {
      return;
    }

    toc.push({
      id: slugger.slug(text),
      text,
      depth: node.depth,
    });
  });

  return toc;
}
