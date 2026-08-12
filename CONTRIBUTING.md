# Contributing

## Development setup

1. Install Node.js 20+ and Python 3.11+.
2. Run `npm ci`.
3. Copy `deploy/.env.production.example` to a local environment file and use
   test values. Never use production credentials in tests or pull requests.
4. Run `npm run typecheck`, `npm test`, and
   `python -m unittest discover -s scripts/tests -p 'test_*.py'` before opening a
   pull request.

## Changes involving integrations

Keep external services optional in local development. Tests must use fixtures,
mock SMTP or API requests, and example domains. Do not add real email
addresses, API keys, cookies, Docker socket paths, server addresses, or private
content to source, screenshots, logs, documentation, or test data.

Changes to the Hermes bridge should update both the bridge tests and the
corresponding documentation under `docs/` or `integrations/hermes/`. Preserve
the private Docker-network boundary and the separate token scope for private
notes.

## Pull requests

Describe the user-visible behavior, migration impact, deployment requirements,
and verification commands. Keep unrelated personal content and generated
artifacts out of the change.
