import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { openaiProvider } from "../ai/providers/openai";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("openai image generation uses gpt-image-1.5 with base64 output", async () => {
  const calls: Array<{ url: string; options: RequestInit }> = [];

  globalThis.fetch = (async (url, options) => {
    calls.push({ url: String(url), options: options ?? {} });
    return {
      ok: true,
      json: async () => ({ data: [{ b64_json: "base64payload" }] }),
    } as Response;
  }) as typeof fetch;

  const result = await openaiProvider.image.generateImage({
    prompt: "neon skyline",
    aspectRatio: "16:9",
    apiKey: "test-key",
  });

  assert.equal(result.imageUrl, "data:image/png;base64,base64payload");
  const body = JSON.parse(String(calls[0]?.options?.body ?? "{}"));
  assert.equal(body.model, "gpt-image-1.5");
  assert.equal(body.size, "1536x1024");
  assert.equal(body.quality, "high");
});

test("openai image generation rejects edits", async () => {
  await assert.rejects(
    openaiProvider.image.generateImage({
      prompt: "edit",
      aspectRatio: "1:1",
      apiKey: "test-key",
      inputImage: { data: "base64", mimeType: "image/png" },
    }),
    /image edits are not implemented/i
  );
});

test("openai text generation returns parsed JSON", async () => {
  const calls: Array<{ url: string; options: RequestInit }> = [];

  globalThis.fetch = (async (url, options) => {
    calls.push({ url: String(url), options: options ?? {} });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await openaiProvider.text.generateJSON<{ ok: boolean }>({
    prompt: "Return JSON",
    apiKey: "test-key",
  });

  assert.deepEqual(result, { ok: true });
  const body = JSON.parse(String(calls[0]?.options?.body ?? "{}"));
  assert.equal(body.model, "gpt-5.2");
  assert.equal(body.response_format?.type, "json_object");
});
