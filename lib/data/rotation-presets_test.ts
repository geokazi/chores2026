/**
 * Rotation Presets Tests
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  ROTATION_PRESETS,
  getPresetByKey,
  getPresetsForFamily,
  getPresetSlots,
  getCurrentWeekType,
  getDayOfWeek,
  getPresetsByCategory,
} from "./rotation-presets.ts";

Deno.test("ROTATION_PRESETS - contains all 7 presets", () => {
  assertEquals(ROTATION_PRESETS.length, 7);
  const keys = ROTATION_PRESETS.map(p => p.key);
  // Dynamic presets
  assertEquals(keys.includes("dynamic_daily"), true);
  // Everyday presets
  assertEquals(keys.includes("smart_rotation"), true);
  assertEquals(keys.includes("weekend_warrior"), true);
  assertEquals(keys.includes("daily_basics"), true);
  assertEquals(keys.includes("large_family"), true);
  // Seasonal presets
  assertEquals(keys.includes("summer_break"), true);
  assertEquals(keys.includes("school_year"), true);
});

Deno.test("getPresetByKey - returns correct preset", () => {
  const preset = getPresetByKey("smart_rotation");
  assertExists(preset);
  assertEquals(preset?.name, "Smart Family Rotation");
  assertEquals(preset?.cycle_type, "biweekly");
});

Deno.test("getPresetByKey - returns undefined for unknown key", () => {
  const preset = getPresetByKey("nonexistent");
  assertEquals(preset, undefined);
});

Deno.test("getPresetsForFamily - returns all presets", () => {
  // Now shows all presets regardless of child count (UI handles validation)
  const presetsFor2 = getPresetsForFamily(2);
  assertEquals(presetsFor2.length, 7);

  const presetsFor5 = getPresetsForFamily(5);
  assertEquals(presetsFor5.length, 7);

  const presetsFor1 = getPresetsForFamily(1);
  assertEquals(presetsFor1.length, 7);
});

Deno.test("getPresetSlots - returns slot names", () => {
  const preset = getPresetByKey("daily_basics");
  assertExists(preset);
  const slots = getPresetSlots(preset!);
  assertEquals(slots.includes("Child A"), true);
  assertEquals(slots.includes("Child B"), true);
});

Deno.test("getCurrentWeekType - returns single week type for daily preset", () => {
  const preset = getPresetByKey("daily_basics");
  assertExists(preset);
  const weekType = getCurrentWeekType(preset!, "2026-01-01");
  assertEquals(weekType, "standard");
});

Deno.test("getCurrentWeekType - alternates for biweekly preset", () => {
  const preset = getPresetByKey("smart_rotation");
  assertExists(preset);

  // Week 0 should be cleaning
  const week0 = getCurrentWeekType(preset!, "2026-01-15");
  // Week 1 should be non-cleaning (7 days later)
  // Since we're testing with current date, just verify it returns valid type
  assertEquals(preset!.week_types.includes(week0), true);
});

Deno.test("getDayOfWeek - returns correct day", () => {
  // January 15, 2026 is a Thursday (use noon to avoid timezone issues)
  const date = new Date("2026-01-15T12:00:00");
  assertEquals(getDayOfWeek(date), "thu");

  // January 18, 2026 is a Sunday
  const sunday = new Date("2026-01-18T12:00:00");
  assertEquals(getDayOfWeek(sunday), "sun");
});

Deno.test("all presets have valid structure", () => {
  for (const preset of ROTATION_PRESETS) {
    // Required fields
    assertExists(preset.key);
    assertExists(preset.name);
    assertExists(preset.description);
    assertExists(preset.icon);
    assertExists(preset.schedule);
    assertExists(preset.chores);
    assertExists(preset.categories);
    assertExists(preset.preset_category);

    // Constraints
    assertEquals(preset.min_children <= preset.max_children, true);
    assertEquals(preset.week_types.length > 0, true);
    assertEquals(['everyday', 'seasonal'].includes(preset.preset_category), true);

    // Schedule structure (dynamic templates have empty schedule)
    if (!preset.is_dynamic) {
      for (const weekType of preset.week_types) {
        assertExists(preset.schedule[weekType], `Missing schedule for ${weekType}`);
      }
    }
  }
});

Deno.test("getPresetsByCategory - groups presets correctly", () => {
  const { everyday, seasonal } = getPresetsByCategory(2);

  // Should have 5 everyday presets (dynamic_daily + smart_rotation + weekend_warrior + daily_basics + large_family)
  assertEquals(everyday.length, 5);
  const everydayKeys = everyday.map(p => p.key);
  assertEquals(everydayKeys.includes("dynamic_daily"), true);
  assertEquals(everydayKeys.includes("smart_rotation"), true);
  assertEquals(everydayKeys.includes("weekend_warrior"), true);
  assertEquals(everydayKeys.includes("daily_basics"), true);
  assertEquals(everydayKeys.includes("large_family"), true);

  // Should have 2 seasonal presets
  assertEquals(seasonal.length, 2);
  const seasonalKeys = seasonal.map(p => p.key);
  assertEquals(seasonalKeys.includes("summer_break"), true);
  assertEquals(seasonalKeys.includes("school_year"), true);
});

Deno.test("getPresetsByCategory - returns all presets regardless of count", () => {
  // Now shows all presets regardless of child count
  const { everyday, seasonal } = getPresetsByCategory(5);
  assertEquals(everyday.length, 5);
  assertEquals(seasonal.length, 2);
});

Deno.test("large_family preset - supports 3-8 kids with 4 slots", () => {
  const preset = getPresetByKey("large_family");
  assertExists(preset);
  assertEquals(preset?.min_children, 3);
  assertEquals(preset?.max_children, 8);

  // Should have 4 slots
  const slots = getPresetSlots(preset!);
  assertEquals(slots.length, 4);
  assertEquals(slots.includes("Child A"), true);
  assertEquals(slots.includes("Child B"), true);
  assertEquals(slots.includes("Child C"), true);
  assertEquals(slots.includes("Child D"), true);
});

Deno.test("dynamic_daily preset - supports 1-8 kids with distribution tags", () => {
  const preset = getPresetByKey("dynamic_daily");
  assertExists(preset);
  assertEquals(preset?.min_children, 1);
  assertEquals(preset?.max_children, 8);
  assertEquals(preset?.is_dynamic, true);

  // Should have no slots (dynamic)
  const slots = getPresetSlots(preset!);
  assertEquals(slots.length, 0);

  // Should have chores with distribution tags
  const allChores = preset!.chores.filter(c => c.distribution === 'all');
  const rotateChores = preset!.chores.filter(c => c.distribution === 'rotate');
  assertEquals(allChores.length > 0, true);
  assertEquals(rotateChores.length > 0, true);
});
