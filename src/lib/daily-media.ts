import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DAILY_IMAGES_MAX_COUNT } from "@/lib/daily-shared";

export const DAILY_IMAGE_MAX_SIZE = 4 * 1024 * 1024;

const DAILY_UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads", "daily");
const DAILY_UPLOAD_PUBLIC_PREFIX = "/uploads/daily/";

class DailyMediaError extends Error {
  override name = "DailyMediaError";
}

const imageTypes = {
  "image/jpeg": {
    extension: ".jpg",
    signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: ".png",
    signature: (bytes: Uint8Array) =>
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  },
  "image/gif": {
    extension: ".gif",
    signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8"),
  },
  "image/webp": {
    extension: ".webp",
    signature: (bytes: Uint8Array) =>
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
} as const;

type SupportedImageType = keyof typeof imageTypes;

function isSupportedImageType(value: string): value is SupportedImageType {
  return value in imageTypes;
}

export function isManagedDailyImage(value: string) {
  return /^\/uploads\/daily\/[a-f0-9-]+\.(?:jpg|png|gif|webp)$/i.test(value);
}

export async function saveDailyImages(files: File[]) {
  if (files.length > DAILY_IMAGES_MAX_COUNT) {
    throw new DailyMediaError();
  }

  await fs.mkdir(DAILY_UPLOAD_DIRECTORY, { recursive: true });
  const savedPaths: string[] = [];

  try {
    for (const file of files) {
      if (!isSupportedImageType(file.type)) {
        throw new DailyMediaError();
      }
      if (file.size <= 0 || file.size > DAILY_IMAGE_MAX_SIZE) {
        throw new DailyMediaError();
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!imageTypes[file.type].signature(bytes)) {
        throw new DailyMediaError();
      }

      const fileName = `${randomUUID()}${imageTypes[file.type].extension}`;
      await fs.writeFile(path.join(DAILY_UPLOAD_DIRECTORY, fileName), bytes, {
        flag: "wx",
      });
      savedPaths.push(`${DAILY_UPLOAD_PUBLIC_PREFIX}${fileName}`);
    }

    return savedPaths;
  } catch (error) {
    await deleteDailyImages(savedPaths);
    throw error;
  }
}

export async function deleteDailyImages(imagePaths: string[]) {
  await Promise.all(
    imagePaths.filter(isManagedDailyImage).map(async (imagePath) => {
      const fileName = path.basename(imagePath);
      await fs.rm(path.join(DAILY_UPLOAD_DIRECTORY, fileName), { force: true });
    })
  );
}
