# Deployment

Deployment-specific knowledge for this mission.

**What belongs here:** canonical operator lifecycle, persistence rules, deployment hardening goals, and how workers should reason about bootstrap/runtime/recovery work.
**What does NOT belong here:** finalized end-user documentation text or detailed command syntax duplicated from repo scripts.

---

## Mission Deployment Target

Optimize this project for:

- single-host Linux deployment
- script-first operator workflow
- Docker/Compose as the runtime carrier
- local-disk persistence
- simple new-device bootstrap
- strong diagnostics and recovery behavior

## Canonical Operator Lifecycle

The supported deployment surface should converge on committed repo entrypoints for:

- `check`
- `init`
- `start`
- `stop`
- `update`
- `backup`
- `restore`

Docs, tests, validators, and smoke checks should use these same entrypoints.

## Current Known Risks To Eliminate

- compose/config currently allows insecure fallback values
- current deployment dry run is blocked by a production build/type failure
- there is no committed canonical deployment wrapper surface yet
- there is no dedicated health/readiness endpoint yet
- backup/restore tooling is not yet committed
- current repo docs do not provide a top-level deployment guide

## Persistence Rules

- Preserve `./data` across deploys, restarts, updates, and restores.
- Preserve `./public/uploads` across deploys, restarts, updates, and restores.
- Treat rebuilt images, containers, and `.next` output as disposable.
- Recovery validation should prove both database content and uploaded media.

## Health and Success Rules

- “Containers started” is not success.
- Success requires a documented readiness signal and a reachable published site.
- Startup should not claim success while only nginx is reachable or while the app is still migrating/booting.

## Documentation Rules

- The repo root must expose the deployment guide clearly.
- The guide must align with the canonical scripts/commands actually validated.
- Backup/restore instructions must match the persistence model and SQLite consistency reality.
