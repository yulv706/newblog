# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | Secret key for JWT signing | `openssl rand -base64 32` output |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password (hashed on first run) | `your-secure-password` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | `http://localhost:3100` |

## Platform Notes

- **WSL2 environment** on Windows (Ubuntu)
- Node.js 18.20.8 with npm 10.8.2
- Docker 29.2.0 available
- Redis on 6379 and PostgreSQL on 5432 exist but are NOT used by this project
- For agent-browser testing: must set `LD_LIBRARY_PATH="/home/kongyu/miniconda3/lib:$LD_LIBRARY_PATH"` before launching

## Database

- SQLite file at `./data/blog.db`
- No external database service needed
- WAL mode enabled for concurrent reads
- Drizzle ORM manages schema and migrations

## Dependencies Notes

- `better-sqlite3` is a native addon — requires build tools (python3, make, gcc). Usually available on WSL2.
- `shiki` downloads grammar/theme files on first use — initial build may take longer
