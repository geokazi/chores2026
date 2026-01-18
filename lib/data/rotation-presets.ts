/**
 * Rotation Presets Registry
 * Central registry + helper functions for all rotation presets
 */

import type { RotationPreset, DayOfWeek } from "../types/rotation.ts";
import { SMART_ROTATION_PRESET } from "./presets/smart-rotation.ts";
import { WEEKEND_WARRIOR_PRESET } from "./presets/weekend-warrior.ts";
import { DAILY_BASICS_PRESET } from "./presets/daily-basics.ts";
import { SUMMER_BREAK_PRESET } from "./presets/summer-break.ts";
import { SCHOOL_YEAR_PRESET } from "./presets/school-year.ts";
import { LARGE_FAMILY_PRESET } from "./presets/large-family.ts";

// All available presets
export const ROTATION_PRESETS: RotationPreset[] = [
  // Everyday templates
  SMART_ROTATION_PRESET,
  WEEKEND_WARRIOR_PRESET,
  DAILY_BASICS_PRESET,
  LARGE_FAMILY_PRESET,  // For 3-8 kids with 4 slots
  // Seasonal templates
  SUMMER_BREAK_PRESET,
  SCHOOL_YEAR_PRESET,
];

// Get preset by key
export function getPresetByKey(key: string): RotationPreset | undefined {
  return ROTATION_PRESETS.find(p => p.key === key);
}

// Get all presets suitable for a family
export function getPresetsForFamily(childCount: number): RotationPreset[] {
  return ROTATION_PRESETS.filter(
    p => childCount >= p.min_children && childCount <= p.max_children
  );
}

// Get slot names from a preset (e.g., ["Child A", "Child B"])
export function getPresetSlots(preset: RotationPreset): string[] {
  const firstWeekType = preset.week_types[0];
  const schedule = preset.schedule[firstWeekType];
  return Object.keys(schedule || {});
}

// Calculate current week type based on start date
export function getCurrentWeekType(preset: RotationPreset, startDate: string): string {
  if (preset.week_types.length === 1) {
    return preset.week_types[0];
  }

  const start = new Date(startDate);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceStart = Math.floor((now.getTime() - start.getTime()) / msPerWeek);

  return preset.week_types[weeksSinceStart % preset.week_types.length];
}

// Get day of week from Date
export function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

// Get presets grouped by category
export function getPresetsByCategory(childCount: number): {
  everyday: RotationPreset[];
  seasonal: RotationPreset[];
} {
  const suitable = getPresetsForFamily(childCount);
  return {
    everyday: suitable.filter(p => p.preset_category === 'everyday'),
    seasonal: suitable.filter(p => p.preset_category === 'seasonal'),
  };
}

// Re-export presets for direct import
export {
  SMART_ROTATION_PRESET,
  WEEKEND_WARRIOR_PRESET,
  DAILY_BASICS_PRESET,
  SUMMER_BREAK_PRESET,
  SCHOOL_YEAR_PRESET,
};
