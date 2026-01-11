import assert from "node:assert/strict";
import { test } from "node:test";

import { deepseekProvider } from "../ai/providers/deepseek";

test("deepseek text generation throws not implemented error", async () => {
  await assert.rejects(
    deepseekProvider.text.generateJSON({
      prompt: "test",
      apiKey: "test-key",
    }),
    /DeepSeek is not implemented yet/i
  );
});

test("deepseek image generation throws not implemented error", async () => {
  await assert.rejects(
    deepseekProvider.image.generateImage({
      prompt: "test",
      aspectRatio: "16:9",
      apiKey: "test-key",
    }),
    /DeepSeek image generation is not implemented yet/i
  );
});

test("deepseek provider has correct id and label", () => {
  assert.equal(deepseekProvider.id, "DEEPSEEK");
  assert.equal(deepseekProvider.label, "DeepSeek");
});
