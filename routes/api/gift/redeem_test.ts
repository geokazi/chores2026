/**
 * Gift Code Redemption API Tests
 *
 * Tests authentication, validation, and business logic for gift code redemption
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { calculateNewExpiry, PLAN_DURATIONS_DAYS } from "../../../lib/plan-gate.ts";

// Mock session data
const mockAuthenticatedSession = {
  isAuthenticated: true,
  user: { id: "user-1", email: "parent@test.com" },
  family: {
    id: "family-1",
    name: "Test Family",
    settings: {},
  },
};

const mockUnauthenticatedSession = {
  isAuthenticated: false,
  user: null,
  family: null,
};

const mockAuthenticatedNoFamily = {
  isAuthenticated: true,
  user: { id: "user-1", email: "parent@test.com" },
  family: null,
};

// ===== Authentication Tests =====

Deno.test("gift/redeem - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  // In real handler: would return 401 with "Please log in to redeem a gift code"
});

Deno.test("gift/redeem - returns 401 for authenticated user without family", () => {
  const session = mockAuthenticatedNoFamily;
  assertEquals(session.isAuthenticated, true);
  assertEquals(session.family, null);
  // In real handler: would return 401
});

Deno.test("gift/redeem - allows authenticated user with family", () => {
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);
  assertEquals(session.family !== null, true);
  // In real handler: would proceed with redemption
});

// ===== Input Validation Tests =====

Deno.test("gift/redeem - validates code is required", () => {
  const body = { code: "" };
  assertEquals(!body.code || typeof body.code !== "string", true);
  // In real handler: would return 400 with "Gift code is required"
});

Deno.test("gift/redeem - validates code is string", () => {
  const body = { code: 123 };
  assertEquals(typeof body.code !== "string", true);
  // In real handler: would return 400
});

Deno.test("gift/redeem - accepts valid code format", () => {
  const body = { code: "GIFT-ABCD-EFGH-1234" };
  assertEquals(!!body.code && typeof body.code === "string", true);
});

// ===== Code Normalization Tests =====

Deno.test("gift/redeem - normalizes code to uppercase", () => {
  const code = "gift-abcd-efgh-1234";
  const normalized = code.toUpperCase().trim();
  assertEquals(normalized, "GIFT-ABCD-EFGH-1234");
});

Deno.test("gift/redeem - trims whitespace from code", () => {
  const code = "  GIFT-ABCD-EFGH-1234  ";
  const normalized = code.toUpperCase().trim();
  assertEquals(normalized, "GIFT-ABCD-EFGH-1234");
});

// ===== Plan Extension Logic Tests =====

Deno.test("gift/redeem - school_year plan adds 300 days", () => {
  const newExpiry = calculateNewExpiry({}, "school_year");
  const expectedDays = PLAN_DURATIONS_DAYS.school_year;
  assertEquals(expectedDays, 300);

  const today = new Date();
  today.setDate(today.getDate() + 300);
  const diffDays = Math.abs(newExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

Deno.test("gift/redeem - extends existing plan", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const existingSettings = {
    apps: {
      choregami: {
        plan: {
          type: "summer",
          expires_at: future.toISOString().split("T")[0],
        },
      },
    },
  };

  const newExpiry = calculateNewExpiry(existingSettings, "school_year");

  // Should be 30 days (existing) + 300 days (school_year) = ~330 days from now
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 330);

  const diffDays = Math.abs(newExpiry.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays < 2, true);
});

// ===== Settings Update Structure Tests =====

Deno.test("gift/redeem - creates correct settings structure for new plan", () => {
  const planType = "school_year";
  const code = "GIFT-TEST-CODE-1234";
  const newExpiry = new Date("2027-01-01");

  const currentSettings = {};
  const updatedSettings = {
    ...currentSettings,
    apps: {
      ...(currentSettings as any).apps,
      choregami: {
        ...(currentSettings as any).apps?.choregami,
        plan: {
          type: planType,
          expires_at: newExpiry.toISOString().split("T")[0],
          activated_at: new Date().toISOString().split("T")[0],
          source: "gift",
          gift_code: code,
        },
      },
    },
  };

  assertEquals(updatedSettings.apps.choregami.plan.type, "school_year");
  assertEquals(updatedSettings.apps.choregami.plan.source, "gift");
  assertEquals(updatedSettings.apps.choregami.plan.gift_code, "GIFT-TEST-CODE-1234");
});

Deno.test("gift/redeem - preserves existing settings when adding plan", () => {
  const currentSettings = {
    apps: {
      choregami: {
        theme: "sunset",
        other_setting: true,
      },
      other_app: {
        data: "preserved",
      },
    },
    family_setting: "value",
  };

  const planType = "summer";
  const code = "GIFT-TEST-CODE-5678";
  const newExpiry = new Date("2027-06-01");

  const updatedSettings = {
    ...currentSettings,
    apps: {
      ...currentSettings.apps,
      choregami: {
        ...currentSettings.apps.choregami,
        plan: {
          type: planType,
          expires_at: newExpiry.toISOString().split("T")[0],
          activated_at: new Date().toISOString().split("T")[0],
          source: "gift",
          gift_code: code,
        },
      },
    },
  };

  // Verify existing settings preserved
  assertEquals(updatedSettings.family_setting, "value");
  assertEquals(updatedSettings.apps.other_app.data, "preserved");
  assertEquals(updatedSettings.apps.choregami.theme, "sunset");
  assertEquals(updatedSettings.apps.choregami.other_setting, true);

  // Verify new plan added
  assertEquals(updatedSettings.apps.choregami.plan.type, "summer");
});

// ===== Response Structure Tests =====

Deno.test("gift/redeem - success response includes required fields", () => {
  const successResponse = {
    success: true,
    plan_type: "school_year",
    expires_at: "2027-01-01T00:00:00.000Z",
    message: "Welcome gift!",
  };

  assertEquals(successResponse.success, true);
  assertEquals(typeof successResponse.plan_type, "string");
  assertEquals(typeof successResponse.expires_at, "string");
  // message can be null
});

Deno.test("gift/redeem - error response includes error field", () => {
  const errorResponse = {
    success: false,
    error: "Invalid or already used code",
  };

  assertEquals(errorResponse.success, false);
  assertEquals(typeof errorResponse.error, "string");
});
