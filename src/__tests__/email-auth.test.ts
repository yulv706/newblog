import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import {
  emailAuthChallenges,
  userRegistrationNotifications,
  users,
} from "@/lib/db/schema";
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  issueEmailChallenge,
  verifyEmailChallenge,
} from "@/lib/email-auth";

describe("passwordless email authentication", () => {
  let tempDir = "";
  let dbPath = "";
  let sqlite: InstanceType<typeof Database>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-email-auth-test-"));
    dbPath = path.join(tempDir, "auth.test.db");
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  });

  beforeEach(() => {
    process.env.AUTH_SECRET = "email-auth-test-secret";
    testDb.delete(emailAuthChallenges).run();
    testDb.delete(userRegistrationNotifications).run();
    testDb.delete(users).run();
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("emails a hashed one-time code and creates a verified user", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const now = new Date("2026-07-23T04:00:00.000Z");
    const issued = await issueEmailChallenge(
      {
        email: " Reader@Example.com ",
        displayName: "  River  ",
        ipAddress: "127.0.0.1",
        locale: "zh-CN",
        now,
        code: "123456",
      },
      testDb as never,
      sendEmail
    );

    expect(issued.ok).toBe(true);
    if (!issued.ok) {
      throw new Error("Expected challenge to be issued");
    }
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "reader@example.com", code: "123456" })
    );

    const storedChallenge = testDb
      .select()
      .from(emailAuthChallenges)
      .where(eq(emailAuthChallenges.id, issued.challengeId))
      .get();
    expect(storedChallenge?.codeHash).not.toContain("123456");

    const verified = verifyEmailChallenge(
      {
        challengeId: issued.challengeId,
        code: "123456",
        now: new Date(now.getTime() + 30_000),
      },
      testDb as never
    );

    expect(verified.ok).toBe(true);
    if (!verified.ok) {
      throw new Error("Expected verification to succeed");
    }
    expect(verified.isNewUser).toBe(true);
    expect(verified.user).toMatchObject({
      email: "reader@example.com",
      displayName: "River",
      role: "reader",
    });
    expect(testDb.select().from(users).all()).toHaveLength(1);
    expect(testDb.select().from(userRegistrationNotifications).all()).toEqual([
      expect.objectContaining({
        userId: verified.user.id,
        email: "reader@example.com",
        displayName: "River",
        status: "pending",
        attempts: 0,
      }),
    ]);

    expect(
      verifyEmailChallenge(
        {
          challengeId: issued.challengeId,
          code: "123456",
          now: new Date(now.getTime() + 40_000),
        },
        testDb as never
      )
    ).toMatchObject({ ok: false, reason: "invalid_code" });
  });

  it("does not enqueue another registration notification for a returning user", async () => {
    const now = new Date("2026-07-23T04:00:00.000Z");
    testDb
      .insert(users)
      .values({
        email: "reader@example.com",
        displayName: "Reader",
        role: "reader",
        status: "active",
        emailVerifiedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .run();
    const issued = await issueEmailChallenge(
      {
        email: "reader@example.com",
        ipAddress: "127.0.0.1",
        locale: "en",
        now,
        code: "123456",
      },
      testDb as never,
      vi.fn().mockResolvedValue(undefined)
    );
    if (!issued.ok) {
      throw new Error("Expected challenge to be issued");
    }

    const verified = verifyEmailChallenge(
      {
        challengeId: issued.challengeId,
        code: "123456",
        now: new Date(now.getTime() + 30_000),
      },
      testDb as never
    );

    expect(verified).toMatchObject({ ok: true, isNewUser: false });
    expect(testDb.select().from(userRegistrationNotifications).all()).toHaveLength(0);
  });

  it("enforces resend cooldowns without sending another message", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const now = new Date("2026-07-23T04:00:00.000Z");
    await issueEmailChallenge(
      {
        email: "reader@example.com",
        ipAddress: "127.0.0.1",
        locale: "en",
        now,
        code: "111111",
      },
      testDb as never,
      sendEmail
    );

    const repeated = await issueEmailChallenge(
      {
        email: "reader@example.com",
        ipAddress: "127.0.0.1",
        locale: "en",
        now: new Date(now.getTime() + 10_000),
        code: "222222",
      },
      testDb as never,
      sendEmail
    );

    expect(repeated).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("locks a challenge after repeated incorrect codes", async () => {
    const now = new Date("2026-07-23T04:00:00.000Z");
    const issued = await issueEmailChallenge(
      {
        email: "reader@example.com",
        ipAddress: "127.0.0.1",
        locale: "en",
        now,
        code: "123456",
      },
      testDb as never,
      vi.fn().mockResolvedValue(undefined)
    );
    if (!issued.ok) {
      throw new Error("Expected challenge to be issued");
    }

    let result;
    for (let attempt = 0; attempt < EMAIL_CODE_MAX_ATTEMPTS; attempt += 1) {
      result = verifyEmailChallenge(
        {
          challengeId: issued.challengeId,
          code: "000000",
          now: new Date(now.getTime() + 10_000 + attempt),
        },
        testDb as never
      );
    }

    expect(result).toMatchObject({
      ok: false,
      reason: "too_many_attempts",
    });
    expect(
      verifyEmailChallenge(
        {
          challengeId: issued.challengeId,
          code: "123456",
          now: new Date(now.getTime() + 20_000),
        },
        testDb as never
      )
    ).toMatchObject({ ok: false, reason: "invalid_code" });
  });
});
