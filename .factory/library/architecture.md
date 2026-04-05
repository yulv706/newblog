# Architecture

How the deployment system for this blog should work.

**What belongs here:** runtime topology, persistence model, deployment/data-flow invariants, and how operator automation should interact with the app.
**What does NOT belong here:** exact command syntax (use `.factory/services.yaml`) or user-facing procedures (use the deployment docs/scripts).

---

## System Topology

This project is a single-repo, single-host deployment:

- **Next.js app container**
  - Serves the application on internal port `3000`
  - Reads/writes the SQLite database under `./data`
  - Reads/writes uploaded files under `./public/uploads`
  - Runs database migrations before serving production traffic
- **Nginx container**
  - Publishes the public HTTP port
  - Proxies dynamic traffic to the app container
  - Serves uploaded files directly from the mounted uploads directory
- **Host persistence**
  - `./data` is the authoritative database persistence root
  - `./public/uploads` is the authoritative uploaded-media persistence root

## Application Runtime Model

- The web app is a Next.js 15 App Router application.
- Public pages, admin pages, RSS/sitemap/robots, and auth/session endpoints are all served from the same app.
- SQLite is accessed through `better-sqlite3` + Drizzle and is required at runtime for public and admin flows.
- Uploaded media is written by the app and then served through the public proxy from the persisted uploads directory.

## Deployment Model

The mission target is a **canonical scripted operator surface** that wraps the deployment lifecycle:

- `check` / `init`
- `start` / `stop` / `update`
- `backup` / `restore`

These entrypoints should become the authoritative way to operate the stack. Docs, tests, validators, and smoke checks must all use the same entrypoints rather than ad hoc shell sequences.

### Milestone mapping

- **Milestone 1** should establish a usable deployment surface for `check`, `init`, `start`, and `update`, plus health-gated runtime behavior.
- **Milestone 2** should establish `backup` and `restore`, then align the operator documentation and end-to-end recovery flows to those same entrypoints.
- Before the canonical scripts exist, workers may use raw compose commands only as an implementation/debugging aid. The final supported workflow must be the committed canonical entrypoints.

## Data and Request Flow

### Public request flow
1. Client hits the published Nginx port.
2. Nginx proxies dynamic routes to the app container.
3. The app serves SSR/route-handler responses and queries SQLite as needed.
4. Generated absolute URLs must use the configured public site URL, not localhost fallbacks.

### Upload/media flow
1. Authenticated admin writes content and uploads files through the app.
2. The app writes uploaded bytes to `./public/uploads/images/...`.
3. Public requests for `/uploads/...` are served directly by Nginx from the persisted uploads mount.
4. Media-backed content must survive restart, redeploy, backup, and restore.

### Backup/restore flow
1. Backup captures the restorable database state plus uploaded media.
2. Restore places those artifacts back into the persisted host paths.
3. Startup reuses restored state and applies forward migrations if needed.
4. Restore must not silently degrade into a fresh empty site that looks successful.

## Health and Readiness Model

- Container start is not enough to declare success.
- A dedicated app-level readiness surface must represent:
  - app process is up
  - database access works
  - the stack is ready to serve real traffic
- The intended architecture is a dedicated HTTP readiness endpoint consumed by startup automation, healthchecks, and validators.
- The public start flow and container health reporting should key off this readiness surface.
- Nginx-only availability before app readiness is a failure mode to detect, not a success signal.

## Security and Configuration Invariants

- The supported deployment path must not rely on insecure placeholder defaults for auth secret, admin password, or public site URL.
- The environment source used by operator scripts must be the same source consumed by runtime startup and in-app URL/auth behavior.
- Workers should converge on a single repo-local source of truth for deployment configuration rather than separate compose-only and app-only files.
- Admin credential behavior is partly persisted in the database; deployment, backup, restore, and docs must respect that persisted source of truth.

## Persistence Invariants

- `./data` and `./public/uploads` are the only durable application-state roots in this repo.
- For this mission, treat those host-relative paths as the canonical bind-mount contract for validation and operator docs.
- Image/container rebuilds are disposable; persisted data is not.
- SQLite runs with WAL semantics in the current codebase, so backup/recovery tooling must produce a restoreable SQLite-consistent state.
- Validators should prove recovery with actual restored content, not only archive listings.

## Design Constraints for Workers

- Prefer additive deployment hardening over architectural rewrites.
- Keep the deployment target single-host and Docker-friendly.
- Use repo-committed scripts/config/docs as the operator contract.
- When a feature changes operator behavior, update the docs/scripts/tests together so validators and operators observe the same truth.
