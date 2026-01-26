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
  startDate?: string,
  assignmentMode?: 'rotation' | 'custom'
): RotationConfig {
  const config: RotationConfig = {
    active_preset: presetKey,
    start_date: startDate || new Date().toISOString().split('T')[0],
    child_slots: childSlots,
  };
  if (customizations) {
    config.customizations = customizations;
  }
  if (assignmentMode) {
    config.assignment_mode = assignmentMode;
  }
  return config;
}

/**
 * Find a chore by key from preset or family custom chores
 */
export function findChoreByKey(
  preset: RotationPreset,
  familyCustomChores: CustomChore[] | undefined,
  key: string
): PresetChore | undefined {
  // Check preset chores first
  const presetChore = preset.chores.find(c => c.key === key);
  if (presetChore) return presetChore;

  // Check family custom chores
  const customChore = familyCustomChores?.find(c => c.key === key);
  if (customChore) {
    return {
      key: customChore.key,
      name: customChore.name,
      points: customChore.points,
      icon: customChore.icon || '✨',
      minutes: 5,
      category: 'custom',
    };
  }

  return undefined;
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

  const customizations = config.customizations;

  // Check for rest day - no chores on rest days
  const today = getDayOfWeek(date);
  if (customizations?.rest_days?.includes(today)) {
    return [];
  }

  // CUSTOM ASSIGNMENT MODE: Kid sees their assigned chores daily
  if (config.assignment_mode === 'custom') {
    const assignedKeys = customizations?.custom_assignments?.[childProfileId] || [];

    // Map keys to chore definitions (from preset + family custom)
    let chores = assignedKeys
      .map(key => findChoreByKey(preset, familyCustomChores, key))
      .filter((c): c is PresetChore => c !== undefined);

    // Apply point overrides only (enabled filter already handled by assignment)
    if (customizations?.chore_overrides) {
      chores = chores.map(c => ({
        ...c,
        points: customizations.chore_overrides?.[c.key]?.points ?? c.points,
      }));
    }

    // Add daily chores (appear every day for all kids)
    const dailyChores = getDailyChores(preset, customizations, familyCustomChores);
    chores = [...chores, ...dailyChores];

    return chores;
  }

  // ROTATION MODE (default): use template schedules

  // Dynamic templates: use distribution-based generation
  if (preset.is_dynamic) {
    const participantIds = config.child_slots.map(s => s.profile_id);
    let chores = getDynamicChoresForChild(preset, participantIds, childProfileId, date);
    // Apply customizations + family custom chores
    chores = getChoresWithCustomizations(chores, config.customizations, familyCustomChores);
    // Add daily chores (appear every day for all kids)
    const dailyChores = getDailyChores(preset, config.customizations, familyCustomChores);
    chores = [...chores, ...dailyChores];
    return chores;
  }

  // Slot-based templates: check if we should use dynamic distribution
  // (when chores are disabled, dynamically redistribute remaining chores)
  if (shouldUseDynamicDistribution(preset, config)) {
    let chores = getDynamicDistributedChores(preset, config, childProfileId, date);
    // Apply point overrides
    if (customizations?.chore_overrides) {
      chores = chores.map(c => ({
        ...c,
        points: customizations.chore_overrides?.[c.key]?.points ?? c.points,
      }));
    }
    // Add daily chores (appear every day for all kids)
    const dailyChores = getDailyChores(preset, customizations, familyCustomChores);
    chores = [...chores, ...dailyChores];
    return chores;
  }

  // Slot-based templates: static schedule logic (no chores disabled)
  // Find which slot this child is assigned to
  const slotMapping = config.child_slots.find(s => s.profile_id === childProfileId);
  if (!slotMapping) return [];

  // Get current week type and day
  const periodWeeks = config.customizations?.rotation_period_weeks || 1;
  const weekType = getCurrentWeekType(preset, config.start_date, periodWeeks);
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

  // Add daily chores (appear every day for all kids)
  const dailyChores = getDailyChores(preset, config.customizations, familyCustomChores);
  chores = [...chores, ...dailyChores];

  return chores;
}

// Get week type badge info for display
export function getWeekTypeBadge(config: RotationConfig): { badge: string; context: string } | null {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return null;

  const periodWeeks = config.customizations?.rotation_period_weeks || 1;
  const weekType = getCurrentWeekType(preset, config.start_date, periodWeeks);

  // Template-specific badge logic
  switch (preset.key) {
    case 'smart_rotation':
      return weekType === 'week_a'
        ? { badge: '🔄 ROTATION A', context: 'Week 1 of 2 - Chores swap next week!' }
        : { badge: '🔄 ROTATION B', context: 'Week 2 of 2 - Chores swap next week!' };

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

/**
 * Get daily chores that appear every day for all kids
 * These bypass the rotation schedule
 */
export function getDailyChores(
  preset: RotationPreset,
  customizations?: RotationCustomizations,
  familyCustomChores?: CustomChore[]
): PresetChore[] {
  const dailyKeys = customizations?.daily_chores || [];
  if (dailyKeys.length === 0) return [];

  return dailyKeys
    .map(key => findChoreByKey(preset, familyCustomChores, key))
    .filter((c): c is PresetChore => c !== undefined)
    .map(c => ({
      ...c,
      // Apply point overrides if any
      points: customizations?.chore_overrides?.[c.key]?.points ?? c.points,
    }));
}

/**
 * Schedule preview data for UI display
 */
export interface SchedulePreviewDay {
  day: DayOfWeek;
  dayLabel: string;
  slots: Record<string, { chores: string[]; isEmpty: boolean }>;
  hasEmptySlots: boolean;
  isRestDay: boolean;  // True if this is a designated rest day (no chores)
}

export interface SchedulePreview {
  weekType: string;
  weekLabel: string;
  days: SchedulePreviewDay[];
  emptyDays: { day: string; slots: string[] }[];
  hasEmptyDays: boolean;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
};

const DAYS_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Get enabled chores for a preset based on customizations
 * Returns chores that are NOT disabled in chore_overrides
 */
export function getEnabledChores(
  preset: RotationPreset,
  customizations?: RotationCustomizations
): PresetChore[] {
  return preset.chores.filter(chore =>
    customizations?.chore_overrides?.[chore.key]?.enabled !== false
  );
}

/**
 * Check if dynamic distribution should be used for a slot-based template
 * Returns true when customizations would create empty days in the static schedule
 */
export function shouldUseDynamicDistribution(
  preset: RotationPreset,
  config: RotationConfig
): boolean {
  // Already dynamic - no change needed
  if (preset.is_dynamic) return false;

  // Check if any chores are disabled
  const customizations = config.customizations;
  if (!customizations?.chore_overrides) return false;

  const disabledKeys = Object.entries(customizations.chore_overrides)
    .filter(([_, override]) => override?.enabled === false)
    .map(([key]) => key);

  // If chores are disabled, use dynamic distribution
  return disabledKeys.length > 0;
}

/**
 * Dynamic schedule type for preview generation
 * Maps weekType -> childName -> day -> choreNames[]
 */
export type DynamicSchedule = Record<string, Record<string, Record<DayOfWeek, string[]>>>;

/**
 * Generate a dynamic schedule distributing enabled chores fairly
 * - Chores rotate through days (not all chores every day)
 * - Each day, chores are split between assigned kids
 * - Week B = swapped kid assignments for fairness
 */
export function generateDynamicSchedule(
  preset: RotationPreset,
  config: RotationConfig,
  childNames: Record<string, string>  // profile_id -> name
): DynamicSchedule {
  const customizations = config.customizations;
  const restDays = customizations?.rest_days || [];
  const enabledChores = getEnabledChores(preset, customizations);

  // Get assigned kids in slot order
  const assignedSlots = config.child_slots.filter(s => s.profile_id);
  const kidNames = assignedSlots.map(s => childNames[s.profile_id] || s.slot);

  // Get active (non-rest) days
  const activeDays = DAYS_ORDER.filter(d => !restDays.includes(d));

  if (enabledChores.length === 0 || kidNames.length === 0 || activeDays.length === 0) {
    return {};
  }

  const schedule: DynamicSchedule = {};
  const numKids = kidNames.length;
  const numDays = activeDays.length;
  const numChores = enabledChores.length;

  // Generate for each week type
  for (const weekType of preset.week_types) {
    schedule[weekType] = {};
    for (const kidName of kidNames) {
      schedule[weekType][kidName] = {
        mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
      };
    }

    // Distribute chores across kid-day slots using round-robin
    // Total slots = numKids * numDays (e.g., 2 kids * 5 days = 10 slots)
    // Cycle through chores to fill all slots
    // Week B offsets chore assignment for swap effect
    const weekOffset = weekType === 'week_b' ? 1 : 0;

    let slotIndex = 0;
    for (const day of activeDays) {
      for (let kidIdx = 0; kidIdx < numKids; kidIdx++) {
        const kidName = kidNames[kidIdx];
        // Pick chore using round-robin with week offset for fairness
        const choreIndex = (slotIndex + weekOffset) % numChores;
        const chore = enabledChores[choreIndex];
        schedule[weekType][kidName][day].push(chore.name);
        slotIndex++;
      }
    }
  }

  return schedule;
}

/**
 * Get dynamically distributed chores for a child on a specific day
 * Used when slot-based templates have disabled chores
 */
export function getDynamicDistributedChores(
  preset: RotationPreset,
  config: RotationConfig,
  childProfileId: string,
  date: Date
): PresetChore[] {
  const customizations = config.customizations;
  const restDays = customizations?.rest_days || [];
  const enabledChores = getEnabledChores(preset, customizations);

  // Get assigned slots (those with a profile_id)
  const assignedSlots = config.child_slots.filter(s => s.profile_id);
  const profileIds = assignedSlots.map(s => s.profile_id);

  // Find child's index
  const childIndex = profileIds.indexOf(childProfileId);
  if (childIndex === -1) return [];

  // Get active (non-rest) days
  const activeDays = DAYS_ORDER.filter(d => !restDays.includes(d));
  const today = getDayOfWeek(date);

  // If today is a rest day, return empty
  if (restDays.includes(today)) return [];

  // Get today's position in active days
  const todayIndex = activeDays.indexOf(today);
  if (todayIndex === -1) return [];

  // Determine week type
  const periodWeeks = config.customizations?.rotation_period_weeks || 1;
  const weekType = getCurrentWeekType(preset, config.start_date, periodWeeks);
  const weekOffset = weekType === 'week_b' ? 1 : 0;

  const numKids = profileIds.length;
  const numChores = enabledChores.length;

  // Calculate the slot index for this child on this day
  // Slots are ordered: day0-kid0, day0-kid1, day1-kid0, day1-kid1, ...
  const slotIndex = todayIndex * numKids + childIndex;

  // Pick chore using round-robin with week offset
  const choreIndex = (slotIndex + weekOffset) % numChores;

  return [enabledChores[choreIndex]];
}

/**
 * Generate schedule preview for UI showing what chores each kid gets each day
 * Accounts for disabled chores and shows empty day warnings
 * When chores are disabled in slot-based templates, uses dynamic distribution
 * familyCustomChores: optional family-level custom chores (for resolving daily chore names)
 */
export function getSchedulePreview(
  config: RotationConfig,
  childNames: Record<string, string>,  // Maps profile_id -> child name
  familyCustomChores?: CustomChore[]
): SchedulePreview[] {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return [];

  const customizations = config.customizations;
  const dailyChoreKeys = customizations?.daily_chores || [];
  const restDays = customizations?.rest_days || [];

  // Get assigned slots (those with a profile_id)
  const assignedSlots = config.child_slots.filter(s => s.profile_id);

  // Check if we should use dynamic distribution (when chores are disabled)
  const useDynamic = shouldUseDynamicDistribution(preset, config);
  const dynamicSchedule = useDynamic ? generateDynamicSchedule(preset, config, childNames) : null;

  const previews: SchedulePreview[] = [];

  for (const weekType of preset.week_types) {
    const weekLabel = weekType === 'cleaning' ? 'Cleaning Week' :
                      weekType === 'non-cleaning' ? 'Maintenance Week' :
                      weekType === 'week_a' ? 'Week A (Rotation 1)' :
                      weekType === 'week_b' ? 'Week B (Rotation 2)' :
                      weekType.charAt(0).toUpperCase() + weekType.slice(1);

    const scheduleForWeek = preset.schedule[weekType];
    if (!scheduleForWeek && !useDynamic) continue;

    const days: SchedulePreviewDay[] = [];
    const emptyDays: { day: string; slots: string[] }[] = [];

    for (const day of DAYS_ORDER) {
      const isRestDay = restDays.includes(day);
      const slots: Record<string, { chores: string[]; isEmpty: boolean }> = {};
      const emptySlots: string[] = [];

      // On rest days, show empty slots for all kids (but not as "empty" warning)
      if (isRestDay) {
        for (const slotMapping of assignedSlots) {
          const childName = childNames[slotMapping.profile_id] || slotMapping.slot;
          slots[childName] = { chores: [], isEmpty: false };  // Not a warning, intentionally empty
        }
        days.push({
          day,
          dayLabel: DAY_LABELS[day],
          slots,
          hasEmptySlots: false,
          isRestDay: true,
        });
        continue;
      }

      for (const slotMapping of assignedSlots) {
        const childName = childNames[slotMapping.profile_id] || slotMapping.slot;
        let choreNames: string[];

        if (useDynamic && dynamicSchedule) {
          // Use dynamically distributed chores
          choreNames = dynamicSchedule[weekType]?.[childName]?.[day] || [];
        } else {
          // Use static schedule
          const scheduleForSlot = scheduleForWeek[slotMapping.slot];
          const choreKeys = scheduleForSlot?.[day] || [];

          // Filter to enabled chores only
          const enabledChoreKeys = choreKeys.filter(key =>
            customizations?.chore_overrides?.[key]?.enabled !== false
          );

          // Map to chore names
          choreNames = enabledChoreKeys
            .map(key => preset.chores.find(c => c.key === key)?.name)
            .filter((n): n is string => !!n);
        }

        // Add daily chores (always appear) - includes family custom chores
        const dailyChoreNames = dailyChoreKeys
          .map(key => findChoreByKey(preset, familyCustomChores, key)?.name)
          .filter((n): n is string => !!n);

        const allChores = [...choreNames, ...dailyChoreNames];
        const isEmpty = allChores.length === 0;

        slots[childName] = { chores: allChores, isEmpty };

        if (isEmpty) {
          emptySlots.push(childName);
        }
      }

      const hasEmptySlots = emptySlots.length > 0;
      days.push({
        day,
        dayLabel: DAY_LABELS[day],
        slots,
        hasEmptySlots,
        isRestDay: false,
      });

      if (hasEmptySlots) {
        emptyDays.push({ day: DAY_LABELS[day], slots: emptySlots });
      }
    }

    previews.push({
      weekType,
      weekLabel,
      days,
      emptyDays,
      hasEmptyDays: emptyDays.length > 0,
    });
  }

  return previews;
}
