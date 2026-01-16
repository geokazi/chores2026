/**
 * Chore Rotation Types
 * Static preset definitions + dynamic family config
 */

// Days of the week
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Chore definition within a preset
export interface PresetChore {
  key: string;
  name: string;
  points: number;
  minutes: number;
  category: string;
  icon: string;
}

// Category metadata for UI grouping
export interface ChoreCategory {
  key: string;
  name: string;
  icon: string;
}

// Schedule: weekType -> slot -> day -> choreKeys[]
export type RotationSchedule = Record<string, Record<string, Record<DayOfWeek, string[]>>>;

// Static preset definition (TypeScript)
export interface RotationPreset {
  key: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  min_children: number;
  max_children: number;
  min_age?: number;
  cycle_type: 'daily' | 'weekly' | 'biweekly';
  week_types: string[];
  categories: ChoreCategory[];
  chores: PresetChore[];
  schedule: RotationSchedule;
}

// Dynamic family config (JSONB in Supabase)
export interface RotationConfig {
  active_preset: string;
  start_date: string;  // ISO date string
  child_slots: ChildSlotMapping[];
  customizations?: Record<string, unknown>;  // Future: family tweaks
}

// Child slot mapping
export interface ChildSlotMapping {
  slot: string;        // e.g., "Child A", "Child B"
  profile_id: string;  // Family profile UUID
}
