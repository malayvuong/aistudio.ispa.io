import assert from "node:assert/strict";
import { test } from "node:test";

import { createPlaceholderProvider } from "../ai/providers/placeholder";

test("placeholder provider throws not implemented for text", async () => {
  const provider = createPlaceholderProvider("DEEPSEEK", "Test Provider");
  await assert.rejects(
    provider.text.generateJSON({
      prompt: "test",
      apiKey: "test-key",
    }),
    /Test Provider is not implemented yet/i
  );
});

test("placeholder provider throws not implemented for image", async () => {
  const provider = createPlaceholderProvider("GROK", "Another Provider");
  await assert.rejects(
    provider.image.generateImage({
      prompt: "test",
      aspectRatio: "16:9",
      apiKey: "test-key",
    }),
    /Another Provider is not implemented yet/i
  );
});

test("placeholder provider has correct id and label", () => {
  const provider = createPlaceholderProvider("OPENAI", "Custom Label");
  assert.equal(provider.id, "OPENAI");
  assert.equal(provider.label, "Custom Label");
});
