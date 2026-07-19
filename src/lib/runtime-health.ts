import fs from "node:fs";
import path from "node:path";
import { getAppVersionInfo, type AppVersionInfo } from "@/lib/app-version";
import { db } from "@/lib/db";

const DB_PATH = path.join(process.cwd(), "data", "blog.db");

export type RuntimeHealthResult = {
  status: "ok" | "error";
  checks: {
    app: "ok";
    database: "ok" | "error";
    persistence: "ok" | "error";
  };
  release: AppVersionInfo;
  databasePath: string;
  timestamp: string;
  reason?: string;
};

export function getRuntimeHealth(): RuntimeHealthResult {
  const release = getAppVersionInfo();

  try {
    db.run("SELECT 1");

    const dbExists = fs.existsSync(DB_PATH);
    if (!dbExists) {
      return {
        status: "error",
        checks: {
          app: "ok",
          database: "error",
          persistence: "error",
        },
        release,
        databasePath: DB_PATH,
        timestamp: new Date().toISOString(),
        reason: `Database file is missing at ${DB_PATH}`,
      };
    }

    return {
      status: "ok",
      checks: {
        app: "ok",
        database: "ok",
        persistence: "ok",
      },
      release,
      databasePath: DB_PATH,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return {
      status: "error",
      checks: {
        app: "ok",
        database: "error",
        persistence: "error",
      },
      release,
      databasePath: DB_PATH,
      timestamp: new Date().toISOString(),
      reason: message,
    };
  }
}
