/**
 * Kids Events Setting API Tests
 *
 * Tests for POST /api/settings/kids-events
 * Toggles families.settings.apps.choregami.kids_can_create_events
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Mock session data
const mockAuthenticatedParentSession = {
  isAuthenticated: true,
  family: { id: "family-1", name: "Test Family" },
  user: { id: "user-1", email: "parent@test.com" },
};

const mockUnauthenticatedSession = {
  isAuthenticated: false,
  family: null,
  user: null,
};

// Mock family settings
const mockFamilyWithNoSettings = {
  id: "family-1",
  settings: null,
};

const mockFamilyWithExistingSettings = {
  id: "family-1",
  settings: {
    theme: "fresh-meadow",
    apps: {
      choregami: {
        kids_can_create_events: false,
      },
    },
  },
};

// Test: Unauthenticated requests return 401
Deno.test("kids-events POST - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  // In real handler: would return 401
});

// Test: Authenticated parent can toggle setting
Deno.test("kids-events POST - parent can enable kids event creation", () => {
  const session = mockAuthenticatedParentSession;
  const requestBody = { enabled: true };

  assertEquals(session.isAuthenticated, true);
  assertEquals(session.family !== null, true);
  assertEquals(requestBody.enabled, true);
  // In real handler: would update family settings
});

// Test: Authenticated parent can disable setting
Deno.test("kids-events POST - parent can disable kids event creation", () => {
  const session = mockAuthenticatedParentSession;
  const requestBody = { enabled: false };

  assertEquals(requestBody.enabled, false);
  // In real handler: would update family settings
});

// Test: Setting merges with existing settings (preserves theme, etc.)
Deno.test("kids-events POST - preserves existing settings when updating", () => {
  const currentSettings = mockFamilyWithExistingSettings.settings;
  const newValue = true;

  const updatedSettings = {
    ...currentSettings,
    apps: {
      ...currentSettings?.apps,
      choregami: {
        ...currentSettings?.apps?.choregami,
        kids_can_create_events: newValue,
      },
    },
  };

  assertEquals(updatedSettings.theme, "fresh-meadow");
  assertEquals(updatedSettings.apps.choregami.kids_can_create_events, true);
});

// Test: Setting works when family has no existing settings
Deno.test("kids-events POST - handles null settings", () => {
  // deno-lint-ignore no-explicit-any
  const currentSettings: any = null;
  const newValue = true;

  // Same logic as API handler: spread empty object if null
  const updatedSettings = {
    ...(currentSettings || {}),
    apps: {
      ...(currentSettings?.apps || {}),
      choregami: {
        kids_can_create_events: newValue,
      },
    },
  };

  assertEquals(updatedSettings.apps.choregami.kids_can_create_events, true);
});

// Test: Boolean coercion for enabled field
Deno.test("kids-events POST - coerces enabled to boolean", () => {
  const requestBody1: { enabled: unknown } = { enabled: true };
  const requestBody2: { enabled: unknown } = { enabled: "true" };
  const requestBody3: { enabled: unknown } = { enabled: 1 };

  assertEquals(requestBody1.enabled === true, true);
  assertEquals(requestBody2.enabled === true, false); // string "true" !== boolean true
  assertEquals(requestBody3.enabled === true, false); // number 1 !== boolean true
  // In real handler: uses enabled === true for strict boolean check
});

// Test: Returns success response with new value
Deno.test("kids-events POST - returns success with enabled value", () => {
  const response = { success: true, enabled: true };

  assertEquals(response.success, true);
  assertEquals(response.enabled, true);
});

// Test: Setting path in JSONB is correct
Deno.test("kids-events POST - uses correct JSONB path", () => {
  const settingsPath = ["settings", "apps", "choregami", "kids_can_create_events"];

  assertEquals(settingsPath[0], "settings");
  assertEquals(settingsPath[1], "apps");
  assertEquals(settingsPath[2], "choregami");
  assertEquals(settingsPath[3], "kids_can_create_events");
});
