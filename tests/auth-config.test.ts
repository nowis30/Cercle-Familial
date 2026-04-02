import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAuthUrl, resolveAuthConfiguration } from "@/lib/auth-config";

test("normalizeAuthUrl retire le slash final", () => {
  assert.equal(normalizeAuthUrl("https://cercle-familial.vercel.app/"), "https://cercle-familial.vercel.app");
});

test("resolveAuthConfiguration accepte un fallback local sans secret", () => {
  const result = resolveAuthConfiguration({ NODE_ENV: "development" });
  assert.equal(result.authSecret, undefined);
  assert.equal(result.warnings.length, 1);
});

test("resolveAuthConfiguration echoue en production sans secret", () => {
  assert.throws(
    () => resolveAuthConfiguration({ NODE_ENV: "production", NEXTAUTH_URL: "https://cercle-familial.vercel.app" }),
    /NEXTAUTH_SECRET/,
  );
});

test("resolveAuthConfiguration echoue en production si NEXTAUTH_URL manque", () => {
  assert.throws(() => resolveAuthConfiguration({ NODE_ENV: "production", NEXTAUTH_SECRET: "secret" }), /NEXTAUTH_URL/);
});

test("resolveAuthConfiguration echoue si Google est partiellement configure en production", () => {
  assert.throws(
    () =>
      resolveAuthConfiguration({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: "secret",
        NEXTAUTH_URL: "https://cercle-familial.vercel.app",
        GOOGLE_CLIENT_ID: "client-id-only",
      }),
    /GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET/,
  );
});