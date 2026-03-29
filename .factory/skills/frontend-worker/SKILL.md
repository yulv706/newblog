---
name: frontend-worker
description: Implements frontend-focused features including pages, components, styling, animations, and SEO for the personal blog.
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that are primarily frontend: page layouts, component styling, animations, responsive design, markdown rendering UI, search UI, SEO meta tags, RSS/sitemap generation, dark mode, typography. May involve light server-side logic (fetching data in Server Components, generating XML feeds) but NOT database schema changes.

## Required Skills

- `agent-browser` — for manual verification of all UI features. Invoke after implementation to verify rendering, responsiveness, animations, and interactions. MUST set `LD_LIBRARY_PATH="/home/kongyu/miniconda3/lib:$LD_LIBRARY_PATH"` before any browser command.

## Work Procedure

1. **Read feature description, preconditions, and expectedBehavior carefully.** Read `mission.md`, `AGENTS.md`, `.factory/library/architecture.md`, and `.factory/services.yaml`.

2. **Plan the implementation.** Identify components, pages, and styling to create/modify. Check existing components in `src/components/` for reuse.

3. **Write failing tests first (TDD).** Create test files using Vitest. For UI components, test rendering and behavior. For SEO/RSS/sitemap, test output format. Tests MUST fail initially.

4. **Implement the feature.** Follow these principles:
   a. **Server Components by default** — only add `'use client'` for interactive parts
   b. **Push client boundaries down** — extract just the interactive part into a client component, keep the page/parent as server component
   c. **Use existing UI patterns** — check `src/components/ui/` for shadcn components, `src/lib/utils.ts` for `cn()` helper
   d. **Tailwind CSS v4** — use `@theme` tokens from `globals.css`, `@tailwindcss/typography` prose classes for blog content
   e. **Apple-style design** — generous whitespace, subtle shadows, smooth transitions, clean sans-serif typography
   f. **Animations** — use `motion` (Framer Motion) wrapped in client components. Use `[0.22, 1, 0.36, 1]` easing for Apple-feel. Keep animations < 500ms, movements < 20px.
   g. **Responsive** — mobile-first, test at 375px, 768px, 1280px
   h. **Dark mode** — ensure all new components respect dark mode (use Tailwind `dark:` variant)

5. **Make tests pass.** Run `npx vitest run` and iterate.

6. **Run validators:**
   - `npx tsc --noEmit` (typecheck)
   - `npm run lint` (lint)
   - `npx vitest run` (all tests)

7. **Manual verification with agent-browser.** Start dev server, then verify:
   - Page renders correctly at desktop (1280px) and mobile (375px)
   - Dark mode works on the new components/pages
   - Animations are smooth and subtle
   - All links and interactions work
   - No console errors
   - Take screenshots as evidence
   - **Kill dev server after verification**

8. **Commit with descriptive message.**

## Example Handoff

```json
{
  "salientSummary": "Implemented blog listing page with pagination, category/tag filtering, Apple-style card hover animations, and responsive layout. 5 tests passing, verified at desktop/mobile/dark mode via agent-browser.",
  "whatWasImplemented": "Blog listing page at /blog with paginated post cards (10 per page). Category and tag filter via URL params. Post cards with hover lift animation (motion). Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop. Dark mode support. Empty state message when no posts match filter.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vitest run --reporter=verbose", "exitCode": 0, "observation": "5 tests passing" },
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "Clean" },
      { "command": "npm run lint", "exitCode": 0, "observation": "Clean" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to /blog at 1280px desktop", "observed": "3-column grid of post cards, pagination at bottom, category sidebar visible" },
      { "action": "Navigate to /blog at 375px mobile", "observed": "Single column layout, cards stack vertically, pagination tappable" },
      { "action": "Hover over post card", "observed": "Smooth lift animation with shadow increase, returns on mouse leave" },
      { "action": "Toggle dark mode on /blog", "observed": "All cards, text, and filters switch to dark theme correctly" },
      { "action": "Click category filter 'JavaScript'", "observed": "Only JS-tagged posts shown, URL updates to /blog?category=javascript" },
      { "action": "Navigate to page with 0 results", "observed": "Empty state: 'No posts found' message displayed" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/__tests__/blog-listing.test.ts",
        "cases": [
          { "name": "renders post cards from database", "verifies": "VAL-BLOG-010" },
          { "name": "paginates when posts exceed page limit", "verifies": "VAL-BLOG-011" },
          { "name": "filters by category", "verifies": "VAL-BLOG-012" },
          { "name": "filters by tag", "verifies": "VAL-BLOG-013" },
          { "name": "shows empty state when no posts match", "verifies": "VAL-BLOG-015" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Required data/API endpoints from backend features are not available
- Design system tokens or base components are missing
- Dark mode infrastructure (next-themes) is not set up
- Animation library (motion) is not installed
- Markdown rendering pipeline is not implemented
