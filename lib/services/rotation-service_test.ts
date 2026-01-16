/**
 * Rotation Service Tests
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  getRotationConfig,
  buildRotationConfig,
  getChoresForChild,
  getWeekTypeBadge,
  validateChildCount,
  getRequiredSlotCount,
} from "./rotation-service.ts";

Deno.test("getRotationConfig - returns null for empty settings", () => {
  const result = getRotationConfig({});
  assertEquals(result, null);
});

Deno.test("getRotationConfig - extracts rotation from nested JSONB", () => {
  const settings = {
    apps: {
      choregami: {
        rotation: {
          active_preset: "smart_rotation",
          start_date: "2026-01-15",
          child_slots: [{ slot: "Child A", profile_id: "uuid-1" }],
        },
      },
    },
  };

  const result = getRotationConfig(settings);
  assertExists(result);
  assertEquals(result?.active_preset, "smart_rotation");
  assertEquals(result?.child_slots.length, 1);
});

Deno.test("buildRotationConfig - creates valid config", () => {
  const config = buildRotationConfig("daily_basics", [
    { slot: "Child A", profile_id: "uuid-1" },
    { slot: "Child B", profile_id: "uuid-2" },
  ]);

  assertEquals(config.active_preset, "daily_basics");
  assertExists(config.start_date);
  assertEquals(config.child_slots.length, 2);
});

Deno.test("getChoresForChild - returns chores for valid config", () => {
  const config = {
    active_preset: "daily_basics",
    start_date: "2026-01-15",
    child_slots: [
      { slot: "Child A", profile_id: "test-child-id" },
      { slot: "Child B", profile_id: "other-child" },
    ],
  };

  const chores = getChoresForChild(config, "test-child-id");
  assertEquals(chores.length > 0, true);
});

Deno.test("getChoresForChild - returns empty array for unknown child", () => {
  const config = {
    active_preset: "daily_basics",
    start_date: "2026-01-15",
    child_slots: [{ slot: "Child A", profile_id: "other-child" }],
  };

  const chores = getChoresForChild(config, "unknown-child");
  assertEquals(chores.length, 0);
});

Deno.test("getWeekTypeBadge - returns badge for daily_basics", () => {
  const config = {
    active_preset: "daily_basics",
    start_date: "2026-01-15",
    child_slots: [],
  };

  const badge = getWeekTypeBadge(config);
  assertExists(badge);
  assertEquals(badge?.badge.includes("DAILY"), true);
});

Deno.test("validateChildCount - returns true for valid count", () => {
  assertEquals(validateChildCount("daily_basics", 2), true);
  assertEquals(validateChildCount("daily_basics", 3), true);
});

Deno.test("validateChildCount - returns false for invalid count", () => {
  assertEquals(validateChildCount("daily_basics", 1), false);
  assertEquals(validateChildCount("daily_basics", 5), false);
});

Deno.test("validateChildCount - returns false for unknown preset", () => {
  assertEquals(validateChildCount("nonexistent", 2), false);
});

Deno.test("getRequiredSlotCount - returns correct slot count", () => {
  assertEquals(getRequiredSlotCount("daily_basics"), 2);
  assertEquals(getRequiredSlotCount("smart_rotation"), 2);
  assertEquals(getRequiredSlotCount("weekend_warrior"), 2);
});

Deno.test("getRequiredSlotCount - returns 0 for unknown preset", () => {
  assertEquals(getRequiredSlotCount("nonexistent"), 0);
});
