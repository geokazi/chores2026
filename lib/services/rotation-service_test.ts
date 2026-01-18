/**
 * Rotation Service Tests
 */

import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { getDynamicChoresForChild, getDayOfYear } from "./rotation-service.ts";
import { getPresetByKey } from "../data/rotation-presets.ts";

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
