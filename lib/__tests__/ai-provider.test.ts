import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_PROVIDER_ID,
  getProviderLabel,
  isAIProviderId,
  normalizeAIProviderId,
} from "../ai-provider";

test("DEFAULT_PROVIDER_ID is GOOGLE", () => {
  assert.equal(DEFAULT_PROVIDER_ID, "GOOGLE");
});

test("AI_PROVIDER_OPTIONS contains 4 providers", () => {
  assert.equal(AI_PROVIDER_OPTIONS.length, 4);
});

test("AI_PROVIDER_OPTIONS has correct structure", () => {
  AI_PROVIDER_OPTIONS.forEach((option) => {
    assert.ok(typeof option.id === "string");
    assert.ok(typeof option.label === "string");
    assert.ok(typeof option.description === "string");
  });
});

test("isAIProviderId validates provider IDs", () => {
  assert.equal(isAIProviderId("GOOGLE"), true);
  assert.equal(isAIProviderId("OPENAI"), true);
  assert.equal(isAIProviderId("DEEPSEEK"), true);
  assert.equal(isAIProviderId("GROK"), true);
  assert.equal(isAIProviderId("google"), true); // case insensitive
  assert.equal(isAIProviderId("UNKNOWN"), false);
  assert.equal(isAIProviderId(""), false);
  assert.equal(isAIProviderId(null), false);
  assert.equal(isAIProviderId(undefined), false);
});

test("normalizeAIProviderId handles casing and whitespace", () => {
  assert.equal(normalizeAIProviderId(" openai "), "OPENAI");
  assert.equal(normalizeAIProviderId("GoOgLe"), "GOOGLE");
  assert.equal(normalizeAIProviderId("deepseek"), "DEEPSEEK");
  assert.equal(normalizeAIProviderId("grok"), "GROK");
});

test("normalizeAIProviderId returns null for invalid providers", () => {
  assert.equal(normalizeAIProviderId("unknown"), null);
  assert.equal(normalizeAIProviderId(""), null);
  assert.equal(normalizeAIProviderId(null), null);
  assert.equal(normalizeAIProviderId(undefined), null);
});

test("getProviderLabel returns correct label", () => {
  assert.equal(getProviderLabel("GOOGLE"), "Google Gemini");
  assert.equal(getProviderLabel("OPENAI"), "OpenAI");
  assert.equal(getProviderLabel("DEEPSEEK"), "DeepSeek");
  assert.equal(getProviderLabel("GROK"), "Grok");
});

test("getProviderLabel returns ID for unknown provider", () => {
  // TypeScript would prevent this, but test runtime behavior
  assert.equal(getProviderLabel("UNKNOWN" as any), "UNKNOWN");
});
