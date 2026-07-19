import packageMetadata from "../../package.json";

export type AppVersionInfo = {
  version: string;
  revision: string;
  builtAt: string;
};

function readBuildValue(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

export function getAppVersionInfo(): AppVersionInfo {
  return {
    version: readBuildValue(process.env.APP_VERSION, packageMetadata.version),
    revision: readBuildValue(process.env.GIT_COMMIT, "unknown"),
    builtAt: readBuildValue(process.env.BUILD_DATE, "unknown"),
  };
}
