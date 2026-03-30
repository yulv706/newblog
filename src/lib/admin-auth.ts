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

async function upsertAdminPasswordHash(passwordHash: string) {
  db.insert(siteSettings)
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

async function getOrCreateAdminPasswordHash() {
  const existingPasswordHash = db
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
  await upsertAdminPasswordHash(passwordHash);
  return passwordHash;
}

export async function validateAdminCredentials(
  username: string,
  password: string
) {
  if (username !== getAdminUsername()) {
    return false;
  }

  const passwordHash = await getOrCreateAdminPasswordHash();
  return bcryptjs.compare(password, passwordHash);
}
