import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { TelegramService } from "../telegramService";

const originalEnv = process.env;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  process.env = originalEnv;
  globalThis.fetch = originalFetch;
});

test("TelegramService.setTitle returns formatted title", () => {
  process.env.APP_NAME = "Test App";
  process.env.NODE_ENV = "test";
  TelegramService.init();

  const title = TelegramService.setTitle("Custom Title");
  assert.ok(title.includes("Test App"));
  assert.ok(title.includes("TEST"));
  assert.ok(title.includes("Custom Title"));
});

test("TelegramService.setTitle uses default when no title provided", () => {
  process.env.APP_NAME = "My App";
  TelegramService.init();

  const title = TelegramService.setTitle();
  assert.ok(title.includes("My App"));
  assert.ok(title.includes("Thông báo hệ thống"));
});

test("TelegramService.send returns false when token not set", async () => {
  delete process.env.TELEGRAM_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  TelegramService.init();

  const result = await TelegramService.send({ message: "test" });
  assert.equal(result, false);
});

test("TelegramService.send makes correct API call", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedUrl: string | undefined;
  let capturedOptions: RequestInit | undefined;

  globalThis.fetch = (async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options ?? {};
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  const result = await TelegramService.send({
    message: "Test message",
    title: "Test Title",
  });

  assert.equal(result, true);
  assert.ok(capturedUrl?.includes("api.telegram.org"));
  assert.ok(capturedUrl?.includes("test-token"));
  assert.equal(capturedOptions?.method, "POST");

  const body = JSON.parse(String(capturedOptions?.body));
  assert.equal(body.chat_id, "test-chat-id");
  assert.equal(body.parse_mode, "MarkdownV2");
  assert.ok(body.text);
});

test("TelegramService.send includes exception location", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  const error = new Error("Test error");
  error.stack = "Error: Test error\n    at test.ts:123:45";

  await TelegramService.send({
    message: "test",
    exception: error,
  });

  // Location is extracted and escaped with markdown
  // The regex should match "at test.ts:123:45" and extract "test.ts:123"
  // Then it's escaped: test.ts:123 -> test\.ts\\:123 (dots and colons escaped)
  // Check that the File field is present (location was found and added)
  assert.ok(capturedBody.text.includes("File:"));
  // Also check for the file name (may be escaped)
  assert.ok(
    capturedBody.text.includes("test.ts") ||
    capturedBody.text.includes("test\\.ts")
  );
});

test("TelegramService.send includes additional fields", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  await TelegramService.send({
    message: "test",
    customField: "custom value",
    numberField: 123,
  });

  assert.ok(capturedBody.text.includes("customField"));
  assert.ok(capturedBody.text.includes("custom value"));
});

test("TelegramService.send handles API errors", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  globalThis.fetch = (async () => {
    return {
      ok: false,
      text: async () => "Error response",
    } as Response;
  }) as typeof fetch;

  const result = await TelegramService.send({ message: "test" });
  assert.equal(result, false);
});

test("TelegramService.send handles network errors", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  globalThis.fetch = (async () => {
    throw new Error("Network error");
  }) as typeof fetch;

  const result = await TelegramService.send({ message: "test" });
  assert.equal(result, false);
});

test("TelegramService.error sets error title", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  await TelegramService.error({ message: "error message" });

  assert.ok(capturedBody.text.includes("🚨"));
  assert.ok(capturedBody.text.includes("Cảnh báo lỗi hệ thống"));
});

test("TelegramService.warning sets warning title", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  await TelegramService.warning({ message: "warning message" });

  assert.ok(capturedBody.text.includes("⚠️"));
  assert.ok(capturedBody.text.includes("Cảnh báo"));
});

test("TelegramService.info sets info title", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  await TelegramService.info({ message: "info message" });

  assert.ok(capturedBody.text.includes("ℹ️"));
  assert.ok(capturedBody.text.includes("Thông báo hệ thống"));
});

test("TelegramService.send truncates long messages", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  // Create a message that will exceed 4000 chars after markdown formatting
  // The formatted message includes title, description wrapper, timestamp, etc.
  // So we need a message that, when formatted, exceeds 4000 chars
  const longMessage = "a".repeat(3500);
  await TelegramService.send({ message: longMessage });

  // After formatting with markdown (title, description wrapper, timestamp, etc.)
  // the message should be truncated to <= 4000 chars
  assert.ok(capturedBody.text.length <= 4000);
});

test("TelegramService.send includes message_thread_id when provided", async () => {
  process.env.TELEGRAM_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "test-chat-id";
  TelegramService.init();

  let capturedBody: any;
  globalThis.fetch = (async (_url, options) => {
    capturedBody = JSON.parse(String(options?.body ?? "{}"));
    return {
      ok: true,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;

  await TelegramService.send({
    message: "test",
    message_thread_id: 123,
  });

  assert.equal(capturedBody.message_thread_id, 123);
});
