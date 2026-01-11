import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import * as geminiService from "../geminiService";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("generatePackage makes correct API call", async () => {
  let capturedUrl: string | undefined;
  let capturedOptions: RequestInit | undefined;

  globalThis.fetch = (async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options ?? {};
    return {
      ok: true,
      json: async () => ({
        tier: 1,
        tierReasoning: "test",
        youtubeTitle: "Test Title",
        youtubeDescription: "Test Description",
        tags: ["tag1", "tag2"],
        imagePrompt: "test prompt",
      }),
    } as Response;
  }) as typeof fetch;

  const result = await geminiService.generatePackage(
    {
      songName: "Test Song",
      stylePrompt: "test style",
    },
    "OPENAI"
  );

  assert.equal(capturedUrl, "/api/generate/package");
  assert.equal(capturedOptions?.method, "POST");
  assert.ok(capturedOptions?.headers);
  assert.equal(
    (capturedOptions?.headers as Record<string, string>)["x-ai-provider"],
    "OPENAI"
  );

  const body = JSON.parse(String(capturedOptions?.body));
  assert.equal(body.songName, "Test Song");
  assert.equal(body.providerId, "OPENAI");
  assert.equal(result.youtubeTitle, "Test Title");
});

test("generatePackage handles API errors", async () => {
  globalThis.fetch = (async () => {
    return {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Server error", code: "INTERNAL_ERROR" }),
    } as Response;
  }) as typeof fetch;

  await assert.rejects(
    geminiService.generatePackage({
      songName: "Test",
      stylePrompt: "test",
    }),
    /Server error/i
  );
});

test("generatePackage handles network errors", async () => {
  globalThis.fetch = (async () => {
    throw new Error("Network error");
  }) as typeof fetch;

  await assert.rejects(
    geminiService.generatePackage({
      songName: "Test",
      stylePrompt: "test",
    }),
    /Network error/i
  );
});

test("generateMusicPrompt makes correct API call", async () => {
  let capturedUrl: string | undefined;
  let capturedOptions: RequestInit | undefined;

  globalThis.fetch = (async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options ?? {};
    return {
      ok: true,
      json: async () => ({
        prompt: "optimized prompt",
        explanation: "test explanation",
      }),
    } as Response;
  }) as typeof fetch;

  const result = await geminiService.generateMusicPrompt(
    {
      genres: ["Pop"],
      vibes: ["Happy"],
    },
    "GOOGLE"
  );

  assert.equal(capturedUrl, "/api/generate/music");
  assert.equal(capturedOptions?.method, "POST");

  const body = JSON.parse(String(capturedOptions?.body));
  assert.deepEqual(body.genres, ["Pop"]);
  assert.equal(body.providerId, "GOOGLE");
  assert.equal(result.prompt, "optimized prompt");
});

test("generateAlbum makes correct API call", async () => {
  globalThis.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        albumTitle: "Test Album",
        albumPrompt: "test prompt",
        tracks: [],
        youtubeDescription: "test",
        tags: [],
        imagePrompt: "test",
      }),
    } as Response;
  }) as typeof fetch;

  const result = await geminiService.generateAlbum(
    {
      subject: "Test Subject",
      trackCount: 5,
    },
    "GROK"
  );

  assert.equal(result.albumTitle, "Test Album");
});

test("generateVisualAssets makes correct API call", async () => {
  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({
        baseImage: "base.jpg",
        squareWithText: "square.jpg",
        landscapeWithText: "landscape.jpg",
      }),
    } as Response;
  }) as typeof fetch;

  const result = await geminiService.generateVisualAssets(
    "test prompt",
    "Test Song",
    "OPENAI",
    "channel-123"
  );

  assert.equal(capturedBody.prompt, "test prompt");
  assert.equal(capturedBody.songName, "Test Song");
  assert.equal(capturedBody.channelId, "channel-123");
  assert.equal(capturedBody.providerId, "OPENAI");
  assert.equal(result.baseImage, "base.jpg");
});

test("generatePackage includes provider header when provided", async () => {
  let capturedHeaders: Record<string, string> | undefined;
  globalThis.fetch = (async (_url, options) => {
    capturedHeaders = options?.headers as Record<string, string>;
    return {
      ok: true,
      json: async () => ({
        tier: 1,
        tierReasoning: "test",
        youtubeTitle: "Test",
        youtubeDescription: "Test",
        tags: [],
        imagePrompt: "test",
      }),
    } as Response;
  }) as typeof fetch;

  await geminiService.generatePackage(
    { songName: "Test", stylePrompt: "test" },
    "DEEPSEEK"
  );

  assert.equal(capturedHeaders?.["x-ai-provider"], "DEEPSEEK");
});

test("generatePackage omits provider header when not provided", async () => {
  let capturedHeaders: Record<string, string> | undefined;
  globalThis.fetch = (async (_url, options) => {
    capturedHeaders = options?.headers as Record<string, string>;
    return {
      ok: true,
      json: async () => ({
        tier: 1,
        tierReasoning: "test",
        youtubeTitle: "Test",
        youtubeDescription: "Test",
        tags: [],
        imagePrompt: "test",
      }),
    } as Response;
  }) as typeof fetch;

  await geminiService.generatePackage({
    songName: "Test",
    stylePrompt: "test",
  });

  assert.equal(capturedHeaders?.["x-ai-provider"], undefined);
});
