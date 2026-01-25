/**
 * Rotation Service Tests
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { getDynamicChoresForChild, getDayOfYear, getChoresForChild, findChoreByKey } from "./rotation-service.ts";
import { getPresetByKey } from "../data/rotation-presets.ts";
import type { RotationConfig, CustomChore } from "../types/rotation.ts";

Deno.test("getDayOfYear - returns correct day number", () => {
  // Jan 1 should be day 1
  const jan1 = new Date("2026-01-01T12:00:00");
  assertEquals(getDayOfYear(jan1), 1);

  // Jan 17 should be day 17
  const jan17 = new Date("2026-01-17T12:00:00");
  assertEquals(getDayOfYear(jan17), 17);
});

Deno.test("getDynamicChoresForChild - distributes chores correctly", () => {
  const preset = getPresetByKey("dynamic_daily");
  if (!preset) throw new Error("Preset not found");

  const participantIds = ["kid1", "kid2", "kid3"];
  const date = new Date("2026-01-17T12:00:00"); // Day 17

  // Get chores for each kid
  const kid1Chores = getDynamicChoresForChild(preset, participantIds, "kid1", date);
  const kid2Chores = getDynamicChoresForChild(preset, participantIds, "kid2", date);
  const kid3Chores = getDynamicChoresForChild(preset, participantIds, "kid3", date);

  // All kids should have 'all' chores (e.g., make_bed, brush_teeth)
  const allChoreKeys = preset.chores.filter(c => c.distribution === 'all').map(c => c.key);
  for (const key of allChoreKeys) {
    assertEquals(kid1Chores.some(c => c.key === key), true, `Kid1 missing ${key}`);
    assertEquals(kid2Chores.some(c => c.key === key), true, `Kid2 missing ${key}`);
    assertEquals(kid3Chores.some(c => c.key === key), true, `Kid3 missing ${key}`);
  }

  // Each rotating chore should be assigned to exactly one kid
  const rotateChoreKeys = preset.chores.filter(c => c.distribution === 'rotate').map(c => c.key);
  for (const key of rotateChoreKeys) {
    const hasChore = [
      kid1Chores.some(c => c.key === key),
      kid2Chores.some(c => c.key === key),
      kid3Chores.some(c => c.key === key),
    ];
    const assignedCount = hasChore.filter(Boolean).length;
    assertEquals(assignedCount, 1, `Rotating chore ${key} should be assigned to exactly 1 kid`);
  }
});

Deno.test("getDynamicChoresForChild - rotation shifts daily", () => {
  const preset = getPresetByKey("dynamic_daily");
  if (!preset) throw new Error("Preset not found");

  const participantIds = ["kid1", "kid2"];
  const day1 = new Date("2026-01-17T12:00:00");
  const day2 = new Date("2026-01-18T12:00:00");

  // Get rotating chores for kid1 on two consecutive days
  const kid1Day1 = getDynamicChoresForChild(preset, participantIds, "kid1", day1);
  const kid1Day2 = getDynamicChoresForChild(preset, participantIds, "kid1", day2);

  // The rotating chores should be different between days
  const rotatingChores1 = kid1Day1.filter(c => c.distribution === 'rotate').map(c => c.key);
  const rotatingChores2 = kid1Day2.filter(c => c.distribution === 'rotate').map(c => c.key);

  // At least some rotating chores should be different
  const different = rotatingChores1.some(key => !rotatingChores2.includes(key)) ||
                    rotatingChores2.some(key => !rotatingChores1.includes(key));
  assertEquals(different, true, "Rotating chores should shift between days");
});

Deno.test("getDynamicChoresForChild - returns empty for non-participant", () => {
  const preset = getPresetByKey("dynamic_daily");
  if (!preset) throw new Error("Preset not found");

  const participantIds = ["kid1", "kid2"];
  const date = new Date("2026-01-17T12:00:00");

  // Kid3 is not in the participant list
  const kid3Chores = getDynamicChoresForChild(preset, participantIds, "kid3", date);
  assertEquals(kid3Chores.length, 0);
});

// Custom Assignment Mode Tests
Deno.test("getChoresForChild - custom mode returns only assigned chores", () => {
  const config: RotationConfig = {
    active_preset: "smart_rotation",
    start_date: "2026-01-01",
    child_slots: [
      { slot: "Child A", profile_id: "kid1" },
      { slot: "Child B", profile_id: "kid2" },
    ],
    assignment_mode: "custom",
    customizations: {
      custom_assignments: {
        "kid1": ["vacuum_living", "take_trash"],
        "kid2": ["mop_kitchen", "feed_pet"],
      },
    },
  };

  const date = new Date("2026-01-17T12:00:00");

  // Kid1 should only get vacuum_living and take_trash
  const kid1Chores = getChoresForChild(config, "kid1", date);
  const kid1Keys = kid1Chores.map(c => c.key);
  assertEquals(kid1Keys.length, 2);
  assertEquals(kid1Keys.includes("vacuum_living"), true);
  assertEquals(kid1Keys.includes("take_trash"), true);
  assertEquals(kid1Keys.includes("mop_kitchen"), false);

  // Kid2 should only get mop_kitchen and feed_pet
  const kid2Chores = getChoresForChild(config, "kid2", date);
  const kid2Keys = kid2Chores.map(c => c.key);
  assertEquals(kid2Keys.length, 2);
  assertEquals(kid2Keys.includes("mop_kitchen"), true);
  assertEquals(kid2Keys.includes("feed_pet"), true);
  assertEquals(kid2Keys.includes("vacuum_living"), false);
});

Deno.test("getChoresForChild - custom mode includes family custom chores", () => {
  const familyCustomChores: CustomChore[] = [
    { key: "custom_feed_fish", name: "Feed the fish", points: 1 },
  ];

  const config: RotationConfig = {
    active_preset: "smart_rotation",
    start_date: "2026-01-01",
    child_slots: [
      { slot: "Child A", profile_id: "kid1" },
    ],
    assignment_mode: "custom",
    customizations: {
      custom_assignments: {
        "kid1": ["vacuum_living", "custom_feed_fish"],
      },
    },
  };

  const date = new Date("2026-01-17T12:00:00");
  const chores = getChoresForChild(config, "kid1", date, familyCustomChores);
  const keys = chores.map(c => c.key);

  assertEquals(keys.length, 2);
  assertEquals(keys.includes("vacuum_living"), true);
  assertEquals(keys.includes("custom_feed_fish"), true);

  // Custom chore should have correct properties
  const fishChore = chores.find(c => c.key === "custom_feed_fish");
  assertEquals(fishChore?.name, "Feed the fish");
  assertEquals(fishChore?.points, 1);
});

Deno.test("getChoresForChild - custom mode applies point overrides", () => {
  const config: RotationConfig = {
    active_preset: "smart_rotation",
    start_date: "2026-01-01",
    child_slots: [
      { slot: "Child A", profile_id: "kid1" },
    ],
    assignment_mode: "custom",
    customizations: {
      chore_overrides: {
        "vacuum_living": { points: 5 },  // Override from 2 to 5
      },
      custom_assignments: {
        "kid1": ["vacuum_living", "take_trash"],
      },
    },
  };

  const date = new Date("2026-01-17T12:00:00");
  const chores = getChoresForChild(config, "kid1", date);

  const vacuumChore = chores.find(c => c.key === "vacuum_living");
  assertEquals(vacuumChore?.points, 5);  // Should be overridden

  const trashChore = chores.find(c => c.key === "take_trash");
  assertEquals(trashChore?.points, 1);  // Should be original
});

Deno.test("findChoreByKey - finds preset chores", () => {
  const preset = getPresetByKey("smart_rotation");
  if (!preset) throw new Error("Preset not found");

  const chore = findChoreByKey(preset, undefined, "vacuum_living");
  assertEquals(chore?.name, "Vacuum living room");
  assertEquals(chore?.points, 3);
});

Deno.test("findChoreByKey - finds family custom chores", () => {
  const preset = getPresetByKey("smart_rotation");
  if (!preset) throw new Error("Preset not found");

  const familyCustomChores: CustomChore[] = [
    { key: "custom_homework", name: "Do homework", points: 3 },
  ];

  const chore = findChoreByKey(preset, familyCustomChores, "custom_homework");
  assertEquals(chore?.name, "Do homework");
  assertEquals(chore?.points, 3);
  assertEquals(chore?.category, "custom");
});

Deno.test("findChoreByKey - returns undefined for unknown key", () => {
  const preset = getPresetByKey("smart_rotation");
  if (!preset) throw new Error("Preset not found");

  const chore = findChoreByKey(preset, undefined, "nonexistent_chore");
  assertEquals(chore, undefined);
});
