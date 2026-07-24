import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailAuthChallenges,
  userRegistrationNotifications,
  users,
} from "@/lib/db/schema";
import { sendAuthenticationCodeEmail } from "@/lib/email";
import type { AppLocale } from "@/lib/i18n/config";
import {
  getDefaultDisplayName,
  isValidUserEmail,
  normalizeUserEmail,
  sanitizeUserDisplayName,
  type AuthenticatedUser,
} from "@/lib/user-auth";

export const EMAIL_CODE_TTL_SECONDS = 10 * 60;
export const EMAIL_CODE_RESEND_SECONDS = 60;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CODE_MAX_REQUESTS_PER_HOUR = 8;

type EmailAuthDatabase = typeof db;

type IssueChallengeInput = {
  email: string;
  displayName?: string;
  ipAddress: string;
  locale: AppLocale;
  now?: Date;
  code?: string;
};

type VerifyChallengeInput = {
  challengeId: string;
  code: string;
  now?: Date;
};

type EmailSender = typeof sendAuthenticationCodeEmail;

export type IssueChallengeResult =
  | { ok: true; challengeId: string; expiresInSeconds: number }
  | {
      ok: false;
      reason: "invalid_email" | "rate_limited" | "email_unavailable";
      retryAfterSeconds?: number;
    };

export type VerifyChallengeResult =
  | { ok: true; user: AuthenticatedUser; isNewUser: boolean }
  | {
      ok: false;
      reason:
        | "invalid_code"
        | "expired_code"
        | "too_many_attempts"
        | "disabled_user";
    };

function getSecuritySecret() {
  const secret = process.env.AUTH_SECRET ?? "development-auth-secret";
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters in production.");
  }
  return secret;
}

function digest(value: string) {
  return createHmac("sha256", getSecuritySecret()).update(value).digest("hex");
}

function hashCode(challengeId: string, email: string, code: string) {
  return digest(`email-code:${challengeId}:${email}:${code}`);
}

function hashIpAddress(ipAddress: string) {
  return digest(`request-ip:${ipAddress || "unknown"}`);
}

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function toCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

function isMatchingCode(actualHash: string, expectedHash: string) {
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function issueEmailChallenge(
  input: IssueChallengeInput,
  database: EmailAuthDatabase = db,
  sendEmail: EmailSender = sendAuthenticationCodeEmail
): Promise<IssueChallengeResult> {
  const email = normalizeUserEmail(input.email);
  if (!isValidUserEmail(email)) {
    return { ok: false, reason: "invalid_email" };
  }

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const requestIpHash = hashIpAddress(input.ipAddress);
  const resendCutoff = new Date(
    now.getTime() - EMAIL_CODE_RESEND_SECONDS * 1_000
  ).toISOString();
  const hourlyCutoff = new Date(now.getTime() - 60 * 60 * 1_000).toISOString();
  const cleanupCutoff = new Date(
    now.getTime() - 24 * 60 * 60 * 1_000
  ).toISOString();

  database
    .delete(emailAuthChallenges)
    .where(lt(emailAuthChallenges.expiresAt, cleanupCutoff))
    .run();

  const recent = database
    .select({ createdAt: emailAuthChallenges.createdAt })
    .from(emailAuthChallenges)
    .where(
      and(
        eq(emailAuthChallenges.email, email),
        gte(emailAuthChallenges.createdAt, resendCutoff)
      )
    )
    .orderBy(desc(emailAuthChallenges.createdAt))
    .get();

  if (recent) {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - new Date(recent.createdAt).getTime()) / 1_000)
    );
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(
        1,
        EMAIL_CODE_RESEND_SECONDS - elapsedSeconds
      ),
    };
  }

  const hourlyRequests = database
    .select({ value: count() })
    .from(emailAuthChallenges)
    .where(
      and(
        gte(emailAuthChallenges.createdAt, hourlyCutoff),
        or(
          eq(emailAuthChallenges.email, email),
          eq(emailAuthChallenges.requestIpHash, requestIpHash)
        )
      )
    )
    .get();

  if (toCount(hourlyRequests?.value) >= EMAIL_CODE_MAX_REQUESTS_PER_HOUR) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 60 * 60,
    };
  }

  const challengeId = randomUUID();
  const code = input.code ?? generateCode();
  const expiresAt = new Date(
    now.getTime() + EMAIL_CODE_TTL_SECONDS * 1_000
  ).toISOString();

  database
    .insert(emailAuthChallenges)
    .values({
      id: challengeId,
      email,
      displayName: sanitizeUserDisplayName(input.displayName ?? "") || null,
      codeHash: hashCode(challengeId, email, code),
      requestIpHash,
      expiresAt,
      createdAt: nowIso,
    })
    .run();

  try {
    await sendEmail({ to: email, code, locale: input.locale });
  } catch {
    database
      .delete(emailAuthChallenges)
      .where(eq(emailAuthChallenges.id, challengeId))
      .run();
    return { ok: false, reason: "email_unavailable" };
  }

  return {
    ok: true,
    challengeId,
    expiresInSeconds: EMAIL_CODE_TTL_SECONDS,
  };
}

export function verifyEmailChallenge(
  input: VerifyChallengeInput,
  database: EmailAuthDatabase = db
): VerifyChallengeResult {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const challenge = database
    .select()
    .from(emailAuthChallenges)
    .where(eq(emailAuthChallenges.id, input.challengeId))
    .get();

  if (!challenge || challenge.consumedAt) {
    return { ok: false, reason: "invalid_code" };
  }

  if (new Date(challenge.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, reason: "expired_code" };
  }

  if (challenge.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const candidateHash = hashCode(
    challenge.id,
    challenge.email,
    input.code.trim()
  );
  if (!isMatchingCode(candidateHash, challenge.codeHash)) {
    const attempts = challenge.attempts + 1;
    database
      .update(emailAuthChallenges)
      .set({
        attempts,
        consumedAt:
          attempts >= EMAIL_CODE_MAX_ATTEMPTS ? nowIso : challenge.consumedAt,
      })
      .where(eq(emailAuthChallenges.id, challenge.id))
      .run();

    return {
      ok: false,
      reason:
        attempts >= EMAIL_CODE_MAX_ATTEMPTS
          ? "too_many_attempts"
          : "invalid_code",
    };
  }

  return database.transaction((transaction) => {
    const consumed = transaction
      .update(emailAuthChallenges)
      .set({ consumedAt: nowIso })
      .where(
        and(
          eq(emailAuthChallenges.id, challenge.id),
          isNull(emailAuthChallenges.consumedAt)
        )
      )
      .run();

    if (consumed.changes === 0) {
      return { ok: false, reason: "invalid_code" } as const;
    }

    const existing = transaction
      .select()
      .from(users)
      .where(eq(users.email, challenge.email))
      .get();

    if (existing?.status === "disabled") {
      return { ok: false, reason: "disabled_user" } as const;
    }

    const isNewUser = !existing;
    const user =
      existing ??
      transaction
        .insert(users)
        .values({
          email: challenge.email,
          displayName:
            sanitizeUserDisplayName(challenge.displayName ?? "") ||
            getDefaultDisplayName(challenge.email),
          role: "reader",
          status: "active",
          emailVerifiedAt: nowIso,
          lastLoginAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .returning()
        .get();

    if (!user) {
      return { ok: false, reason: "invalid_code" } as const;
    }

    if (!isNewUser) {
      transaction
        .update(users)
        .set({ lastLoginAt: nowIso, updatedAt: nowIso })
        .where(eq(users.id, user.id))
        .run();
    }

    if (isNewUser) {
      transaction
        .insert(userRegistrationNotifications)
        .values({
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          nextAttemptAt: nowIso,
          createdAt: nowIso,
        })
        .onConflictDoNothing()
        .run();
    }

    return {
      ok: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
    } as const;
  });
}
