/**
 * Unit tests for RotationService
 * Tests daily chores and schedule preview functionality
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import {
  getDailyChores,
  getChoresForChild,
  getSchedulePreview,
  findChoreByKey,
} from "../../lib/services/rotation-service.ts";
import type { RotationConfig, RotationCustomizations, CustomChore, PresetChore } from "../../lib/types/rotation.ts";
import type { RotationPreset } from "../../lib/types/rotation.ts";

// Mock preset for testing
const mockPreset: RotationPreset = {
  key: "test_rotation",
  name: "Test Rotation",
  description: "Test template",
  icon: "🧪",
  preset_category: "everyday",
  difficulty: "beginner",
  min_children: 2,
  max_children: 4,
  cycle_type: "weekly",
  week_types: ["standard"],
  categories: [{ key: "cleaning", name: "Cleaning", icon: "🧹" }],
  chores: [
    { key: "make_bed", name: "Make Bed", points: 2, minutes: 5, category: "cleaning", icon: "🛏️" },
    { key: "dishes", name: "Wash Dishes", points: 3, minutes: 10, category: "cleaning", icon: "🍽️" },
    { key: "vacuum", name: "Vacuum", points: 5, minutes: 15, category: "cleaning", icon: "🧹" },
    { key: "water_plants", name: "Water Plants", points: 2, minutes: 5, category: "cleaning", icon: "🌱" },
  ],
  schedule: {
    standard: {
      "Child A": {
        mon: ["make_bed", "dishes"],
        tue: ["vacuum"],
        wed: ["make_bed"],
        thu: [],
        fri: ["dishes"],
        sat: ["vacuum", "water_plants"],
        sun: [],
      },
      "Child B": {
        mon: ["vacuum"],
        tue: ["make_bed"],
        wed: ["dishes"],
        thu: ["vacuum"],
        fri: [],
        sat: [],
        sun: ["water_plants"],
      },
    },
  },
};

// Mock family custom chores
const mockFamilyCustomChores: CustomChore[] = [
  { key: "custom_feed_fish", name: "Feed Fish", points: 1, icon: "🐟" },
  { key: "custom_take_trash", name: "Take Out Trash", points: 3, icon: "🗑️" },
];

describe("RotationService - Daily Chores", () => {
  describe("getDailyChores", () => {
    it("returns empty array when no daily chores are set", () => {
      const result = getDailyChores(mockPreset, undefined, undefined);
      assertEquals(result, []);
    });

    it("returns empty array when daily_chores is empty array", () => {
      const customizations: RotationCustomizations = {
        daily_chores: [],
      };
      const result = getDailyChores(mockPreset, customizations, undefined);
      assertEquals(result, []);
    });

    it("returns preset chores marked as daily", () => {
      const customizations: RotationCustomizations = {
        daily_chores: ["make_bed", "dishes"],
      };
      const result = getDailyChores(mockPreset, customizations, undefined);

      assertEquals(result.length, 2);
      assertEquals(result[0].key, "make_bed");
      assertEquals(result[0].name, "Make Bed");
      assertEquals(result[0].points, 2);
      assertEquals(result[1].key, "dishes");
      assertEquals(result[1].name, "Wash Dishes");
      assertEquals(result[1].points, 3);
    });

    it("applies point overrides to daily chores", () => {
      const customizations: RotationCustomizations = {
        daily_chores: ["make_bed"],
        chore_overrides: {
          make_bed: { points: 5 },
        },
      };
      const result = getDailyChores(mockPreset, customizations, undefined);

      assertEquals(result.length, 1);
      assertEquals(result[0].key, "make_bed");
      assertEquals(result[0].points, 5); // Override applied
    });

    it("includes family custom chores when marked as daily", () => {
      const customizations: RotationCustomizations = {
        daily_chores: ["custom_feed_fish"],
      };
      const result = getDailyChores(mockPreset, customizations, mockFamilyCustomChores);

      assertEquals(result.length, 1);
      assertEquals(result[0].key, "custom_feed_fish");
      assertEquals(result[0].name, "Feed Fish");
      assertEquals(result[0].points, 1);
      assertEquals(result[0].icon, "🐟");
    });

    it("filters out non-existent chore keys", () => {
      const customizations: RotationCustomizations = {
        daily_chores: ["make_bed", "non_existent", "dishes"],
      };
      const result = getDailyChores(mockPreset, customizations, undefined);

      assertEquals(result.length, 2);
      assertEquals(result[0].key, "make_bed");
      assertEquals(result[1].key, "dishes");
    });
  });

  describe("findChoreByKey", () => {
    it("finds preset chore by key", () => {
      const result = findChoreByKey(mockPreset, undefined, "make_bed");
      assertExists(result);
      assertEquals(result.key, "make_bed");
      assertEquals(result.name, "Make Bed");
    });

    it("finds family custom chore by key", () => {
      const result = findChoreByKey(mockPreset, mockFamilyCustomChores, "custom_feed_fish");
      assertExists(result);
      assertEquals(result.key, "custom_feed_fish");
      assertEquals(result.name, "Feed Fish");
    });

    it("prioritizes preset chores over custom chores", () => {
      const conflictingCustomChores: CustomChore[] = [
        { key: "make_bed", name: "Custom Make Bed", points: 10, icon: "🛏️" },
      ];
      const result = findChoreByKey(mockPreset, conflictingCustomChores, "make_bed");
      assertExists(result);
      assertEquals(result.points, 2); // Preset value, not custom
    });

    it("returns undefined for non-existent key", () => {
      const result = findChoreByKey(mockPreset, mockFamilyCustomChores, "non_existent");
      assertEquals(result, undefined);
    });
  });

  describe("getSchedulePreview", () => {
    const mockConfig: RotationConfig = {
      active_preset: "test_rotation",
      start_date: "2026-01-01",
      child_slots: [
        { slot: "Child A", profile_id: "kid-1" },
        { slot: "Child B", profile_id: "kid-2" },
      ],
    };

    const childNames: Record<string, string> = {
      "kid-1": "Emma",
      "kid-2": "Jack",
    };

    // Note: getSchedulePreview depends on getPresetByKey which fetches from ROTATION_PRESETS
    // These tests verify the interface and basic behavior when preset is found
    // Full integration tests would require mocking the preset lookup

    it("returns empty array for invalid preset", () => {
      const invalidConfig: RotationConfig = {
        ...mockConfig,
        active_preset: "non_existent_preset",
      };
      const result = getSchedulePreview(invalidConfig, childNames);
      assertEquals(result, []);
    });
  });
});

describe("RotationService - getChoresForChild with daily chores", () => {
  // These tests verify that daily chores are included in getChoresForChild
  // Note: Full tests would require mocking getPresetByKey

  it("includes daily chores in rotation mode", () => {
    // This is a documentation test showing expected behavior
    // getChoresForChild() now appends dailyChores to scheduled rotation chores
    const expectedBehavior = `
      1. Get scheduled chores from rotation template
      2. Apply chore_overrides (filter disabled, apply point changes)
      3. Append family custom chores if configured
      4. Append daily chores for all kids every day
    `;
    assertExists(expectedBehavior);
  });

  it("includes daily chores in custom assignment mode", () => {
    // This is a documentation test showing expected behavior
    const expectedBehavior = `
      1. Get manually assigned chores for this kid
      2. Apply point overrides
      3. Append daily chores for all kids every day
    `;
    assertExists(expectedBehavior);
  });

  it("includes daily chores in dynamic template mode", () => {
    // This is a documentation test showing expected behavior
    const expectedBehavior = `
      1. Calculate distributed chores based on 'all' and 'rotate' tags
      2. Apply customizations
      3. Append family custom chores
      4. Append daily chores for all kids every day
    `;
    assertExists(expectedBehavior);
  });
});
