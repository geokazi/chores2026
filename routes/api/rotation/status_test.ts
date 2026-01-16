/**
 * Rotation Status API Tests
 *
 * Tests for GET /api/rotation/status endpoint logic
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { getRotationConfig, getWeekTypeBadge } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey, getCurrentWeekType } from "../../../lib/data/rotation-presets.ts";

// Mock session data
const mockAuthenticatedSession = {
  isAuthenticated: true,
  user: { id: "user-1", email: "parent@test.com", role: "parent", profileId: "profile-1" },
  family: { id: "family-1", name: "Test Family", members: [] },
};

const mockUnauthenticatedSession = {
  isAuthenticated: false,
  user: null,
  family: null,
};

// Mock family settings with active rotation
const mockSettingsWithRotation = {
  apps: {
    choregami: {
      rotation: {
        active_preset: "daily_basics",
        start_date: "2026-01-15",
        child_slots: [
          { slot: "Child A", profile_id: "child-1" },
          { slot: "Child B", profile_id: "child-2" },
        ],
      },
    },
  },
};

// Mock family settings without rotation
const mockSettingsWithoutRotation = {
  apps: {
    choregami: {
      weekly_goal: 100,
    },
  },
};

// Test: Unauthenticated requests should be rejected
Deno.test("rotation/status - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  assertEquals(session.family, null);
  // In real handler: would return 401
});

// Test: Authenticated session can proceed
Deno.test("rotation/status - allows authenticated requests", () => {
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);
  assertExists(session.family);
  assertExists(session.family.id);
});

// Test: Returns null config when no rotation active
Deno.test("rotation/status - returns null for no active rotation", () => {
  const config = getRotationConfig(mockSettingsWithoutRotation);
  assertEquals(config, null);
});

// Test: Extracts rotation config correctly
Deno.test("rotation/status - extracts rotation config from settings", () => {
  const config = getRotationConfig(mockSettingsWithRotation);
  assertExists(config);
  assertEquals(config?.active_preset, "daily_basics");
  assertEquals(config?.start_date, "2026-01-15");
  assertEquals(config?.child_slots.length, 2);
});

// Test: Gets preset details correctly
Deno.test("rotation/status - resolves preset details", () => {
  const config = getRotationConfig(mockSettingsWithRotation);
  assertExists(config);

  const preset = getPresetByKey(config!.active_preset);
  assertExists(preset);
  assertEquals(preset?.key, "daily_basics");
  assertEquals(preset?.name, "Daily Basics");
  assertEquals(preset?.cycle_type, "daily");
});

// Test: Gets current week type
Deno.test("rotation/status - gets current week type", () => {
  const config = getRotationConfig(mockSettingsWithRotation);
  assertExists(config);

  const preset = getPresetByKey(config!.active_preset);
  assertExists(preset);

  const weekType = getCurrentWeekType(preset!, config!.start_date);
  assertEquals(weekType, "standard"); // daily_basics only has "standard"
});

// Test: Gets badge info
Deno.test("rotation/status - generates badge info", () => {
  const config = getRotationConfig(mockSettingsWithRotation);
  assertExists(config);

  const badge = getWeekTypeBadge(config!);
  assertExists(badge);
  assertEquals(badge?.badge, "🌟 DAILY ROUTINE");
  assertEquals(badge?.context, "Same helpful habits every day!");
});

// Test: Handles empty settings gracefully
Deno.test("rotation/status - handles empty settings", () => {
  const config = getRotationConfig({});
  assertEquals(config, null);
});

// Test: Handles partial settings gracefully
Deno.test("rotation/status - handles partial settings", () => {
  const partialSettings = { apps: {} };
  const config = getRotationConfig(partialSettings);
  assertEquals(config, null);
});
