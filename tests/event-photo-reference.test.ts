import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";

import { localPhotoPath, matchesPhotoMime, MAX_PHOTO_BYTES, parsePhotoReference, readPhotoFormData } from "../lib/event-photo-reference";

const file = "1720000000000-0123456789abcdef.jpg";

test("only generated photo references are accepted, including safe legacy values", () => {
  assert.deepEqual(parsePhotoReference(`private-local:${file}`), { kind: "local", fileName: file });
  assert.deepEqual(parsePhotoReference(`/uploads/events/${file}`), { kind: "legacy-local", fileName: file });
  assert.deepEqual(parsePhotoReference(`private-blob:events/${file}`), { kind: "blob", pathname: `events/${file}` });
  assert.ok(parsePhotoReference(`https://example.public.blob.vercel-storage.com/events/${file}`));
  for (const value of [
    "/uploads/events/../../.env", "/uploads/events/%2e%2e/%2e%2e/.env", "/uploads/events/..\\..\\.env",
    `/uploads/events/${file}/../secret`, `private-local:../${file}`, `private-local:${file}\0`,
    `private-blob:events/../${file}`, `https://evil.example/events/${file}`,
    `https://example.public.blob.vercel-storage.com.evil.example/events/${file}`,
    `https://example.public.blob.vercel-storage.com/events/${file}?download=1`,
    `https://example.public.blob.vercel-storage.com/events/../events/${file}`,
  ]) assert.equal(parsePhotoReference(value), null, value);
  assert.equal(localPhotoPath("/tmp/photos", file), resolve("/tmp/photos", file));
  assert.throws(() => localPhotoPath("/tmp/photos", "../../outside.jpg"));
});

test("declared image MIME must agree with the file signature", () => {
  assert.equal(matchesPhotoMime(Buffer.from([255, 216, 255]), "image/jpeg"), true);
  assert.equal(matchesPhotoMime(Buffer.from("<svg onload=alert(1)>"), "image/jpeg"), false);
  assert.equal(matchesPhotoMime(Buffer.from("GIF89a"), "image/gif"), true);
  assert.equal(matchesPhotoMime(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
  assert.equal(matchesPhotoMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(matchesPhotoMime(Buffer.from("GIF89a"), "image/png"), false);
});

test("multipart parsing enforces the actual size even without Content-Length", async () => {
  const form = new FormData(); form.append("eventId", "event-1");
  assert.equal((await readPhotoFormData(new Request("https://example.test", { method: "POST", body: form }))).get("eventId"), "event-1");
  const body = new Uint8Array(MAX_PHOTO_BYTES + 16 * 1024 + 1);
  await assert.rejects(readPhotoFormData(new Request("https://example.test", { method: "POST", body, headers: { "content-type": "multipart/form-data; boundary=x" } })), RangeError);
});
