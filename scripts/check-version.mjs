import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const versions = [
  ["package.json", packageJson.version],
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
];

const invalid = versions.filter(([, version]) => !semverPattern.test(version ?? ""));
if (invalid.length > 0) {
  for (const [source, version] of invalid) {
    console.error(`[version] ${source} contains invalid SemVer: ${String(version)}`);
  }
  process.exit(1);
}

const mismatched = versions.filter(([, version]) => version !== packageJson.version);
if (mismatched.length > 0) {
  for (const [source, version] of mismatched) {
    console.error(`[version] ${source} is ${version}; expected ${packageJson.version}`);
  }
  process.exit(1);
}

const expectedTag = process.env.RELEASE_TAG?.trim();
if (expectedTag && expectedTag !== `v${packageJson.version}`) {
  console.error(`[version] RELEASE_TAG is ${expectedTag}; expected v${packageJson.version}`);
  process.exit(1);
}

console.log(`[version] ${packageJson.name} v${packageJson.version}`);
