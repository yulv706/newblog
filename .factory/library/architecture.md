# Architecture — Personal Tech Blog

## Overview

A full-stack personal blog built with Next.js 15 (App Router) as a monolithic application. Server-rendered pages for SEO, client components only where interactivity is needed. SQLite for data persistence, filesystem for image storage.

## Components

### Web Application (Next.js 15)
- **App Router** with `src/app/` directory structure
- **Server Components** (default) for all pages — direct DB access, zero client JS
- **Client Components** (`'use client'`) only for: dark mode toggle, mobile nav menu, animations (motion), comment form, admin interactive forms, markdown editor/preview, search input
- **Server Actions** for mutations (create/edit/delete posts, approve/delete comments, upload files)
- **Route Handlers** (`src/app/api/`) for auth endpoints and any REST-like APIs
- **Middleware** (`src/middleware.ts`) for admin route protection

### Database (SQLite via Drizzle ORM)
- File: `./data/blog.db`
- WAL mode for concurrent read performance
- Tables: `posts`, `categories`, `tags`, `post_tags` (many-to-many), `comments`, `site_settings` (for About Me content and site config)
- Drizzle ORM with `better-sqlite3` driver
- Migrations via `drizzle-kit`

### Authentication
- Custom username/password auth (not NextAuth for simplicity since no OAuth initially)
- bcrypt for password hashing
- JWT stored in HttpOnly cookie
- Middleware checks JWT for `/admin/*` routes
- Single admin user (credentials from env vars or seeded in DB)

### File Storage
- Uploaded images stored in `./public/uploads/images/`
- Served statically by Next.js from `/uploads/images/`
- When markdown is uploaded with local image refs, images are uploaded separately and paths are rewritten

### Markdown Processing Pipeline
- `gray-matter` for frontmatter parsing
- `unified` → `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-pretty-code` (Shiki) → `rehype-slug` → `rehype-autolink-headings` → `rehype-stringify`
- Processed at render time in Server Components (cached by Next.js)

### Styling
- Tailwind CSS v4 with `@theme` CSS-first config
- `@tailwindcss/typography` for prose/article content
- `next-themes` for dark/light mode (system preference + manual toggle + localStorage persistence)
- `motion` (Framer Motion v12) for animations — wrapped in client components
- Apple-style design: generous whitespace, subtle animations, clean typography

## Data Flow

### Post Creation (Markdown Upload)
1. Admin uploads `.md` file + optional image files via admin UI
2. Server Action parses frontmatter (title, date, tags, category, excerpt, coverImage)
3. Detects local image references in markdown body
4. Saves uploaded images to `./public/uploads/images/`
5. Rewrites local image paths to `/uploads/images/filename`
6. Saves post record to SQLite (markdown content stored as-is)
7. On public page request: markdown is rendered to HTML via unified pipeline

### Page Rendering
1. Request hits Next.js server
2. Server Component fetches data from SQLite via Drizzle
3. Markdown content is processed through unified pipeline
4. HTML is rendered server-side and sent to client
5. Client hydrates interactive components only

### Comment Flow
1. Visitor submits comment (nickname, email, body)
2. Server Action saves with `approved: false`
3. Admin sees pending comments in moderation panel
4. Admin approves → comment becomes visible on post page
5. Comments are fetched as part of post detail Server Component

## Key Invariants
- Only published posts are visible on public pages, RSS, and sitemap
- Draft posts are accessible only in admin
- Comments require admin approval before public display
- All admin routes require valid JWT session
- Image paths in stored markdown always use web-accessible URLs (never local filesystem paths)
- SQLite DB and uploads directory must persist across deployments (Docker volumes)
