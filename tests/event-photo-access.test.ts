import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { MAX_PHOTO_BYTES, matchesPhotoMime, readPhotoFormData } from "../lib/event-photo-reference";

function harness(options: { user?: string | null; member?: boolean; failSave?: boolean } = {}) {
  const state = { queries: 0, reads: 0, writes: 0, cleanups: 0, saved: null as Record<string, unknown> | null };
  const user = options.user === undefined ? "member" : options.user;
  const member = options.member ?? true;
  const reference = "private-local:1720000000000-0123456789abcdef.jpg";
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: Response },
    "next/cache": { revalidatePath: () => undefined },
    "@/lib/auth": { auth: async () => user ? { user: { id: user } } : null },
    "@/lib/event-photo-reference": { MAX_PHOTO_BYTES, matchesPhotoMime, readPhotoFormData },
    "@/lib/event-photo-storage": {
      saveEventPhoto: async () => { state.writes++; return reference; },
      deleteEventPhotoFile: async (value: string) => { assert.equal(value, reference); state.cleanups++; },
      readEventPhoto: async () => { state.reads++; return { body: new Uint8Array([255, 216, 255]), contentType: "image/jpeg" }; },
    },
    "@/lib/prisma": { prisma: {
      event: { findFirst: async (query: { where: { circle: { memberships: { some: { userId: string } } } } }) => {
        state.queries++; assert.equal(query.where.circle.memberships.some.userId, user);
        return member ? { id: "event", circleId: "circle" } : null;
      } },
      eventPhoto: {
        findFirst: async (query: { where: { event: { circle: { memberships: { some: { userId: string } } } } } }) => {
          state.queries++; assert.equal(query.where.event.circle.memberships.some.userId, user);
          return member ? { id: "photo", url: reference } : null;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          if (options.failSave) throw new Error("simulated database failure");
          state.saved = data; return { id: "photo" };
        },
      },
    } },
  };
  function load(path: string): Record<string, (...args: unknown[]) => Promise<Response>> {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
    const exports = {};
    new Function("require", "exports", compiled)((name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name];
    }, exports);
    return exports;
  }
  return { state, reference, get: load("../app/api/photos/[photoId]/route.ts").GET, post: load("../app/api/upload/route.ts").POST };
}
function upload(origin = "https://family.example.test") {
  const body = new FormData(); body.set("eventId", "event"); body.set("caption", "Family memory");
  body.set("url", "/uploads/events/../../private-file");
  body.set("file", new File([new Uint8Array([255, 216, 255])], "picture.jpg", { type: "image/jpeg" }));
  return new Request("https://family.example.test/api/upload", { method: "POST", headers: { origin }, body });
}
const photoRequest = () => new Request("https://family.example.test/api/photos/photo");
const context = () => ({ params: Promise.resolve({ photoId: "photo" }) });

test("anonymous and nonmember requests never read a private photo", async () => {
  const anonymous = harness({ user: null });
  assert.equal((await anonymous.get(photoRequest(), context())).status, 401);
  assert.equal(anonymous.state.queries, 0); assert.equal(anonymous.state.reads, 0);
  const outsider = harness({ user: "outsider", member: false });
  assert.equal((await outsider.get(photoRequest(), context())).status, 404);
  assert.equal(outsider.state.reads, 0);
});
test("authorized photos are served privately without cache or content sniffing", async () => {
  const member = harness(); const response = await member.get(photoRequest(), context());
  assert.equal(response.status, 200); assert.equal(member.state.reads, 1);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
test("uploads require same-origin membership before writing storage", async () => {
  for (const [options, origin, status] of [
    [{ user: null }, undefined, 401], [{ member: false }, undefined, 403], [{}, "https://external.example", 403],
  ] as const) {
    const app = harness(options); assert.equal((await app.post(upload(origin))).status, status);
    assert.equal(app.state.writes, 0); assert.equal(app.state.saved, null);
  }
});
test("the server assigns ownership and ignores user-supplied storage references", async () => {
  const app = harness(); const response = await app.post(upload());
  assert.equal(response.status, 201);
  assert.deepEqual(app.state.saved, { eventId: "event", uploadedBy: "member", url: app.reference, caption: "Family memory" });
  assert.deepEqual(await response.json(), { id: "photo", url: "/api/photos/photo" });
});
test("failed database registration cleans up the newly uploaded private object", async () => {
  const app = harness({ failSave: true });
  assert.equal((await app.post(upload())).status, 503); assert.equal(app.state.cleanups, 1);
});
