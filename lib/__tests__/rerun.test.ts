import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { consumeRerunPayload, storeRerunPayload } from "../rerun";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  // Setup window and localStorage mock for Node.js environment
  // The rerun.ts file checks `typeof window === "undefined"`, so we need to define it
  Object.defineProperty(global, "window", {
    value: {
      localStorage: localStorageMock,
    },
    writable: true,
    configurable: true,
  });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
  // Clean up window mock
  delete (global as any).window;
});

test("storeRerunPayload stores payload in localStorage", () => {
  const payload = {
    feature: "YOUTUBE_PACKAGE",
    input: { songName: "Test Song", stylePrompt: "test" },
  };
  storeRerunPayload(payload);
  const stored = localStorageMock.getItem("rerun_payload");
  assert.ok(stored);
  const parsed = JSON.parse(stored);
  assert.equal(parsed.feature, "YOUTUBE_PACKAGE");
  assert.deepEqual(parsed.input, { songName: "Test Song", stylePrompt: "test" });
});

test("consumeRerunPayload returns null when no payload stored", () => {
  const result = consumeRerunPayload();
  assert.equal(result, null);
});

test("consumeRerunPayload returns and removes stored payload", () => {
  const payload = {
    feature: "MUSIC_PROMPT",
    input: { genres: ["Pop"], vibes: ["Happy"] },
  };
  storeRerunPayload(payload);
  const result = consumeRerunPayload();
  assert.ok(result);
  assert.equal(result.feature, "MUSIC_PROMPT");
  assert.deepEqual(result.input, { genres: ["Pop"], vibes: ["Happy"] });
  // Should be removed after consumption
  assert.equal(localStorageMock.getItem("rerun_payload"), null);
});

test("consumeRerunPayload filters by feature", () => {
  storeRerunPayload({
    feature: "YOUTUBE_PACKAGE",
    input: { test: "data" },
  });
  const result = consumeRerunPayload("MUSIC_PROMPT");
  assert.equal(result, null);
});

test("consumeRerunPayload returns payload when feature matches", () => {
  storeRerunPayload({
    feature: "YOUTUBE_PACKAGE",
    input: { songName: "Test" },
  });
  const result = consumeRerunPayload("YOUTUBE_PACKAGE");
  assert.ok(result);
  assert.equal(result.feature, "YOUTUBE_PACKAGE");
});

test("consumeRerunPayload handles invalid JSON", () => {
  localStorageMock.setItem("rerun_payload", "invalid json");
  const result = consumeRerunPayload();
  assert.equal(result, null);
  // Should remove invalid data
  assert.equal(localStorageMock.getItem("rerun_payload"), null);
});

test("consumeRerunPayload handles non-object input", () => {
  localStorageMock.setItem(
    "rerun_payload",
    JSON.stringify({ feature: "TEST", input: "not an object" })
  );
  const result = consumeRerunPayload();
  assert.equal(result, null);
});

test("consumeRerunPayload handles array input", () => {
  localStorageMock.setItem(
    "rerun_payload",
    JSON.stringify({ feature: "TEST", input: ["array", "not", "object"] })
  );
  const result = consumeRerunPayload();
  assert.equal(result, null);
});

test("consumeRerunPayload uses expectedFeature when payload has no feature", () => {
  localStorageMock.setItem(
    "rerun_payload",
    JSON.stringify({ input: { test: "data" } })
  );
  const result = consumeRerunPayload("ALBUM_CONCEPT");
  assert.ok(result);
  assert.equal(result.feature, "ALBUM_CONCEPT");
  assert.deepEqual(result.input, { test: "data" });
});
