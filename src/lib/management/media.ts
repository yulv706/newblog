import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ManagementApiError } from "@/lib/management/core";

export const MANAGEMENT_IMAGE_MAX_SIZE = 4 * 1024 * 1024;

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
export type ManagementMediaPurpose = "daily" | "post";

function isSupportedImageType(value: string): value is SupportedImageType {
  return value in imageTypes;
}

export async function saveManagementImage(file: File, purpose: ManagementMediaPurpose) {
  if (!isSupportedImageType(file.type)) {
    throw new ManagementApiError(415, "unsupported_media", "Only JPEG, PNG, GIF, and WebP are supported.");
  }
  if (file.size <= 0 || file.size > MANAGEMENT_IMAGE_MAX_SIZE) {
    throw new ManagementApiError(413, "invalid_media_size", "Images must be between 1 byte and 4 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageTypes[file.type].signature(bytes)) {
    throw new ManagementApiError(415, "invalid_media_signature", "The file content does not match its image type.");
  }

  const directoryName = purpose === "daily" ? "daily" : "images";
  const directory = path.join(process.cwd(), "public", "uploads", directoryName);
  const fileName = `${randomUUID()}${imageTypes[file.type].extension}`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, fileName), bytes, { flag: "wx" });

  return {
    url: `/uploads/${directoryName}/${fileName}`,
    mimeType: file.type,
    size: file.size,
    purpose,
  };
}
