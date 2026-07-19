import { afterEach, describe, expect, it } from "vitest";
import packageMetadata from "../../package.json";
import { getAppVersionInfo } from "@/lib/app-version";

const originalVersion = process.env.APP_VERSION;
const originalRevision = process.env.GIT_COMMIT;
const originalBuildDate = process.env.BUILD_DATE;

afterEach(() => {
  if (originalVersion === undefined) delete process.env.APP_VERSION;
  else process.env.APP_VERSION = originalVersion;

  if (originalRevision === undefined) delete process.env.GIT_COMMIT;
  else process.env.GIT_COMMIT = originalRevision;

  if (originalBuildDate === undefined) delete process.env.BUILD_DATE;
  else process.env.BUILD_DATE = originalBuildDate;
});

describe("application version metadata", () => {
  it("falls back to the package version outside a release image", () => {
    delete process.env.APP_VERSION;
    delete process.env.GIT_COMMIT;
    delete process.env.BUILD_DATE;

    expect(getAppVersionInfo()).toEqual({
      version: packageMetadata.version,
      revision: "unknown",
      builtAt: "unknown",
    });
  });

  it("reports immutable image build metadata when provided", () => {
    process.env.APP_VERSION = "1.2.3";
    process.env.GIT_COMMIT = "0123456789abcdef";
    process.env.BUILD_DATE = "2026-07-19T00:00:00.000Z";

    expect(getAppVersionInfo()).toEqual({
      version: "1.2.3",
      revision: "0123456789abcdef",
      builtAt: "2026-07-19T00:00:00.000Z",
    });
  });
});
