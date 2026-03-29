"use client";

import {
  FadeIn,
  StaggeredList,
  StaggeredItem,
  CardHover,
} from "@/components/ui/animations";

const samplePosts = [
  {
    title: "Getting Started with Next.js 15",
    excerpt: "Learn the fundamentals of Next.js 15 App Router and Server Components.",
  },
  {
    title: "Tailwind CSS v4 Deep Dive",
    excerpt: "Explore the new features and improvements in Tailwind CSS v4.",
  },
  {
    title: "TypeScript Best Practices",
    excerpt: "Essential TypeScript patterns for modern web development.",
  },
  {
    title: "Building with Drizzle ORM",
    excerpt: "A comprehensive guide to using Drizzle ORM with SQLite.",
  },
];

export function AnimationDemo() {
  return (
    <>
      {/* Spacer to push content below fold for scroll testing */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Latest Posts</h2>
        <p className="mt-2 text-muted">Scroll down to see animations in action.</p>
      </section>

      <div className="mt-24" />

      {/* FadeIn demo */}
      <FadeIn className="mt-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          ✨ Fade-In Section
        </h2>
        <p className="mt-2 text-muted">
          This section fades in when scrolled into view.
        </p>
      </FadeIn>

      <div className="mt-16" />

      {/* StaggeredList + CardHover demo */}
      <FadeIn>
        <h2 className="text-2xl font-semibold tracking-tight">
          📚 Staggered Post Cards
        </h2>
        <p className="mt-2 text-muted">
          Cards appear one by one with a staggered delay. Hover to see lift effect.
        </p>
      </FadeIn>

      <StaggeredList className="mt-6 grid gap-4 sm:grid-cols-2">
        {samplePosts.map((post) => (
          <StaggeredItem key={post.title}>
            <CardHover className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground">
                {post.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
            </CardHover>
          </StaggeredItem>
        ))}
      </StaggeredList>

      <div className="mt-16" />

      {/* Another FadeIn block further down */}
      <FadeIn className="mt-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          🎯 Another Fade-In Block
        </h2>
        <p className="mt-2 text-muted">
          More content that fades in on scroll — used to verify viewport trigger.
        </p>
      </FadeIn>
    </>
  );
}
