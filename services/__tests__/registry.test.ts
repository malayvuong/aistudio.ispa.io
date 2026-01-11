import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PROVIDER_ID, getProvider, isProviderId } from "../ai/registry";

test("getProvider returns default provider when no id provided", () => {
  const provider = getProvider();
  assert.equal(provider.id, DEFAULT_PROVIDER_ID);
});

test("getProvider returns default provider for unknown id", () => {
  const provider = getProvider("UNKNOWN" as any);
  assert.equal(provider.id, DEFAULT_PROVIDER_ID);
});

test("getProvider returns correct provider for valid id", () => {
  const provider = getProvider("OPENAI");
  assert.equal(provider.id, "OPENAI");
  assert.equal(provider.label, "OpenAI");
});

test("getProvider returns google provider", () => {
  const provider = getProvider("GOOGLE");
  assert.equal(provider.id, "GOOGLE");
});

test("getProvider returns deepseek provider", () => {
  const provider = getProvider("DEEPSEEK");
  assert.equal(provider.id, "DEEPSEEK");
});

test("getProvider returns grok provider", () => {
  const provider = getProvider("GROK");
  assert.equal(provider.id, "GROK");
});

test("isProviderId validates provider ids", () => {
  assert.equal(isProviderId("GOOGLE"), true);
  assert.equal(isProviderId("OPENAI"), true);
  assert.equal(isProviderId("DEEPSEEK"), true);
  assert.equal(isProviderId("GROK"), true);
  assert.equal(isProviderId("UNKNOWN"), false);
  assert.equal(isProviderId(""), false);
  assert.equal(isProviderId(null), false);
  assert.equal(isProviderId(undefined), false);
});
