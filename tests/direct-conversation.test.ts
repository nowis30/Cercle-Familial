import assert from "node:assert/strict";
import test from "node:test";

import { buildDirectConversationPairKey } from "@/lib/direct-conversation";

test("buildDirectConversationPairKey produit la meme cle quel que soit l'ordre", () => {
  const first = buildDirectConversationPairKey("user-b", "user-a");
  const second = buildDirectConversationPairKey("user-a", "user-b");

  assert.equal(first, "user-a::user-b");
  assert.equal(first, second);
});