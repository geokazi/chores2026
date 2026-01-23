/**
 * Feature Limits Config Tests
 * Validates configuration correctness and tier structure.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { FEATURE_LIMITS, GLOBAL_EMAIL_BUDGET } from "./feature-limits.ts";

// === Structure Tests ===

Deno.test("feature-limits - has free tier", () => {
  assertExists(FEATURE_LIMITS.free);
});

Deno.test("feature-limits - has premium tier", () => {
  assertExists(FEATURE_LIMITS.premium);
});

Deno.test("feature-limits - free tier has all required keys", () => {
  assertEquals(typeof FEATURE_LIMITS.free.digests_per_month, "number");
  assertEquals(typeof FEATURE_LIMITS.free.sms_per_month, "number");
  assertEquals(typeof FEATURE_LIMITS.free.calendar_exports, "number");
  assertEquals(typeof FEATURE_LIMITS.free.badge_taps, "number");
});

// === Free Tier Limits ===

Deno.test("feature-limits - free tier digest limit is 4 (1/week)", () => {
  assertEquals(FEATURE_LIMITS.free.digests_per_month, 4);
});

Deno.test("feature-limits - free tier SMS limit is 4", () => {
  assertEquals(FEATURE_LIMITS.free.sms_per_month, 4);
});

Deno.test("feature-limits - free tier calendar exports are unlimited", () => {
  assertEquals(FEATURE_LIMITS.free.calendar_exports, Infinity);
});

Deno.test("feature-limits - free tier badge taps are unlimited", () => {
  assertEquals(FEATURE_LIMITS.free.badge_taps, Infinity);
});

// === Premium Tier Limits ===

Deno.test("feature-limits - premium tier has no digest limit", () => {
  assertEquals(FEATURE_LIMITS.premium.digests_per_month, Infinity);
});

Deno.test("feature-limits - premium tier has no SMS limit", () => {
  assertEquals(FEATURE_LIMITS.premium.sms_per_month, Infinity);
});

// === Global Budget ===

Deno.test("feature-limits - global email budget is 1000", () => {
  assertEquals(GLOBAL_EMAIL_BUDGET, 1000);
});

Deno.test("feature-limits - global budget is finite", () => {
  assertEquals(isFinite(GLOBAL_EMAIL_BUDGET), true);
});

Deno.test("feature-limits - global budget is positive", () => {
  assertEquals(GLOBAL_EMAIL_BUDGET > 0, true);
});

// === SMS Gate Logic ===

Deno.test("feature-limits - SMS gate triggers at correct threshold", () => {
  const monthlyUsage = 4;
  const limit = FEATURE_LIMITS.free.sms_per_month;
  assertEquals(monthlyUsage >= limit, true); // Should trigger gate
});

Deno.test("feature-limits - SMS gate allows under threshold", () => {
  const monthlyUsage = 3;
  const limit = FEATURE_LIMITS.free.sms_per_month;
  assertEquals(monthlyUsage >= limit, false); // Should allow
});

Deno.test("feature-limits - premium SMS never gated", () => {
  const monthlyUsage = 1000;
  const limit = FEATURE_LIMITS.premium.sms_per_month;
  assertEquals(monthlyUsage >= limit, false); // Infinity never reached
});
