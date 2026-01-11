import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { grokProvider } from "../ai/providers/grok";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("grok text generation returns parsed JSON", async () => {
  const calls: Array<{ url: string; options: RequestInit }> = [];

  globalThis.fetch = (async (url, options) => {
    calls.push({ url: String(url), options: options ?? {} });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"status": "ok"}' } }],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await grokProvider.text.generateJSON<{ status: string }>({
    prompt: "Return JSON",
    apiKey: "test-key",
  });

  assert.deepEqual(result, { status: "ok" });
  const body = JSON.parse(String(calls[0]?.options?.body ?? "{}"));
  assert.equal(body.model, "grok-4");
  assert.equal(body.stream, false);
  assert.equal(body.temperature, 0.7);
});

test("grok text generation includes schema hint in system message", async () => {
  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok": true}' } }],
      }),
    } as Response;
  }) as typeof fetch;

  await grokProvider.text.generateJSON({
    prompt: "test",
    apiKey: "test-key",
    schema: { type: "object" },
  });

  const systemContent = capturedBody.messages[0]?.content;
  assert.ok(systemContent.includes("Return valid JSON that matches this schema"));
});

test("grok text generation uses custom system message", async () => {
  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok": true}' } }],
      }),
    } as Response;
  }) as typeof fetch;

  await grokProvider.text.generateJSON({
    prompt: "test",
    apiKey: "test-key",
    system: "Custom system message",
  });

  assert.equal(capturedBody.messages[0]?.content, "Custom system message");
});

test("grok text generation handles API errors", async () => {
  globalThis.fetch = (async () => {
    return {
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as Response;
  }) as typeof fetch;

  await assert.rejects(
    grokProvider.text.generateJSON({
      prompt: "test",
      apiKey: "invalid-key",
    }),
    /Grok API error: 401/i
  );
});

test("grok text generation throws when no content", async () => {
  globalThis.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({ choices: [] }),
    } as Response;
  }) as typeof fetch;

  await assert.rejects(
    grokProvider.text.generateJSON({
      prompt: "test",
      apiKey: "test-key",
    }),
    /No content in Grok response/i
  );
});

test("grok image generation throws not implemented error", async () => {
  await assert.rejects(
    grokProvider.image.generateImage({
      prompt: "test",
      aspectRatio: "16:9",
      apiKey: "test-key",
    }),
    /Grok image generation is not implemented yet/i
  );
});

test("grok provider has correct id and label", () => {
  assert.equal(grokProvider.id, "GROK");
  assert.equal(grokProvider.label, "Grok");
});

test("grok provider requires API key", async () => {
  await assert.rejects(
    grokProvider.text.generateJSON({
      prompt: "test",
      apiKey: "",
    }),
    /GROK API key is required/i
  );
});
