# Versioning and releases

## Policy

- `package.json` is the single source of truth for the application version.
- Versions follow Semantic Versioning: `MAJOR.MINOR.PATCH`.
- Git release tags use the matching `vMAJOR.MINOR.PATCH` form.
- Production images use immutable `newblog-app:MAJOR.MINOR.PATCH` or
  `newblog-app:sha-<12-character-revision>` tags. Do not deploy `latest`.
- Every release updates `CHANGELOG.md` before the version commit is created.

Use a major release for incompatible operational or data-contract changes, a minor
release for backward-compatible features, and a patch release for backward-compatible
fixes.

## Prepare a release

Start from a clean `main` branch, move the relevant changelog entries out of
`Unreleased`, and run one of:

```bash
npm version patch
npm version minor
npm version major
```

The npm lifecycle validates version consistency, runs type checking and the
cross-platform release test suite, creates the release commit, and creates the matching
Git tag. Run the complete `npm test` suite in the Linux CI or deployment environment.
Review the commit and tag before publishing.

Build immutable images from the clean tagged commit:

```bash
npm run image:build
```

The command embeds OCI labels and produces both version and revision tags. Set
`IMAGE_REPOSITORY` when publishing to a registry. A dirty build is rejected unless
`ALLOW_DIRTY_BUILD=1` is explicitly set for a non-release local preview.

## Deploy and verify

Set `APP_IMAGE` in `deploy/.env.production` to one immutable image tag, run the normal
deployment update, then verify `/healthz`. Its `release` object must match the intended
version, Git revision, and image build time.

After verification, publish the branch and release tag together:

```bash
git push origin main --follow-tags
```
