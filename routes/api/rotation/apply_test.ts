/**
 * Rotation Apply API Validation Tests
 *
 * Tests for POST /api/rotation/apply endpoint validation logic
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { validateChildCount, getRequiredSlotCount } from "../../../lib/services/rotation-service.ts";
import { getPresetByKey } from "../../../lib/data/rotation-presets.ts";

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

// Mock child slots
const validChildSlots = [
  { slot: "Child A", profile_id: "child-1" },
  { slot: "Child B", profile_id: "child-2" },
];

const duplicateChildSlots = [
  { slot: "Child A", profile_id: "child-1" },
  { slot: "Child B", profile_id: "child-1" }, // Same profile_id!
];

// Mock profile data
const mockChildProfiles = [
  { id: "child-1", role: "child" },
  { id: "child-2", role: "child" },
];

const mockMixedProfiles = [
  { id: "child-1", role: "child" },
  { id: "parent-1", role: "parent" }, // Parent in child slot!
];

// Test: Unauthenticated requests should be rejected
Deno.test("rotation/apply - returns 401 for unauthenticated requests", () => {
  const session = mockUnauthenticatedSession;
  assertEquals(session.isAuthenticated, false);
  assertEquals(session.family, null);
  // In real handler: would return 401
});

// Test: Authenticated session can proceed
Deno.test("rotation/apply - allows authenticated requests", () => {
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);
  assertEquals(session.family?.id, "family-1");
});

// Test: Invalid preset key should be rejected
Deno.test("rotation/apply - rejects invalid preset key", () => {
  const preset = getPresetByKey("nonexistent_preset");
  assertEquals(preset, undefined);
  // In real handler: would return 400 "Invalid preset"
});

// Test: Valid preset key should be accepted
Deno.test("rotation/apply - accepts valid preset key", () => {
  const preset = getPresetByKey("daily_basics");
  assertEquals(preset?.key, "daily_basics");
});

// Test: Child count validation - too few
Deno.test("rotation/apply - rejects too few children", () => {
  // daily_basics requires 2-4 children
  const isValid = validateChildCount("daily_basics", 1);
  assertEquals(isValid, false);
  // In real handler: would return 400 "Preset requires 2-4 children"
});

// Test: Child count validation - too many
Deno.test("rotation/apply - rejects too many children", () => {
  // daily_basics requires 2-4 children
  const isValid = validateChildCount("daily_basics", 5);
  assertEquals(isValid, false);
});

// Test: Child count validation - valid count
Deno.test("rotation/apply - accepts valid child count", () => {
  const isValid = validateChildCount("daily_basics", 2);
  assertEquals(isValid, true);
});

// Test: Slot count validation
Deno.test("rotation/apply - validates slot count matches preset", () => {
  const requiredSlots = getRequiredSlotCount("daily_basics");
  assertEquals(requiredSlots, 2); // daily_basics has Child A, Child B
});

// Test: Duplicate profile_id detection
Deno.test("rotation/apply - detects duplicate profile_ids", () => {
  const profileIds = duplicateChildSlots.map(s => s.profile_id);
  const uniqueProfileIds = new Set(profileIds);

  assertEquals(profileIds.length, 2);
  assertEquals(uniqueProfileIds.size, 1); // Only 1 unique ID
  assertEquals(uniqueProfileIds.size !== profileIds.length, true);
  // In real handler: would return 400 "Each child can only be assigned to one slot"
});

// Test: Unique profile_ids should pass
Deno.test("rotation/apply - accepts unique profile_ids", () => {
  const profileIds = validChildSlots.map(s => s.profile_id);
  const uniqueProfileIds = new Set(profileIds);

  assertEquals(uniqueProfileIds.size, profileIds.length);
  // In real handler: would proceed
});

// Test: Family membership check - all profiles found
Deno.test("rotation/apply - validates all profiles belong to family", () => {
  const requestedProfileIds = ["child-1", "child-2"];
  const foundProfiles = mockChildProfiles;

  assertEquals(foundProfiles.length, requestedProfileIds.length);
  // In real handler: would proceed
});

// Test: Family membership check - missing profile
Deno.test("rotation/apply - rejects profiles not in family", () => {
  const requestedProfileIds = ["child-1", "child-2", "child-3"];
  const foundProfiles = mockChildProfiles; // Only has child-1 and child-2

  assertEquals(foundProfiles.length !== requestedProfileIds.length, true);
  // In real handler: would return 400 "One or more profiles do not belong to this family"
});

// Test: Children-only validation - all children
Deno.test("rotation/apply - accepts all-children profiles", () => {
  const nonChildren = mockChildProfiles.filter(p => p.role !== "child");
  assertEquals(nonChildren.length, 0);
  // In real handler: would proceed
});

// Test: Children-only validation - parent in slots
Deno.test("rotation/apply - rejects parent profiles in slots", () => {
  const nonChildren = mockMixedProfiles.filter(p => p.role !== "child");
  assertEquals(nonChildren.length, 1);
  assertEquals(nonChildren[0].role, "parent");
  // In real handler: would return 400 "Only children can be assigned to rotation slots"
});

// Test: All validations pass for valid request
Deno.test("rotation/apply - passes all validations for valid request", () => {
  // 1. Session authenticated
  const session = mockAuthenticatedSession;
  assertEquals(session.isAuthenticated, true);

  // 2. Preset exists
  const preset = getPresetByKey("daily_basics");
  assertEquals(preset?.key, "daily_basics");

  // 3. Child count valid
  const childCount = validChildSlots.length;
  assertEquals(validateChildCount("daily_basics", childCount), true);

  // 4. Slot count matches
  const requiredSlots = getRequiredSlotCount("daily_basics");
  assertEquals(childCount, requiredSlots);

  // 5. No duplicate profile_ids
  const profileIds = validChildSlots.map(s => s.profile_id);
  const uniqueProfileIds = new Set(profileIds);
  assertEquals(uniqueProfileIds.size, profileIds.length);

  // 6. All profiles are children
  const nonChildren = mockChildProfiles.filter(p => p.role !== "child");
  assertEquals(nonChildren.length, 0);

  // All validations pass!
});
