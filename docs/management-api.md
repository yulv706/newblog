# Blog Management API

The management API gives a trusted automation agent broad control over blog content without granting host, Docker, or raw database access.

## Security model

- Base path: `/api/management/v1`
- Authentication: `Authorization: Bearer <BLOG_MANAGEMENT_API_TOKEN>`
- Actor attribution: `X-Management-Actor`, normally `hermes-weixin`
- Public Nginx behavior: every `/api/management/` request returns `404`
- Intended transport: Docker's private `newblog_default` network
- Token requirement: at least 32 characters; an absent or weak token disables the API
- Mutations are audit logged without full content, credentials, or raw request bodies
- `Idempotency-Key` prevents accidental duplicate JSON mutations
- PATCH accepts `expectedUpdatedAt` and returns `409 stale_resource` on concurrent edits
- DELETE requires `X-Management-Confirm: delete:<resource>:<id>`
- Images are limited to 4 MB and validated by both MIME type and file signature

Generate a production token with a cryptographically secure source, for example:

```bash
openssl rand -hex 32
```

Store it in both the blog and Hermes environment files. Never commit it.

## Endpoints

| Method | Path | Capability |
| --- | --- | --- |
| `GET` | `/status` | Version, content counts, capabilities, safeguards |
| `GET/POST` | `/posts` | List or create posts |
| `GET/PATCH/DELETE` | `/posts/:id` | Read, update, or delete one post |
| `GET/POST` | `/daily` | List or create daily entries |
| `GET/PATCH/DELETE` | `/daily/:id` | Read, update, or delete one daily entry |
| `POST` | `/media` | Upload a `daily` or `post` image with multipart `file` and `purpose` fields |
| `GET/PUT` | `/about` | Read or replace About page Markdown |
| `GET` | `/taxonomy` | List categories and tags with usage counts |
| `POST` | `/categories` | Create a category |
| `DELETE` | `/categories/:id` | Delete a category and detach posts |
| `DELETE` | `/tags/:id` | Delete an unused tag |
| `GET` | `/comments?status=pending` | List comments for moderation |
| `PATCH/DELETE` | `/comments/:id` | Moderate or delete a comment |
| `GET` | `/books` | List synchronized and archived books |
| `GET/PATCH` | `/books/:sourceId` | Read or edit shelf metadata |
| `POST` | `/books/:sourceId/notes` | Add a manual highlight or review |
| `DELETE` | `/books/:sourceId/notes/:noteId` | Delete a book note |
| `POST` | `/reading/sync` | Run the fixed WeRead synchronization job |
| `GET/POST` | `/backups` | List or create consistent SQLite snapshots |
| `GET` | `/audit` | Review recent management mutations |

List endpoints accept bounded `page` and `limit` query parameters. Post and daily lists can filter by `status`. Book lists can filter by `status`, `visibility`, and `includeArchived`.

## Hermes MCP

The bridge is [`integrations/hermes/blog_manager_mcp.py`](../integrations/hermes/blog_manager_mcp.py). It uses Hermes Agent's bundled FastMCP runtime and exposes typed `blog_*` tools.

Example Hermes configuration:

```yaml
mcp_servers:
  blog:
    command: python
    args:
      - /opt/data/integrations/blog_manager_mcp.py
    env:
      BLOG_MANAGEMENT_API_URL: http://blog-app:3000/api/management/v1
      BLOG_MANAGEMENT_API_TOKEN: ${BLOG_MANAGEMENT_API_TOKEN}
      BLOG_MANAGEMENT_API_ACTOR: hermes-weixin
      BLOG_MANAGEMENT_MEDIA_ROOT: /opt/data
    connect_timeout: 15
    timeout: 240
    supports_parallel_tool_calls: false
```

Add `mcp-blog` to `platform_toolsets.weixin`. Keep terminal, browser, code execution, arbitrary filesystem, and Docker socket access disabled. Attach the Hermes container to the external `newblog_default` network in addition to its own network.

The companion skill is [`integrations/hermes/blog-manager-skill/SKILL.md`](../integrations/hermes/blog-manager-skill/SKILL.md).
