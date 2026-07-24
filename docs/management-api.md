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
| `GET` | `/users` | List registered users with role, status, and comment count |
| `GET/PATCH` | `/users/:id` | Read or update display name, role, or account status |
| `GET` | `/books` | List synchronized and archived books |
| `GET/PATCH` | `/books/:sourceId` | Read or edit shelf metadata |
| `POST` | `/books/:sourceId/notes` | Add a manual highlight or review |
| `DELETE` | `/books/:sourceId/notes/:noteId` | Delete a book note |
| `POST` | `/reading/sync` | Run the fixed WeRead synchronization job |
| `GET/POST` | `/backups` | List or create consistent SQLite snapshots |
| `GET` | `/audit` | Review recent management mutations |

List endpoints accept bounded `page` and `limit` query parameters. Post and daily lists can filter by `status`. User lists can filter by `status`, `role`, and `query`. Book lists can filter by `status`, `visibility`, and `includeArchived`.

User updates never expose authentication challenges or sessions. The API refuses to
disable or demote the final active administrator. Hermes also requires an explicit
`confirm_access_change=true` before invoking role or status changes.

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

## Registration notifications

New user creation inserts a notification into
`user_registration_notifications` in the same transaction as the user record. The
host dispatcher at
[`scripts/dispatch-registration-notifications.py`](../scripts/dispatch-registration-notifications.py)
claims each item and invokes `hermes send` for the configured Weixin DM target. A
Hermes outage does not fail registration; delivery is retried with bounded
exponential backoff.

The production service uses
[`deploy/systemd/newblog-registration-notifier.service`](../deploy/systemd/newblog-registration-notifier.service)
and a root-readable `/etc/newblog-registration-notifier.env`:

```ini
NEWBLOG_DB_PATH=/root/workspace/newblog/data/blog.db
HERMES_CONTAINER=hermes-agent
HERMES_WEIXIN_TARGET=weixin:<configured-dm-target>
NOTIFIER_POLL_SECONDS=5
NOTIFIER_CLAIM_TIMEOUT_SECONDS=300
NOTIFIER_COMMAND_TIMEOUT_SECONDS=45
```

The dispatcher needs the host Docker CLI only to run the fixed `hermes send`
command. The blog container and Hermes MCP bridge remain isolated from the Docker
socket.

## Reading briefings

[`scripts/reading-briefing.py`](../scripts/reading-briefing.py) maintains a
private snapshot of cumulative WeRead progress, reading time, and note IDs. At
18:00 Asia/Shanghai it runs the normal WeRead synchronization, compares the new
snapshot with the previous successful one, and asks Hermes for a short,
fact-bound Weixin summary. With no detected reading time, progress, status, or
note changes, the summary becomes a gentle reading reminder. A deterministic
fallback is still delivered if model generation fails.

At 23:00 Asia/Shanghai a second timer asks Hermes for a short reflection or book
recommendation informed by that day's activity. Delivery dates are persisted so
manual restarts do not duplicate messages.

Production uses these units:

- `newblog-weread-sync.service` and `newblog-weread-sync.timer`
- `newblog-evening-reading.service` and `newblog-evening-reading.timer`

Both services read the root-only `/etc/newblog-reading-briefing.env`:

```ini
NEWBLOG_DB_PATH=/root/workspace/newblog/data/blog.db
HERMES_CONTAINER=hermes-agent
HERMES_WEIXIN_TARGET=weixin:<configured-dm-target>
READING_BRIEFING_STATE_DIR=/var/lib/newblog-reading-briefing
READING_BRIEFING_SYNC_COMMAND=/root/workspace/newblog/deploy/sync-weread.sh
READING_BRIEFING_SYNC_TIMEOUT_SECONDS=1800
READING_BRIEFING_MODEL_TIMEOUT_SECONDS=240
READING_BRIEFING_SEND_TIMEOUT_SECONDS=60
```

The 18:00 report represents changes since the previous successful 18:00
snapshot, rather than claiming calendar-day precision that the upstream API
does not expose. Raw WeRead `readingTime` is used as a cumulative fallback when
`recordReadingTime` is zero.
