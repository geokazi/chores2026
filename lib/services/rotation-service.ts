/**
 * Rotation Service
 * Handles rotation config read/write and chore lookups
 */

import type { RotationConfig, ChildSlotMapping, PresetChore, DayOfWeek, RotationCustomizations, CustomChore } from "../types/rotation.ts";
import type { RotationPreset } from "../types/rotation.ts";
import { getPresetByKey, getCurrentWeekType, getDayOfWeek, getPresetSlots } from "../data/rotation-presets.ts";

// Get day of year (1-366) for rotation calculations
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Generate chores for a child in a dynamic (non-slot) template
 * Uses distribution tags: 'all' = everyone, 'rotate' = round-robin
 */
export function getDynamicChoresForChild(
  preset: RotationPreset,
  participantIds: string[],
  childProfileId: string,
  date: Date
): PresetChore[] {
  const childIndex = participantIds.indexOf(childProfileId);
  if (childIndex === -1) return [];

  const dayOfYear = getDayOfYear(date);
  const numKids = participantIds.length;

  // Get rotating chores once for index calculation
  const rotatingChores = preset.chores.filter(c => c.distribution === 'rotate');

  return preset.chores.filter(chore => {
    if (chore.distribution === 'all') {
      // Everyone does this chore every day
      return true;
    }
    if (chore.distribution === 'rotate') {
      // Round-robin: each rotating chore shifts through kids daily
      const choreIndex = rotatingChores.indexOf(chore);
      const assignedKidIndex = (dayOfYear + choreIndex) % numKids;
      return assignedKidIndex === childIndex;
    }
    // Untagged chores are ignored in dynamic mode
    return false;
  });
}

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
  childSlots: ChildSlotMapping[],
  customizations?: RotationCustomizations,
  startDate?: string
): RotationConfig {
  const config: RotationConfig = {
    active_preset: presetKey,
    start_date: startDate || new Date().toISOString().split('T')[0],
    child_slots: childSlots,
  };
  if (customizations) {
    config.customizations = customizations;
  }
  return config;
}

// Get chores for a specific child on a given date
// familyCustomChores: optional family-level custom chores (appear in ALL templates)
export function getChoresForChild(
  config: RotationConfig,
  childProfileId: string,
  date: Date = new Date(),
  familyCustomChores?: CustomChore[]
): PresetChore[] {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return [];

  // Dynamic templates: use distribution-based generation
  if (preset.is_dynamic) {
    const participantIds = config.child_slots.map(s => s.profile_id);
    let chores = getDynamicChoresForChild(preset, participantIds, childProfileId, date);
    // Apply customizations + family custom chores
    chores = getChoresWithCustomizations(chores, config.customizations, familyCustomChores);
    return chores;
  }

  // Slot-based templates: existing logic
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
  let chores = choreKeys
    .map(key => preset.chores.find(c => c.key === key))
    .filter((c): c is PresetChore => c !== undefined);

  // Apply customizations + family custom chores
  chores = getChoresWithCustomizations(chores, config.customizations, familyCustomChores);

  return chores;
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

// Get family-level custom chores from settings (available for ALL templates)
export function getFamilyCustomChores(settings: any): CustomChore[] {
  return settings?.apps?.choregami?.custom_chores || [];
}

// Apply customizations to preset chores (override layer pattern)
// familyCustomChores: family-level custom chores (available for ALL templates)
export function getChoresWithCustomizations(
  presetChores: PresetChore[],
  customizations?: RotationCustomizations,
  familyCustomChores?: CustomChore[]
): PresetChore[] {
  // Start with preset chores
  let chores = [...presetChores];

  // Apply template-specific customizations (chore overrides)
  if (customizations?.chore_overrides) {
    chores = chores
      .filter(c => customizations.chore_overrides?.[c.key]?.enabled !== false)
      .map(c => ({
        ...c,
        points: customizations.chore_overrides?.[c.key]?.points ?? c.points,
      }));
  }

  // Append family-level custom chores (available for ALL templates)
  if (familyCustomChores?.length) {
    const familyChoresAsPreset: PresetChore[] = familyCustomChores.map(c => ({
      key: c.key,
      name: c.name,
      points: c.points,
      icon: c.icon || '✨',
      minutes: 5,        // Default estimate
      category: 'custom',
    }));
    chores = [...chores, ...familyChoresAsPreset];
  }

  return chores;
}
