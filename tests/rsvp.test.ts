import assert from "node:assert/strict";
import test from "node:test";
import { RsvpResponse } from "@prisma/client";

import { buildRsvpCounts, getUniqueLinkedMemberIds } from "@/lib/rsvp";

test("getUniqueLinkedMemberIds deduplique et retire les valeurs vides", () => {
  assert.deepEqual(getUniqueLinkedMemberIds(["a", "", "b", "a"]), ["a", "b"]);
});

test("buildRsvpCounts calcule correctement un RSVP positif avec membres lies", () => {
  const result = buildRsvpCounts(RsvpResponse.JE_VIENS, true, ["m1", "m2", "m1"]);

  assert.deepEqual(result, {
    includeSelf: true,
    linkedMemberIds: ["m1", "m2"],
    adultsCount: 1,
    childrenCount: 2,
    totalCount: 3,
  });
});

test("buildRsvpCounts annule self et membres lies pour JE_NE_VIENS_PAS", () => {
  const result = buildRsvpCounts(RsvpResponse.JE_NE_VIENS_PAS, true, ["m1", "m2"]);

  assert.deepEqual(result, {
    includeSelf: false,
    linkedMemberIds: [],
    adultsCount: 0,
    childrenCount: 0,
    totalCount: 0,
  });
});

test("buildRsvpCounts gere le cas PEUT_ETRE sans self mais avec membres lies", () => {
  const result = buildRsvpCounts(RsvpResponse.PEUT_ETRE, false, ["m1"]);

  assert.deepEqual(result, {
    includeSelf: false,
    linkedMemberIds: ["m1"],
    adultsCount: 0,
    childrenCount: 1,
    totalCount: 1,
  });
});