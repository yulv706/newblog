# User Testing

Testing surface discovery, required tools, and resource cost classification.

---

## Validation Surface

### Primary Surface: Published deployment web surface (`agent-browser`)
- Public homepage through nginx
- Admin login and protected admin reachability through nginx
- Media-backed content and restored content through the published URL
- Fresh deploy / redeploy / restore operator journeys that require end-to-end browser confirmation

### Secondary Surface: Deployment/runtime HTTP checks (`curl`)
- Readiness/health endpoint
- Homepage status/header smoke
- `robots.txt`
- `sitemap.xml`
- `/uploads/...` static file delivery
- Protected admin session endpoint behavior

### Operator automation surface (`curl` + shell)
- Canonical deployment entrypoints: `check`, `init`, `start`, `update`, `backup`, `restore`
- Docker Compose config/build/start/stop behavior
- Backup artifact inspection and restore verification
- Negative-path diagnostics for bad config, missing data, and startup failures

## Required Tools

| Tool | Purpose | Setup Notes |
|------|---------|-------------|
| `agent-browser` | Published-site browser validation | Use for homepage/admin/write-path/restore checks through the published deployment URL |
| `curl` | HTTP smoke and readiness/proxy checks | Use for health, sitemap, robots, uploads, and failure-path verification |
| Docker CLI | Deployment/runtime validation | Use committed deployment entrypoints plus Docker Compose state/log checks |

## Validation Concurrency

### agent-browser
- **Machine:** 20 CPU cores, ~7.8 GB RAM total, ~6.3 GB available during planning
- **Per-instance cost assumption:** ~300-500 MB plus the running deployment stack
- **Dry-run status:** current compose dry run was blocked by a build failure before the stack reached serving state
- **Usable headroom (70%):** ~4.4 GB
- **Max concurrent:** 1
- **Rationale:** This mission validates a Dockerized runtime plus browser flows on a relatively small-memory machine. Fresh deploy/redeploy/restore checks also mutate shared persisted state, so conservative serial execution is required.

### curl
- Negligible resource cost, but should usually run serially with deployment mutations to keep evidence easy to interpret.

### Shell / Docker validation
- **Max concurrent:** 1
- **Rationale:** compose startup, backup, restore, and failure-path diagnostics all mutate shared local state and should be executed one at a time.

## Validation Guidance

- Use the mission-approved validation port `8080` for the published stack unless a feature explicitly changes the canonical port contract.
- Prefer the committed deployment entrypoints over raw compose commands once the scripts exist.
- Fresh deploy, redeploy, backup, and restore validations should use isolated state snapshots or carefully reset local persistence between runs.
- For browser validation, always verify through the published nginx URL, not the internal app port.
- When validating recovery, prove a known content item and a known uploaded asset after restore; do not rely only on command success.
- When validating bad-config or startup-failure behavior, capture the failing command, exit status, and the relevant compose/service logs.

## Dry-Run Readiness Notes

- Planning dry run confirmed Docker and Compose are available.
- Planning dry run also found the current deployment chain blocked by a production build/type error, so successful published-site validation depends on workers first restoring buildable state.
- Once the build blocker is fixed, the intended validation path is:
  1. run canonical `check/init/start`
  2. verify readiness with `curl`
  3. verify published site and admin flows with `agent-browser`
  4. exercise backup/restore flows serially
