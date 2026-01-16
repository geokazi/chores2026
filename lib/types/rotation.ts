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
  preset_category: 'everyday' | 'seasonal';  // UI grouping
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

// Custom chore added by family
export interface CustomChore {
  key: string;         // Unique key (e.g., "custom_feed_fish")
  name: string;        // Display name
  points: number;      // Point value
  icon?: string;       // Emoji icon (defaults to ✨)
}

// Family customizations to a preset
export interface RotationCustomizations {
  // Override points or disable specific chores
  chore_overrides?: Record<string, {
    points?: number;    // Override default points
    enabled?: boolean;  // false = disabled (default true)
  }>;
  // Custom chores added by family (appear daily)
  custom_chores?: CustomChore[];
}

// Dynamic family config (JSONB in Supabase)
export interface RotationConfig {
  active_preset: string;
  start_date: string;  // ISO date string
  child_slots: ChildSlotMapping[];
  customizations?: RotationCustomizations;
}

// Child slot mapping
export interface ChildSlotMapping {
  slot: string;        // e.g., "Child A", "Child B"
  profile_id: string;  // Family profile UUID
}
