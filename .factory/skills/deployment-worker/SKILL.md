---
name: deployment-worker
description: Implements deployment automation, runtime hardening, persistence tooling, and operator documentation for the blog.
---

# Deployment Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for features that change deployment behavior or operator workflows: Docker/Compose configuration, health/readiness endpoints used for deployment, bootstrap/check/init/start/update scripts, backup/restore tooling, persistence safeguards, deployment validation tests, and deployment/operator documentation.

## Required Skills

- `agent-browser` — use for public-site and admin smoke checks through the published deployment URL after implementation. Invoke after the deployment stack is up and reachable.

## Work Procedure

1. Read the assigned feature plus `mission.md`, `AGENTS.md`, `.factory/library/architecture.md`, `.factory/library/environment.md`, `.factory/library/deployment.md`, `.factory/library/user-testing.md`, and `.factory/services.yaml`.
2. Identify the exact operator surface being changed: bootstrap/check/init/start/update, runtime health/proxy, backup/restore, or documentation. List the committed entrypoints that must remain canonical after the feature.
3. Write failing tests first. Prefer focused Vitest coverage for scripts/config/route helpers and extend deployment/config tests when behavior is configuration-driven. If the feature changes a shell script, add or update tests that verify its observable contract where practical.
4. Implement the feature using committed repo entrypoints only. Do not rely on undocumented one-off commands in the final solution. If you add a new deployment command or script, also update the repo files that define and document canonical operator behavior.
5. Validate iteratively with the smallest relevant checks first:
   - `npx tsc --noEmit`
   - targeted `npx vitest run ...`
   - targeted `npm run build` if the feature affects production build/startup
   - `docker compose config` or the committed deployment check command when changing runtime config
6. Run the full required validators before handoff:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npx vitest run --maxWorkers=4 --reporter=verbose`
   - `npm run build`
7. Perform deployment smoke verification using the committed deployment commands, not ad hoc substitutes. At minimum verify the feature’s affected operator journey plus one adjacent failure case. When the public web surface is involved:
   - start the stack on the mission-approved validation port
   - verify readiness/health with `curl`
   - use `agent-browser` against the published URL for user-visible behavior
   - capture logs/status for any failure-path assertions
8. If the feature touches backup/restore or persistence, verify the actual artifact/restore path end-to-end; do not stop at filename inspection.
9. Stop any services/processes you started and ensure no long-running watchers or compose stacks are left behind unless the feature explicitly requires them to remain up for the next validator.
10. Commit with the worker commit message format. If `git commit` fails only because author identity is unset, retry using ephemeral env vars on the commit command rather than changing git config:
    - `GIT_AUTHOR_NAME="factory-droid[bot]"`
    - `GIT_AUTHOR_EMAIL="factory-droid[bot]@users.noreply.github.com"`
    - `GIT_COMMITTER_NAME="factory-droid[bot]"`
    - `GIT_COMMITTER_EMAIL="factory-droid[bot]@users.noreply.github.com"`
11. In the handoff, name the exact canonical commands/scripts now supported, list every validator you ran, and include concrete smoke-test observations. If docs were changed, state which operator journey they now describe.

## Example Handoff

```json
{
  "salientSummary": "Added committed deploy entrypoints for check/init/start and wired a documented `/api/health` probe into Docker Compose healthchecks. Verified secure env preflight failures, successful compose startup on port 8080, and public homepage/admin login reachability through nginx.",
  "whatWasImplemented": "Created repo-root deployment scripts for preflight validation and startup, removed insecure compose fallbacks from the supported operator path, added an app health route that checks database availability, updated compose to wait for app health before considering the stack ready, and aligned the deployment guide with the new canonical commands.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "Typecheck clean" },
      { "command": "npm run lint", "exitCode": 0, "observation": "Lint clean" },
      { "command": "npx vitest run --maxWorkers=4 --reporter=verbose", "exitCode": 0, "observation": "Deployment/config tests and full suite passing" },
      { "command": "npm run build", "exitCode": 0, "observation": "Production build succeeded" },
      { "command": "NGINX_PORT=8080 ./deploy/check.sh", "exitCode": 0, "observation": "Resolved env and prerequisites validated" },
      { "command": "NGINX_PORT=8080 ./deploy/start.sh", "exitCode": 0, "observation": "Stack reached healthy state; app and nginx running" }
    ],
    "interactiveChecks": [
      { "action": "Open http://localhost:8080/ in browser", "observed": "Homepage loaded through nginx without console errors" },
      { "action": "Open http://localhost:8080/admin/login and sign in", "observed": "Authenticated session created and admin dashboard reachable" },
      { "action": "Request http://localhost:8080/api/health with curl during startup and after healthy state", "observed": "Probe stayed non-success until DB-backed app readiness, then returned success" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/__tests__/deployment-health.test.ts",
        "cases": [
          { "name": "health endpoint returns failure when database is unavailable", "verifies": "VAL-RUNTIME-002" },
          { "name": "deployment check rejects placeholder auth secret", "verifies": "VAL-BOOTSTRAP-002" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires a deployment decision not settled in the mission artifacts (for example a new public port strategy or a different persistence model).
- The runtime/deployment surface is blocked by an external dependency you cannot restore (Docker daemon unavailable, host filesystem permissions outside the repo, missing system package access).
- You discover a contract or feature gap that needs decomposition rather than a small fix.
- The canonical operator workflow would need undocumented manual steps to succeed.
- A commit remains blocked even after retrying with ephemeral author/committer env vars.
