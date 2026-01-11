import assert from "node:assert/strict";
import { test } from "node:test";

import { TIER_DEFINITIONS, TIER_GUIDE } from "../tiers";

test("TIER_DEFINITIONS contains 6 tiers", () => {
  assert.equal(TIER_DEFINITIONS.length, 6);
});

test("TIER_DEFINITIONS has correct structure", () => {
  TIER_DEFINITIONS.forEach((tier) => {
    assert.ok(typeof tier.id === "number");
    assert.ok(typeof tier.label === "string");
    assert.ok(typeof tier.summary === "string");
    assert.ok(tier.id >= 1 && tier.id <= 6);
  });
});

test("TIER_DEFINITIONS has all expected tier IDs", () => {
  const ids = TIER_DEFINITIONS.map((t) => t.id).sort();
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6]);
});

test("TIER_DEFINITIONS tier 1 is Epic/Cinematic", () => {
  const tier1 = TIER_DEFINITIONS.find((t) => t.id === 1);
  assert.ok(tier1);
  assert.ok(tier1.label.includes("Epic"));
  assert.ok(tier1.label.includes("Cinematic"));
});

test("TIER_GUIDE is formatted correctly", () => {
  assert.ok(TIER_GUIDE.includes("1:"));
  assert.ok(TIER_GUIDE.includes("Epic"));
  assert.ok(TIER_GUIDE.includes("6:"));
  assert.ok(TIER_GUIDE.includes("Acoustic"));
});

test("TIER_GUIDE contains all tier IDs", () => {
  for (let i = 1; i <= 6; i++) {
    assert.ok(TIER_GUIDE.includes(`${i}:`), `TIER_GUIDE should contain tier ${i}`);
  }
});
