import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  USER_AUTH_COOKIE_NAME,
  verifyUserSessionToken,
} from "@/lib/auth";

export const USER_DISPLAY_NAME_MAX_LENGTH = 40;
export const USER_EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthenticatedUser = {
  id: number;
  email: string;
  displayName: string;
  role: "reader" | "admin";
  createdAt: string;
};

type UserDatabase = Pick<typeof db, "select" | "update">;

export function normalizeUserEmail(value: string) {
  return value.trim().toLowerCase().slice(0, USER_EMAIL_MAX_LENGTH);
}

export function isValidUserEmail(value: string) {
  const email = normalizeUserEmail(value);
  return email.length <= USER_EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);
}

export function sanitizeUserDisplayName(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, USER_DISPLAY_NAME_MAX_LENGTH);
}

export function getDefaultDisplayName(email: string) {
  const localPart = normalizeUserEmail(email).split("@")[0] ?? "";
  return sanitizeUserDisplayName(localPart) || "Reader";
}

export function getUserById(
  userId: number,
  database: UserDatabase = db
): AuthenticatedUser | null {
  const row = database
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!row || row.status !== "active") {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export async function getCurrentUser(
  database: UserDatabase = db
): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyUserSessionToken(token) : null;
  if (!payload) {
    return null;
  }

  return getUserById(Number(payload.sub), database);
}

export async function requireUserSession(
  database: UserDatabase = db
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(database);
  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export function updateUserDisplayName(
  userId: number,
  displayName: string,
  database: UserDatabase = db
) {
  const sanitized = sanitizeUserDisplayName(displayName);
  if (!sanitized) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  const updated = database
    .update(users)
    .set({ displayName: sanitized, updatedAt })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .get();

  return updated ?? null;
}
