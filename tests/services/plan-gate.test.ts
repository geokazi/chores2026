/**
 * Plan Gate Unit Tests
 * Tests plan status checking, trial info, and expiry calculation
 */

import { assertEquals } from "jsr:@std/assert";
import {
  getPlan,
  hasPaidPlan,
  canAccessTemplate,
  calculateNewExpiry,
  isTrialPlan,
  getTrialInfo,
  PLAN_DURATIONS_DAYS,
  PlanType,
} from "../../lib/plan-gate.ts";

Deno.test({
  name: "Plan Gate - getPlan",
  fn: async (t) => {
    await t.step("returns free for empty settings", () => {
      const result = getPlan({});
      assertEquals(result.type, "free");
      assertEquals(result.expiresAt, null);
      assertEquals(result.daysRemaining, null);
    });

    await t.step("returns free for null settings", () => {
      const result = getPlan(null);
      assertEquals(result.type, "free");
    });

    await t.step("returns free for missing plan", () => {
      const result = getPlan({ apps: { choregami: {} } });
      assertEquals(result.type, "free");
    });

    await t.step("returns free for expired plan", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = getPlan({
        apps: { choregami: { plan: { type: "full_year", expires_at: yesterday.toISOString() } } }
      });
      assertEquals(result.type, "free");
      assertEquals(result.expiresAt, null);
    });

    await t.step("returns correct plan for valid unexpired plan", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const result = getPlan({
        apps: { choregami: { plan: { type: "summer", expires_at: future.toISOString() } } }
      });
      assertEquals(result.type, "summer");
      assertEquals(result.daysRemaining !== null && result.daysRemaining > 0, true);
    });
  },
});

Deno.test({
  name: "Plan Gate - hasPaidPlan",
  fn: async (t) => {
    await t.step("returns false for free plan", () => {
      assertEquals(hasPaidPlan({}), false);
    });

    await t.step("returns true for valid paid plan", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);

      assertEquals(hasPaidPlan({
        apps: { choregami: { plan: { type: "full_year", expires_at: future.toISOString() } } }
      }), true);
    });
  },
});

Deno.test({
  name: "Plan Gate - canAccessTemplate",
  fn: async (t) => {
    await t.step("allows free templates without paid plan", () => {
      assertEquals(canAccessTemplate({}, "daily_basics"), true);
      assertEquals(canAccessTemplate({}, "dynamic_daily"), true);
    });

    await t.step("blocks premium templates without paid plan", () => {
      assertEquals(canAccessTemplate({}, "advanced_weekly"), false);
    });

    await t.step("allows premium templates with paid plan", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const settings = {
        apps: { choregami: { plan: { type: "full_year", expires_at: future.toISOString() } } }
      };
      assertEquals(canAccessTemplate(settings, "advanced_weekly"), true);
    });
  },
});

Deno.test({
  name: "Plan Gate - calculateNewExpiry",
  fn: async (t) => {
    await t.step("calculates from today for no existing plan", () => {
      const result = calculateNewExpiry({}, "summer");
      const expectedDays = PLAN_DURATIONS_DAYS.summer;

      const today = new Date();
      const minExpiry = new Date(today);
      minExpiry.setDate(minExpiry.getDate() + expectedDays - 1);

      const maxExpiry = new Date(today);
      maxExpiry.setDate(maxExpiry.getDate() + expectedDays + 1);

      assertEquals(result >= minExpiry, true);
      assertEquals(result <= maxExpiry, true);
    });

    await t.step("extends from existing expiry for active plan", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);

      const settings = {
        apps: { choregami: { plan: { type: "summer", expires_at: future.toISOString() } } }
      };

      const result = calculateNewExpiry(settings, "full_year");

      // Should be 30 days + 365 days from now
      const minExpiry = new Date();
      minExpiry.setDate(minExpiry.getDate() + 30 + PLAN_DURATIONS_DAYS.full_year - 2);

      assertEquals(result >= minExpiry, true);
    });
  },
});

Deno.test({
  name: "Plan Gate - isTrialPlan",
  fn: async (t) => {
    await t.step("returns false for empty settings", () => {
      assertEquals(isTrialPlan({}), false);
    });

    await t.step("returns true for trial plan", () => {
      assertEquals(isTrialPlan({
        apps: { choregami: { plan: { type: "trial" } } }
      }), true);
    });

    await t.step("returns false for paid plan", () => {
      assertEquals(isTrialPlan({
        apps: { choregami: { plan: { type: "full_year" } } }
      }), false);
    });
  },
});

Deno.test({
  name: "Plan Gate - getTrialInfo",
  fn: async (t) => {
    await t.step("returns inactive for non-trial plan", () => {
      const result = getTrialInfo({});
      assertEquals(result.isActive, false);
      assertEquals(result.isExpired, false);
    });

    await t.step("returns active for valid trial", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);

      const result = getTrialInfo({
        apps: { choregami: {
          plan: { type: "trial", expires_at: future.toISOString() },
          trial: { started_at: new Date().toISOString() }
        }}
      });

      assertEquals(result.isActive, true);
      assertEquals(result.isExpired, false);
      assertEquals(result.daysRemaining > 0, true);
      assertEquals(result.isEnding, false); // 10 days left, not ending
    });

    await t.step("returns isEnding for last 5 days", () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);

      const result = getTrialInfo({
        apps: { choregami: {
          plan: { type: "trial", expires_at: future.toISOString() }
        }}
      });

      assertEquals(result.isActive, true);
      assertEquals(result.isEnding, true);
    });

    await t.step("returns expired for past expiry", () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);

      const result = getTrialInfo({
        apps: { choregami: {
          plan: { type: "trial", expires_at: past.toISOString() }
        }}
      });

      assertEquals(result.isActive, false);
      assertEquals(result.isExpired, true);
      assertEquals(result.daysRemaining, 0);
    });
  },
});

Deno.test({
  name: "Plan Gate - PLAN_DURATIONS_DAYS",
  fn: async (t) => {
    await t.step("has correct duration for trial", () => {
      assertEquals(PLAN_DURATIONS_DAYS.trial, 15);
    });

    await t.step("has correct duration for summer", () => {
      assertEquals(PLAN_DURATIONS_DAYS.summer, 90);
    });

    await t.step("has correct duration for school_year", () => {
      assertEquals(PLAN_DURATIONS_DAYS.school_year, 180);
    });

    await t.step("has correct duration for full_year", () => {
      assertEquals(PLAN_DURATIONS_DAYS.full_year, 365);
    });
  },
});
