import assert from "node:assert/strict";
import { test } from "node:test";

import { PROVIDER_CAPABILITIES, isProviderId, normalizeProviderId } from "../ai/capabilities";

test("normalizeProviderId handles casing and whitespace", () => {
  assert.equal(normalizeProviderId(" openai "), "OPENAI");
  assert.equal(normalizeProviderId("GoOgLe"), "GOOGLE");
});

test("normalizeProviderId returns null for unknown provider", () => {
  assert.equal(normalizeProviderId("unknown"), null);
});

test("isProviderId matches registered providers", () => {
  assert.equal(isProviderId("OPENAI"), true);
  assert.equal(isProviderId("openai"), true);
  assert.equal(isProviderId("custom"), false);
});

test("provider capabilities include image support flags", () => {
  assert.equal(PROVIDER_CAPABILITIES.OPENAI.image, true);
  assert.equal(PROVIDER_CAPABILITIES.DEEPSEEK.image, false);
});
