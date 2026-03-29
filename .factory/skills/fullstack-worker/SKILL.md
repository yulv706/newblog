---
name: fullstack-worker
description: Implements full-stack features spanning database, API, and UI for the personal blog.
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve database schema changes, server actions, API routes, AND corresponding UI pages. Examples: authentication system, post CRUD, comment system, admin dashboard, markdown upload pipeline, image handling, Docker deployment config.

## Required Skills

- `agent-browser` — for manual verification of UI flows after implementation. Invoke when verifying forms, page rendering, navigation, and interactive features. MUST set `LD_LIBRARY_PATH="/home/kongyu/miniconda3/lib:$LD_LIBRARY_PATH"` before any browser command.

## Work Procedure

1. **Read feature description, preconditions, and expectedBehavior carefully.** Read `mission.md`, `AGENTS.md`, `.factory/library/architecture.md`, and `.factory/services.yaml` for full context.

2. **Plan the implementation.** Identify all files to create/modify: database schema, migrations, server actions, route handlers, UI components, pages. Plan the test file structure.

3. **Write failing tests first (TDD).** Create test files using Vitest. Write tests that cover the core behavior described in `expectedBehavior`. Tests MUST fail initially (red phase).

4. **Implement the feature.** Work through these layers in order:
   a. **Database:** Schema changes in `src/lib/db/schema.ts`, generate migration with `npx drizzle-kit generate`, apply with `npx drizzle-kit migrate`
   b. **Server logic:** Server actions in `src/actions/`, utility functions in `src/lib/`
   c. **API routes:** Route handlers in `src/app/api/` if needed
   d. **UI components:** In `src/components/`, following Server Component by default, `'use client'` only when needed
   e. **Pages:** In `src/app/`, using the App Router conventions

5. **Make tests pass (green phase).** Run `npx vitest run` and iterate until all new tests pass. Ensure no existing tests break.

6. **Run validators.** Execute ALL of these and fix any issues:
   - `npx tsc --noEmit` (typecheck)
   - `npm run lint` (lint)
   - `npx vitest run` (all tests)

7. **Manual verification with agent-browser.** Start the dev server (`PORT=3100 npm run dev &`), then use `agent-browser` to verify each user-facing behavior:
   - Navigate to the relevant pages
   - Test the happy path AND at least one error/edge case
   - Take screenshots as evidence
   - Record observations in handoff
   - **IMPORTANT:** Kill the dev server after verification (`lsof -ti :3100 | xargs kill -9`)

8. **Commit with descriptive message.** Stage all changes and commit.

## Example Handoff

```json
{
  "salientSummary": "Implemented admin authentication with username/password login, JWT session in HttpOnly cookie, and middleware route protection. All 6 auth tests pass, typecheck clean. Verified login flow, invalid credentials error, and admin route redirect via agent-browser.",
  "whatWasImplemented": "POST /api/auth/login with bcrypt password verification and JWT cookie. Middleware protecting /admin/* routes. Login page with form validation. Logout action clearing cookie. Session persistence across page reloads.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vitest run --reporter=verbose", "exitCode": 0, "observation": "6 tests passing: login success, invalid password, invalid username, empty fields, session persistence, logout" },
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No type errors" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to /admin/login, enter valid credentials, submit", "observed": "Redirected to /admin dashboard, session cookie set" },
      { "action": "Enter wrong password, submit", "observed": "Error message 'Invalid credentials' displayed, no redirect" },
      { "action": "Navigate to /admin without login", "observed": "Redirected to /admin/login" },
      { "action": "Refresh /admin after login", "observed": "Still on dashboard, session persisted" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/__tests__/auth.test.ts",
        "cases": [
          { "name": "login with valid credentials returns JWT cookie", "verifies": "VAL-AUTH-001" },
          { "name": "login with wrong password returns 401", "verifies": "VAL-AUTH-002" },
          { "name": "login with unknown username returns 401", "verifies": "VAL-AUTH-003" },
          { "name": "login with empty fields returns 400", "verifies": "VAL-AUTH-004" },
          { "name": "admin routes return 401 without auth", "verifies": "VAL-AUTH-007" },
          { "name": "logout clears session cookie", "verifies": "VAL-AUTH-009" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Database migration fails and cannot be resolved
- Feature depends on infrastructure not yet set up (e.g., auth required but not implemented)
- Existing bugs in code block your feature
- Requirements in feature description are ambiguous or contradictory
- Need to modify a shared schema that could affect other features
