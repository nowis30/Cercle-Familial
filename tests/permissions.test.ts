import assert from "node:assert/strict";
import test from "node:test";
import { CircleRole, InvitePermission } from "@prisma/client";

import { canAccessSensitiveSettings, canCreateEvent, canInviteMembers, canManageCircle, canModerate } from "@/lib/permissions";

test("seul ADMIN peut gerer un cercle", () => {
  assert.equal(canManageCircle(CircleRole.ADMIN), true);
  assert.equal(canManageCircle(CircleRole.ADULTE), false);
  assert.equal(canManageCircle(CircleRole.ENFANT), false);
});

test("ADMIN et ADULTE peuvent creer un evenement", () => {
  assert.equal(canCreateEvent(CircleRole.ADMIN), true);
  assert.equal(canCreateEvent(CircleRole.ADULTE), true);
  assert.equal(canCreateEvent(CircleRole.ENFANT), false);
});

test("les reglages sensibles sont interdits aux enfants", () => {
  assert.equal(canAccessSensitiveSettings(CircleRole.ADMIN), true);
  assert.equal(canAccessSensitiveSettings(CircleRole.ADULTE), true);
  assert.equal(canAccessSensitiveSettings(CircleRole.ENFANT), false);
});

test("seul ADMIN peut moderer", () => {
  assert.equal(canModerate(CircleRole.ADMIN), true);
  assert.equal(canModerate(CircleRole.ADULTE), false);
});

test("la permission d'invitation respecte le mode du cercle", () => {
  assert.equal(canInviteMembers(CircleRole.ADMIN, InvitePermission.ADMINS_ONLY), true);
  assert.equal(canInviteMembers(CircleRole.ADULTE, InvitePermission.ADMINS_ONLY), false);
  assert.equal(canInviteMembers(CircleRole.ADULTE, InvitePermission.ADMINS_AND_ADULTS), true);
  assert.equal(canInviteMembers(CircleRole.ENFANT, InvitePermission.ADMINS_AND_ADULTS), false);
});