# User Testing

Testing surface discovery, required tools, and resource cost classification.

---

## Validation Surface

### Primary Surface: Browser UI (agent-browser)
- All public pages: homepage, blog listing, post detail, about page, search
- All admin pages: login, dashboard, post management, comment moderation, category/tag management, about editor
- Interactive flows: dark mode toggle, mobile nav, animations, comment submission, markdown upload, search

### Secondary Surface: API/Feed Endpoints (curl)
- Auth API: login/logout endpoints
- RSS/Atom feed: `/feed.xml` or `/rss.xml`
- Sitemap: `/sitemap.xml`
- Robots.txt: `/robots.txt`
- SEO meta tags: HTML head inspection
- Admin API protection: unauthenticated access returns 401/403

### Deployment Surface: Docker (shell commands)
- Docker build, compose up, Nginx proxy, data persistence

## Required Tools

| Tool | Purpose | Setup Notes |
|------|---------|-------------|
| `agent-browser` | Browser UI testing | Requires `LD_LIBRARY_PATH="/home/kongyu/miniconda3/lib:$LD_LIBRARY_PATH"`; benign `libtinfo.so.6` version warning may appear |
| `curl` | API/feed/SEO endpoint testing | Available, no setup needed |
| Docker CLI | Deployment testing | Docker 29.2.0 installed |

## Validation Concurrency

### agent-browser
- **Machine:** 16GB RAM, 32 cores (i9-14900HX), ~13GB available
- **Per-instance cost:** ~300MB RAM (lightweight Next.js app)
- **Dev server cost:** ~200-400MB RAM
- **Usable headroom (70%):** ~9.1GB
- **Max concurrent:** 5 instances
- **Rationale:** 5 × 300MB = 1.5GB + 400MB server = 1.9GB, well within 9.1GB budget. CPU is not a bottleneck.

### curl
- Negligible resource cost, no concurrency limit needed

## Testing Seeds / Fixtures

Workers should create seed data as part of their implementation:
- At least 3-5 sample blog posts (with various features: code blocks, images, tables, mixed Chinese/English)
- At least 2 categories and 5+ tags
- Sample comments (both approved and pending)
- Admin user is seeded via init.sh or first-run setup

## Flow Validator Guidance: agent-browser

- Use base URL `http://localhost:3100`.
- Each flow validator must use its own browser session/profile and must not reuse other validators' session state.
- Allowed state changes are limited to browser-local state only (theme toggle, viewport size, reduced-motion preference, navigation history).
- Do not mutate shared server-side data (no admin login, no post/comment/category CRUD) for this foundation milestone validation.
- Keep checks focused on foundation assertions assigned to your group; save all artifacts under your assigned evidence directory.
- If a prerequisite page fails to load, mark impacted assertions as `blocked` with the exact failing prerequisite.
