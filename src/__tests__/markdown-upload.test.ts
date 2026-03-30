import { describe, expect, it } from "vitest";
import {
  buildImageReferenceReplacements,
  detectLocalImageReferences,
  isLocalImageReference,
  parseMarkdownUpload,
  rewriteMarkdownImageReferences,
} from "@/lib/markdown-upload";

describe("markdown upload parsing", () => {
  it("parses frontmatter fields and body content from markdown upload", () => {
    const parsed = parseMarkdownUpload(`---
title: Upload test
date: 2026-03-30
tags:
  - nextjs
  - markdown
category: Engineering
excerpt: Summary text
coverImage: https://example.com/cover.png
---

# Heading
![Local](./images/photo.png)
![Network](https://example.com/remote.png)
`);

    expect(parsed.frontmatter.title).toBe("Upload test");
    expect(parsed.frontmatter.date).toContain("2026-03-30");
    expect(parsed.frontmatter.tags).toBe("nextjs, markdown");
    expect(parsed.frontmatter.category).toBe("Engineering");
    expect(parsed.frontmatter.excerpt).toBe("Summary text");
    expect(parsed.frontmatter.coverImage).toBe("https://example.com/cover.png");
    expect(parsed.content).toContain("# Heading");
    expect(parsed.localImageReferences).toEqual(["./images/photo.png"]);
  });

  it("handles markdown with no frontmatter gracefully", () => {
    const parsed = parseMarkdownUpload("## Hello\n\nPlain content.");

    expect(parsed.frontmatter).toEqual({
      title: "",
      date: "",
      tags: "",
      category: "",
      excerpt: "",
      coverImage: "",
    });
    expect(parsed.content).toContain("## Hello");
  });

  it("throws a user-friendly error for malformed frontmatter", () => {
    expect(() =>
      parseMarkdownUpload(`---
title: "Broken
tags: [a, b]
---
content`)
    ).toThrow("Malformed frontmatter. Please check YAML syntax and try again.");
  });
});

describe("markdown upload image detection and rewriting", () => {
  it("detects relative local image references and ignores network URLs", () => {
    const markdown = `
![A](./images/a.png)
![B](images/b.jpg)
![C](../img/c.webp)
![Remote](https://example.com/x.png)
![Absolute](/uploads/images/keep.png)
`;

    expect(detectLocalImageReferences(markdown)).toEqual([
      "./images/a.png",
      "images/b.jpg",
      "../img/c.webp",
    ]);
    expect(isLocalImageReference("https://example.com/x.png")).toBe(false);
    expect(isLocalImageReference("./images/a.png")).toBe(true);
  });

  it("rewrites local references to uploaded URLs while preserving network URLs", () => {
    const markdown = `
![A](./images/a.png)
![B](images/b.jpg)
![Remote](https://example.com/x.png)
`;
    const references = detectLocalImageReferences(markdown);
    const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
      references,
      {
        "a.png": "/uploads/images/a-1.png",
        "b.jpg": "/uploads/images/b-1.jpg",
      }
    );

    expect(unmatchedReferences).toEqual([]);
    const rewritten = rewriteMarkdownImageReferences(markdown, replacements);
    expect(rewritten).toContain("![A](/uploads/images/a-1.png)");
    expect(rewritten).toContain("![B](/uploads/images/b-1.jpg)");
    expect(rewritten).toContain("![Remote](https://example.com/x.png)");
  });
});
