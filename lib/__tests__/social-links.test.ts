import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatSocialLinksBlock,
  formatSocialLinksForPrompt,
  normalizeSocialLinks,
} from "../social-links";

test("normalizeSocialLinks returns empty array for invalid input", () => {
  assert.deepEqual(normalizeSocialLinks(undefined), []);
  assert.deepEqual(normalizeSocialLinks(null), []);
  assert.deepEqual(normalizeSocialLinks("not an array" as any), []);
});

test("normalizeSocialLinks filters out invalid links", () => {
  const input = [
    { type: "YouTube", url: "https://youtube.com" },
    { type: "", url: "https://twitter.com" }, // empty type
    { type: "Twitter", url: "" }, // empty url
    { type: "  ", url: "https://instagram.com" }, // whitespace only
  ];
  const result = normalizeSocialLinks(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, "YouTube");
  assert.equal(result[0].url, "https://youtube.com");
});

test("normalizeSocialLinks trims whitespace", () => {
  const input = [
    { type: "  YouTube  ", url: "  https://youtube.com  " },
    { type: "Twitter", url: "https://twitter.com" },
  ];
  const result = normalizeSocialLinks(input);
  assert.equal(result[0].type, "YouTube");
  assert.equal(result[0].url, "https://youtube.com");
});

test("normalizeSocialLinks removes duplicates", () => {
  const input = [
    { type: "YouTube", url: "https://youtube.com" },
    { type: "youtube", url: "https://youtube.com" }, // case different but same
    { type: "YouTube", url: "https://youtube.com" }, // exact duplicate
  ];
  const result = normalizeSocialLinks(input);
  assert.equal(result.length, 1);
});

test("normalizeSocialLinks preserves different links", () => {
  const input = [
    { type: "YouTube", url: "https://youtube.com" },
    { type: "Twitter", url: "https://twitter.com" },
    { type: "Instagram", url: "https://instagram.com" },
  ];
  const result = normalizeSocialLinks(input);
  assert.equal(result.length, 3);
});

test("formatSocialLinksBlock returns empty string for empty array", () => {
  assert.equal(formatSocialLinksBlock([]), "");
});

test("formatSocialLinksBlock formats links correctly", () => {
  const links = [
    { type: "YouTube", url: "https://youtube.com" },
    { type: "Twitter", url: "https://twitter.com" },
  ];
  const result = formatSocialLinksBlock(links);
  assert.ok(result.includes("Follow us:"));
  assert.ok(result.includes("YouTube: https://youtube.com"));
  assert.ok(result.includes("Twitter: https://twitter.com"));
});

test("formatSocialLinksForPrompt returns empty string for empty array", () => {
  assert.equal(formatSocialLinksForPrompt([]), "");
});

test("formatSocialLinksForPrompt formats links correctly", () => {
  const links = [
    { type: "YouTube", url: "https://youtube.com" },
    { type: "Twitter", url: "https://twitter.com" },
  ];
  const result = formatSocialLinksForPrompt(links);
  assert.ok(result.includes("Social Links (use for the Follow us block):"));
  assert.ok(result.includes("YouTube: https://youtube.com"));
  assert.ok(result.includes("Twitter: https://twitter.com"));
});
