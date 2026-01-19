/**
 * Plan Gate Tests
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  getPlan,
  hasPaidPlan,
  canAccessTemplate,
  calculateNewExpiry,
  FREE_TEMPLATES,
  PLAN_DURATIONS_DAYS,
} from "./plan-gate.ts";

// Helper to create settings with a plan
function makeSettings(planType: string, expiresAt: string | null) {
  if (!expiresAt) return {};
  return {
    apps: {
      choregami: {
        plan: {
          type: planType,
          expires_at: expiresAt,
        },
      },
    },
  };
}

// ===== getPlan tests =====

Deno.test("getPlan - returns free plan for empty settings", () => {
  const plan = getPlan({});
  assertEquals(plan.type, "free");
  assertEquals(plan.expiresAt, null);
  assertEquals(plan.daysRemaining, null);
});

Deno.test("getPlan - returns free plan for null settings", () => {
  const plan = getPlan(null);
  assertEquals(plan.type, "free");
});

Deno.test("getPlan - returns free plan for expired plan", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const settings = makeSettings("school_year", yesterday.toISOString().split("T")[0]);

  const plan = getPlan(settings);
  assertEquals(plan.type, "free");
  assertEquals(plan.expiresAt, null);
});

Deno.test("getPlan - returns active plan with correct days remaining", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const settings = makeSettings("school_year", future.toISOString().split("T")[0]);

  const plan = getPlan(settings);
  assertEquals(plan.type, "school_year");
  // Days remaining should be approximately 30 (account for timing)
  assertEquals(plan.daysRemaining! >= 29 && plan.daysRemaining! <= 31, true);
});

// ===== hasPaidPlan tests =====

Deno.test("hasPaidPlan - returns false for empty settings", () => {
  assertEquals(hasPaidPlan({}), false);
});

Deno.test("hasPaidPlan - returns true for active plan", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const settings = makeSettings("summer", future.toISOString().split("T")[0]);

  assertEquals(hasPaidPlan(settings), true);
});

Deno.test("hasPaidPlan - returns false for expired plan", () => {
  const past = new Date();
  past.setDate(past.getDate() - 1);
  const settings = makeSettings("full_year", past.toISOString().split("T")[0]);

  assertEquals(hasPaidPlan(settings), false);
});

// ===== canAccessTemplate tests =====

Deno.test("canAccessTemplate - free templates accessible without plan", () => {
  for (const template of FREE_TEMPLATES) {
    assertEquals(canAccessTemplate({}, template), true);
  }
});

Deno.test("canAccessTemplate - paid templates blocked without plan", () => {
  assertEquals(canAccessTemplate({}, "alternating_ab"), false);
  assertEquals(canAccessTemplate({}, "weekly_rotation"), false);
});

Deno.test("canAccessTemplate - paid templates accessible with active plan", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const settings = makeSettings("school_year", future.toISOString().split("T")[0]);

  assertEquals(canAccessTemplate(settings, "alternating_ab"), true);
  assertEquals(canAccessTemplate(settings, "weekly_rotation"), true);
});

// ===== calculateNewExpiry tests =====

Deno.test("calculateNewExpiry - starts from today for no existing plan", () => {
  const today = new Date();
  const newExpiry = calculateNewExpiry({}, "school_year");

  const expectedDate = new Date(today);
  expectedDate.setDate(expectedDate.getDate() + PLAN_DURATIONS_DAYS.school_year);

  // Compare dates (allow 1 day variance for timing)
  const diffDays = Math.abs(newExpiry.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

Deno.test("calculateNewExpiry - extends from existing plan expiry", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const settings = makeSettings("summer", future.toISOString().split("T")[0]);

  const newExpiry = calculateNewExpiry(settings, "school_year");

  // Should add 300 days to the existing expiry (30 days from now)
  const expectedDate = new Date(future);
  expectedDate.setDate(expectedDate.getDate() + PLAN_DURATIONS_DAYS.school_year);

  const diffDays = Math.abs(newExpiry.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

Deno.test("calculateNewExpiry - summer plan adds 90 days", () => {
  const today = new Date();
  const newExpiry = calculateNewExpiry({}, "summer");

  const expectedDate = new Date(today);
  expectedDate.setDate(expectedDate.getDate() + 90);

  const diffDays = Math.abs(newExpiry.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

Deno.test("calculateNewExpiry - full_year plan adds 365 days", () => {
  const today = new Date();
  const newExpiry = calculateNewExpiry({}, "full_year");

  const expectedDate = new Date(today);
  expectedDate.setDate(expectedDate.getDate() + 365);

  const diffDays = Math.abs(newExpiry.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

// ===== FREE_TEMPLATES constant tests =====

Deno.test("FREE_TEMPLATES - includes expected templates", () => {
  assertEquals(FREE_TEMPLATES.includes("daily_basics"), true);
  assertEquals(FREE_TEMPLATES.includes("dynamic_daily"), true);
});
