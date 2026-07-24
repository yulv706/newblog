import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import {
  getManagedUser,
  listManagedUsers,
  updateManagedUser,
} from "@/lib/management/users";

describe("management user access", () => {
  let tempDir = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-management-users-"));
    sqlite = new Database(path.join(tempDir, "users.db"));
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
    const now = "2026-07-23T04:00:00.000Z";
    testDb
      .insert(users)
      .values([
        {
          email: "owner@example.com",
          displayName: "Owner",
          role: "admin",
          status: "active",
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          email: "reader@example.com",
          displayName: "Reader",
          role: "reader",
          status: "active",
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();
  });

  afterAll(() => {
    sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("lists and filters users without authentication secrets", async () => {
    const result = await listManagedUsers(
      new URL("http://blog-app/api/management/v1/users?role=reader"),
      testDb as never
    );

    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      email: "reader@example.com",
      role: "reader",
      status: "active",
      commentCount: 0,
    });
    expect(result.items[0]).not.toHaveProperty("codeHash");
  });

  it("reads one user and protects the last active administrator", async () => {
    const owner = testDb
      .select()
      .from(users)
      .where(eq(users.email, "owner@example.com"))
      .get();
    if (!owner) {
      throw new Error("Expected owner fixture");
    }

    await expect(getManagedUser(owner.id, testDb as never)).resolves.toMatchObject({
      role: "admin",
      status: "active",
    });
    await expect(
      updateManagedUser(
        owner.id,
        { status: "disabled", expectedUpdatedAt: owner.updatedAt },
        testDb as never
      )
    ).rejects.toMatchObject({
      status: 409,
      code: "last_active_admin",
    });
  });
});
