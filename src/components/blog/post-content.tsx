"use client";

import { PendulumSwing } from "@/components/special/PendulumSwing";
import type { ContentSegment } from "@/lib/pendulum";

export function PostContent({ segments }: { segments: ContentSegment[] }) {
  return (
    <div className="space-y-6">
      {segments.map((seg, i) => {
        if (seg.type === "pendulum") {
          return (
            <div
              key={i}
              className="rounded-2xl border border-border/40 bg-card/30 p-6"
            >
              <PendulumSwing text={seg.text} />
            </div>
          );
        }
        return (
          <div
            key={i}
            className="prose markdown-prose max-w-none prose-neutral dark:prose-invert lg:max-w-[72ch]"
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        );
      })}
    </div>
  );
}
