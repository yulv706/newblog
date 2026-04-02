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
![[Pasted image 20260316162343.png]]
![[assets/diagram.svg]]
![Remote](https://example.com/x.png)
![Absolute](/uploads/images/keep.png)
`;

    expect(detectLocalImageReferences(markdown)).toEqual([
      "./images/a.png",
      "images/b.jpg",
      "../img/c.webp",
      "Pasted image 20260316162343.png",
      "assets/diagram.svg",
    ]);
    expect(isLocalImageReference("https://example.com/x.png")).toBe(false);
    expect(isLocalImageReference("./images/a.png")).toBe(true);
    expect(isLocalImageReference("Pasted image 20260316162343.png")).toBe(true);
  });

  it("rewrites local references to uploaded URLs while preserving network URLs", () => {
    const markdown = `
![A](./images/a.png)
![B](images/b.jpg)
![[Pasted image 20260316162343.png]]
![Remote](https://example.com/x.png)
`;
    const references = detectLocalImageReferences(markdown);
    const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
      references,
      {
        "a.png": "/uploads/images/a-1.png",
        "b.jpg": "/uploads/images/b-1.jpg",
        "pasted image 20260316162343.png":
          "/uploads/images/pasted-image-20260316162343.png",
      }
    );

    expect(unmatchedReferences).toEqual([]);
    const rewritten = rewriteMarkdownImageReferences(markdown, replacements);
    expect(rewritten).toContain("![A](/uploads/images/a-1.png)");
    expect(rewritten).toContain("![B](/uploads/images/b-1.jpg)");
    expect(rewritten).toContain(
      "![[/uploads/images/pasted-image-20260316162343.png]]"
    );
    expect(rewritten).toContain("![Remote](https://example.com/x.png)");
  });

  it("keeps unmatched Obsidian wiki-image references identifiable", () => {
    const markdown = `
![[Pasted image 20260316162343.png]]
![[Nested/Sketch 1.webp]]
`;
    const references = detectLocalImageReferences(markdown);
    const { replacements, unmatchedReferences } = buildImageReferenceReplacements(
      references,
      {
        "pasted image 20260316162343.png": "/uploads/images/pasted-image.png",
      }
    );

    expect(replacements).toEqual({
      "Pasted image 20260316162343.png": "/uploads/images/pasted-image.png",
    });
    expect(unmatchedReferences).toEqual(["Nested/Sketch 1.webp"]);

    const rewritten = rewriteMarkdownImageReferences(markdown, replacements);
    expect(rewritten).toContain("![[/uploads/images/pasted-image.png]]");
    expect(rewritten).toContain("![[Nested/Sketch 1.webp]]");
  });
});
