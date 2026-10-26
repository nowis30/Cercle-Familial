import { constants } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { del, get, put } from "@vercel/blob";

import { localPhotoPath, MAX_PHOTO_BYTES, parsePhotoReference, photoContentType } from "./event-photo-reference";

const privateRoot = () => join(process.cwd(), ".data", "event-photos");
const legacyRoot = () => join(process.cwd(), "public", "uploads", "events");

export async function saveEventPhoto(bytes: Buffer, mime: string): Promise<string> {
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[mime];
  if (!extension || !bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("Invalid photo");
  const fileName = `${Date.now()}-${randomBytes(16).toString("hex")}.${extension}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const pathname = `events/${fileName}`;
    await put(pathname, bytes, { access: "private", contentType: mime, addRandomSuffix: false });
    return `private-blob:${pathname}`;
  }
  // A serverless filesystem cannot provide durable private storage.
  if (process.env.NODE_ENV === "production") throw new Error("PRIVATE_PHOTO_STORAGE_REQUIRED");
  await mkdir(privateRoot(), { recursive: true, mode: 0o700 });
  const file = await open(localPhotoPath(privateRoot(), fileName), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await file.writeFile(bytes); } finally { await file.close(); }
  return `private-local:${fileName}`;
}

export async function readEventPhoto(value: string): Promise<{ body: BodyInit; contentType: string } | null> {
  const reference = parsePhotoReference(value);
  if (!reference) return null;
  if (reference.kind === "blob" || reference.kind === "legacy-blob") {
    const result = await get(reference.kind === "blob" ? reference.pathname : reference.url, { access: reference.kind === "blob" ? "private" : "public" });
    if (!result || result.statusCode !== 200 || result.blob.size > MAX_PHOTO_BYTES) return null;
    return { body: result.stream, contentType: photoContentType(reference) };
  }
  try {
    const file = await open(localPhotoPath(reference.kind === "local" ? privateRoot() : legacyRoot(), reference.fileName), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAX_PHOTO_BYTES) return null;
      return { body: new Uint8Array(await file.readFile()), contentType: photoContentType(reference) };
    } finally { await file.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteEventPhotoFile(value: string): Promise<void> {
  const reference = parsePhotoReference(value);
  // Unsafe historic values may be removed from the database, but must never reach the filesystem/network.
  if (!reference) return;
  if (reference.kind === "blob" || reference.kind === "legacy-blob") {
    await del(reference.kind === "blob" ? reference.pathname : reference.url);
    return;
  }
  try {
    await unlink(localPhotoPath(reference.kind === "local" ? privateRoot() : legacyRoot(), reference.fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
