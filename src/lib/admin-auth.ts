import * as bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
}

function getInitialAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
}

type AdminAuthDatabase = Pick<typeof db, "insert" | "select">;

async function upsertAdminPasswordHash(
  passwordHash: string,
  database: AdminAuthDatabase = db
) {
  database
    .insert(siteSettings)
    .values({
      key: ADMIN_PASSWORD_HASH_KEY,
      value: passwordHash,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: passwordHash,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();
}

async function getOrCreateAdminPasswordHash(database: AdminAuthDatabase = db) {
  const existingPasswordHash = database
    .select({
      value: siteSettings.value,
    })
    .from(siteSettings)
    .where(eq(siteSettings.key, ADMIN_PASSWORD_HASH_KEY))
    .get();

  if (existingPasswordHash?.value) {
    return existingPasswordHash.value;
  }

  const passwordHash = await bcryptjs.hash(getInitialAdminPassword(), 10);
  await upsertAdminPasswordHash(passwordHash, database);
  return passwordHash;
}

export async function validateAdminCredentials(
  username: string,
  password: string,
  database: AdminAuthDatabase = db
) {
  if (username !== getAdminUsername()) {
    return false;
  }

  const passwordHash = await getOrCreateAdminPasswordHash(database);
  return bcryptjs.compare(password, passwordHash);
}
