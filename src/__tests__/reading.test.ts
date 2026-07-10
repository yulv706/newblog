import { describe, expect, it } from "vitest";
import { getReadingMetrics } from "@/lib/reading";

describe("reading metrics", () => {
  it("estimates Chinese reading time by readable characters", () => {
    const metrics = getReadingMetrics("阅".repeat(800));

    expect(metrics.cjkCharacters).toBe(800);
    expect(metrics.minutes).toBe(2);
  });

  it("estimates English reading time by words", () => {
    const metrics = getReadingMetrics("word ".repeat(440));

    expect(metrics.words).toBe(440);
    expect(metrics.minutes).toBe(2);
  });

  it("ignores fenced code and markdown syntax", () => {
    const metrics = getReadingMetrics(`## Heading

[Readable label](https://example.com)

\`\`\`ts
${"implementation ".repeat(500)}
\`\`\``);

    expect(metrics.words).toBe(3);
    expect(metrics.minutes).toBe(1);
  });
});
