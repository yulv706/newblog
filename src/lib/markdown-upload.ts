import matter from "gray-matter";

export type MarkdownFrontmatterFields = {
  title: string;
  date: string;
  tags: string;
  category: string;
  excerpt: string;
  coverImage: string;
};

export type ParsedMarkdownUpload = {
  frontmatter: MarkdownFrontmatterFields;
  content: string;
  localImageReferences: string[];
};

const MARKDOWN_IMAGE_REGEX =
  /!\[[^\]]*]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
const OBSIDIAN_WIKI_IMAGE_REGEX = /!\[\[([^[\]\n]+?)]]/g;
const LOCAL_IMAGE_EXTENSION_REGEX = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;

function toOptionalString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return "";
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toOptionalString(item))
      .filter(Boolean)
      .join(", ");
  }

  return toOptionalString(value);
}

function normalizeImageReference(rawReference: string) {
  const trimmed = rawReference.trim();

  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function stripQueryAndHash(value: string) {
  return value.split(/[?#]/, 1)[0] ?? value;
}

function isNetworkImageReference(reference: string) {
  return (
    /^(?:https?:)?\/\//i.test(reference) ||
    reference.startsWith("data:") ||
    reference.startsWith("mailto:") ||
    reference.startsWith("tel:") ||
    reference.startsWith("#")
  );
}

export function isLocalImageReference(reference: string) {
  if (!reference) {
    return false;
  }

  if (isNetworkImageReference(reference)) {
    return false;
  }

  if (reference.startsWith("/")) {
    return false;
  }

  const normalizedPath = stripQueryAndHash(reference).replaceAll("\\", "/");
  return LOCAL_IMAGE_EXTENSION_REGEX.test(normalizedPath);
}

export function detectLocalImageReferences(markdownContent: string) {
  const references = new Set<string>();

  for (const match of markdownContent.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const rawReference = match[1];
    if (!rawReference) {
      continue;
    }

    const normalized = normalizeImageReference(rawReference);
    if (isLocalImageReference(normalized)) {
      references.add(normalized);
    }
  }

  for (const match of markdownContent.matchAll(OBSIDIAN_WIKI_IMAGE_REGEX)) {
    const rawReference = match[1];
    if (!rawReference) {
      continue;
    }

    const normalized = normalizeImageReference(rawReference);
    if (isLocalImageReference(normalized)) {
      references.add(normalized);
    }
  }

  return Array.from(references);
}

export function parseMarkdownUpload(markdownSource: string): ParsedMarkdownUpload {
  let parsed;

  try {
    parsed = matter(markdownSource ?? "");
  } catch {
    throw new Error("Malformed frontmatter. Please check YAML syntax and try again.");
  }

  const frontmatter = parsed.data as Record<string, unknown>;

  return {
    frontmatter: {
      title: toOptionalString(frontmatter.title),
      date: toOptionalString(frontmatter.date),
      tags: normalizeTags(frontmatter.tags),
      category: toOptionalString(frontmatter.category),
      excerpt: toOptionalString(frontmatter.excerpt),
      coverImage: toOptionalString(frontmatter.coverImage),
    },
    content: parsed.content,
    localImageReferences: detectLocalImageReferences(parsed.content),
  };
}

export function buildImageReferenceReplacements(
  references: string[],
  uploadedUrlsByFileName: Record<string, string>
) {
  const replacements: Record<string, string> = {};
  const unmatchedReferences: string[] = [];

  for (const reference of references) {
    const normalizedPath = stripQueryAndHash(reference).replaceAll("\\", "/");
    const segments = normalizedPath.split("/");
    const rawName = segments[segments.length - 1] ?? "";
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName);
      } catch {
        return rawName;
      }
    })();
    const matchedUrl = uploadedUrlsByFileName[decodedName.toLowerCase()];

    if (matchedUrl) {
      replacements[reference] = matchedUrl;
    } else {
      unmatchedReferences.push(reference);
    }
  }

  return {
    replacements,
    unmatchedReferences,
  };
}

export function rewriteMarkdownImageReferences(
  markdownContent: string,
  replacements: Record<string, string>
) {
  if (Object.keys(replacements).length === 0) {
    return markdownContent;
  }

  const rewrittenMarkdownImages = markdownContent.replace(
    MARKDOWN_IMAGE_REGEX,
    (fullMatch, rawReference: string) => {
      const normalizedReference = normalizeImageReference(rawReference);
      const replacement = replacements[normalizedReference];

      if (!replacement) {
        return fullMatch;
      }

      const nextReference =
        rawReference.trim().startsWith("<") && rawReference.trim().endsWith(">")
          ? `<${replacement}>`
          : replacement;

      return fullMatch.replace(rawReference, nextReference);
    }
  );

  return rewrittenMarkdownImages.replace(
    OBSIDIAN_WIKI_IMAGE_REGEX,
    (fullMatch, rawReference: string) => {
      const normalizedReference = normalizeImageReference(rawReference);
      const replacement = replacements[normalizedReference];

      if (!replacement) {
        return fullMatch;
      }

      return `![[${replacement}]]`;
    }
  );
}
