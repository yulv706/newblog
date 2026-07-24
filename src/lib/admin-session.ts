import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const USER_ADMIN_SUBJECT_PREFIX = "user:";

function parseUserAdminSessionSubject(subject: string) {
  if (!subject.startsWith(USER_ADMIN_SUBJECT_PREFIX)) {
    return null;
  }

  const userId = Number.parseInt(subject.slice(USER_ADMIN_SUBJECT_PREFIX.length), 10);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return null;
  }

  const userId = parseUserAdminSessionSubject(session.sub);
  if (userId === null) {
    return null;
  }

  const user = db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user || user.role !== "admin" || user.status !== "active") {
    return null;
  }

  return session;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
