import assert from "node:assert/strict";
import { test } from "node:test";

import { googleProvider } from "../ai/providers/google";

test("google provider has correct id and label", () => {
  assert.equal(googleProvider.id, "GOOGLE");
  assert.equal(googleProvider.label, "Google Gemini");
  assert.equal(googleProvider.supportsImageEdits, true);
});

test("google provider requires API key for text generation", async () => {
  await assert.rejects(
    googleProvider.text.generateJSON({
      prompt: "test",
      apiKey: "",
    }),
    /GOOGLE API key is required/i
  );
});

test("google provider requires API key for image generation", async () => {
  await assert.rejects(
    googleProvider.image.generateImage({
      prompt: "test",
      aspectRatio: "16:9",
      apiKey: "",
    }),
    /GOOGLE API key is required/i
  );
});
