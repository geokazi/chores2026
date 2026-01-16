/**
 * Rotation Service
 * Handles rotation config read/write and chore lookups
 */

import type { RotationConfig, ChildSlotMapping, PresetChore, DayOfWeek } from "../types/rotation.ts";
import { getPresetByKey, getCurrentWeekType, getDayOfWeek, getPresetSlots } from "../data/rotation-presets.ts";

// Get rotation config from family settings JSONB
export function getRotationConfig(familySettings: Record<string, unknown>): RotationConfig | null {
  const apps = familySettings?.apps as Record<string, unknown> | undefined;
  const choregami = apps?.choregami as Record<string, unknown> | undefined;
  const rotation = choregami?.rotation as RotationConfig | undefined;
  return rotation ?? null;
}

// Build rotation config for saving to JSONB
export function buildRotationConfig(
  presetKey: string,
  childSlots: ChildSlotMapping[]
): RotationConfig {
  return {
    active_preset: presetKey,
    start_date: new Date().toISOString().split('T')[0],
    child_slots: childSlots,
  };
}

// Get chores for a specific child on a given date
export function getChoresForChild(
  config: RotationConfig,
  childProfileId: string,
  date: Date = new Date()
): PresetChore[] {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return [];

  // Find which slot this child is assigned to
  const slotMapping = config.child_slots.find(s => s.profile_id === childProfileId);
  if (!slotMapping) return [];

  // Get current week type and day
  const weekType = getCurrentWeekType(preset, config.start_date);
  const day = getDayOfWeek(date);

  // Look up chore keys from schedule
  const scheduleForWeek = preset.schedule[weekType];
  if (!scheduleForWeek) return [];

  const scheduleForSlot = scheduleForWeek[slotMapping.slot];
  if (!scheduleForSlot) return [];

  const choreKeys = scheduleForSlot[day] || [];

  // Map chore keys to full chore objects
  return choreKeys
    .map(key => preset.chores.find(c => c.key === key))
    .filter((c): c is PresetChore => c !== undefined);
}

// Get week type badge info for display
export function getWeekTypeBadge(config: RotationConfig): { badge: string; context: string } | null {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return null;

  const weekType = getCurrentWeekType(preset, config.start_date);

  // Template-specific badge logic
  switch (preset.key) {
    case 'smart_rotation':
      return weekType === 'cleaning'
        ? { badge: '🧹 CLEANING WEEK', context: 'Week 1 of 2' }
        : { badge: '🌿 MAINTENANCE WEEK', context: 'Week 2 of 2' };

    case 'weekend_warrior': {
      const isWeekend = ['sat', 'sun'].includes(getDayOfWeek(new Date()));
      return isWeekend
        ? { badge: '💪 POWER WEEKEND', context: 'Big chore day!' }
        : { badge: '📚 SCHOOL DAY', context: 'Light day' };
    }

    case 'daily_basics':
      return { badge: '🌟 DAILY ROUTINE', context: 'Same helpful habits every day!' };

    default:
      return { badge: `${preset.icon} ${preset.name}`, context: '' };
  }
}

// Validate child count for a preset
export function validateChildCount(presetKey: string, childCount: number): boolean {
  const preset = getPresetByKey(presetKey);
  if (!preset) return false;
  return childCount >= preset.min_children && childCount <= preset.max_children;
}

// Get required slot count for a preset
export function getRequiredSlotCount(presetKey: string): number {
  const preset = getPresetByKey(presetKey);
  if (!preset) return 0;
  return getPresetSlots(preset).length;
}
