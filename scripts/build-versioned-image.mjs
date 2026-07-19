import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stderr || "");
    }
    process.exit(result.status ?? 1);
  }

  return options.capture ? result.stdout.trim() : "";
}

run(process.execPath, [resolve("scripts/check-version.mjs")]);

const dirtyFiles = run("git", ["status", "--porcelain", "--untracked-files=normal"], {
  capture: true,
});
if (dirtyFiles && process.env.ALLOW_DIRTY_BUILD !== "1") {
  console.error("[image] Refusing to build a release image from a dirty worktree.");
  console.error(
    "[image] Commit the release first, or set ALLOW_DIRTY_BUILD=1 for a local preview."
  );
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const revision = run("git", ["rev-parse", "HEAD"], { capture: true });
const shortRevision = revision.slice(0, 12);
const builtAt = new Date().toISOString();
const repository = process.env.IMAGE_REPOSITORY?.trim() || "newblog-app";

if (!/^[a-z0-9./_-]+(?::[a-z0-9._-]+)?$/i.test(repository) || repository.includes("@")) {
  console.error(`[image] Invalid IMAGE_REPOSITORY: ${repository}`);
  process.exit(1);
}

const versionTag = `${repository}:${packageJson.version}`;
const revisionTag = `${repository}:sha-${shortRevision}`;

run("docker", [
  "build",
  "--build-arg",
  `APP_VERSION=${packageJson.version}`,
  "--build-arg",
  `GIT_COMMIT=${revision}`,
  "--build-arg",
  `BUILD_DATE=${builtAt}`,
  "--tag",
  versionTag,
  "--tag",
  revisionTag,
  ".",
]);

console.log(`[image] Built ${versionTag}`);
console.log(`[image] Built ${revisionTag}`);
console.log(`[image] Revision ${revision}`);
console.log(`[image] Created ${builtAt}`);
