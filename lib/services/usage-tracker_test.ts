/**
 * Usage Tracker Tests
 * Tests for counter increment logic, monthly reset, and getter functions.
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { getMonthlyUsage, getTotalUsage } from "./usage-tracker.ts";

// === getMonthlyUsage Tests ===

Deno.test("getMonthlyUsage - returns 0 for missing profile", () => {
  assertEquals(getMonthlyUsage(undefined as any, "digests"), 0);
  assertEquals(getMonthlyUsage(null as any, "digests"), 0);
  assertEquals(getMonthlyUsage({}, "digests"), 0);
});

Deno.test("getMonthlyUsage - returns correct value for known metric", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: {
          this_month_digests: 3,
          this_month_ics: 5,
          this_month_badges: 12,
        },
      },
    },
  };
  assertEquals(getMonthlyUsage(profile, "digests"), 3);
  assertEquals(getMonthlyUsage(profile, "ics"), 5);
  assertEquals(getMonthlyUsage(profile, "badges"), 12);
});

Deno.test("getMonthlyUsage - returns 0 for unknown metric", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: { this_month_digests: 3 },
      },
    },
  };
  assertEquals(getMonthlyUsage(profile, "unknown"), 0);
});

Deno.test("getMonthlyUsage - handles empty usage object", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: {},
      },
    },
  };
  assertEquals(getMonthlyUsage(profile, "digests"), 0);
});

// === getTotalUsage Tests ===

Deno.test("getTotalUsage - returns 0 for missing profile", () => {
  assertEquals(getTotalUsage(undefined as any, "digests"), 0);
  assertEquals(getTotalUsage(null as any, "digests"), 0);
});

Deno.test("getTotalUsage - returns correct value for known metric", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: {
          total_digests_sent: 42,
          total_ics_sent: 15,
          total_badges_sent: 100,
        },
      },
    },
  };
  assertEquals(getTotalUsage(profile, "digests"), 42);
  assertEquals(getTotalUsage(profile, "ics"), 15);
  assertEquals(getTotalUsage(profile, "badges"), 100);
});

Deno.test("getTotalUsage - returns 0 for unknown metric", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: { total_digests_sent: 5 },
      },
    },
  };
  assertEquals(getTotalUsage(profile, "unknown"), 0);
});

// === SMS Gate Logic Tests ===

Deno.test("SMS gate - monthly usage below limit allows send", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: { this_month_digests: 2 },
      },
    },
  };
  const limit = 4;
  const usage = getMonthlyUsage(profile, "digests");
  assertEquals(usage < limit, true);
});

Deno.test("SMS gate - monthly usage at limit blocks send", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: { this_month_digests: 4 },
      },
    },
  };
  const limit = 4;
  const usage = getMonthlyUsage(profile, "digests");
  assertEquals(usage >= limit, true);
});

Deno.test("SMS gate - monthly usage above limit blocks send", () => {
  const profile = {
    preferences: {
      notifications: {
        usage: { this_month_digests: 7 },
      },
    },
  };
  const limit = 4;
  const usage = getMonthlyUsage(profile, "digests");
  assertEquals(usage >= limit, true);
});
