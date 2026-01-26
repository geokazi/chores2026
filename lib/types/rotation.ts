/**
 * Chore Rotation Types
 * Static preset definitions + dynamic family config
 */

// Days of the week
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Distribution type for dynamic templates
export type ChoreDistribution = 'all' | 'rotate';

// Chore definition within a preset
export interface PresetChore {
  key: string;
  name: string;
  points: number;
  minutes: number;
  category: string;
  icon: string;
  distribution?: ChoreDistribution;  // For dynamic templates: 'all' = everyone, 'rotate' = round-robin
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
  is_dynamic?: boolean;  // True = uses distribution tags, no fixed slots
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
  // Custom per-kid assignments (only when assignment_mode = 'custom')
  // Maps profileId -> choreKeys[] (chores appear daily for that kid)
  custom_assignments?: Record<string, string[]>;
  // Daily chores: appear every day for ALL kids (regardless of rotation schedule)
  // Array of chore keys from preset or custom chores
  daily_chores?: string[];
  // Rest days: no chores appear on these days for any kid
  rest_days?: DayOfWeek[];
  // Rotation period: how many weeks before chores swap (default: 1 = weekly)
  rotation_period_weeks?: 1 | 2;
}

// Assignment mode for rotation
export type AssignmentMode = 'rotation' | 'custom';

// Dynamic family config (JSONB in Supabase)
export interface RotationConfig {
  active_preset: string;
  start_date: string;  // ISO date string
  child_slots: ChildSlotMapping[];
  customizations?: RotationCustomizations;
  assignment_mode?: AssignmentMode;  // 'rotation' = smart rotation (default), 'custom' = manual per-kid
}

// Child slot mapping
export interface ChildSlotMapping {
  slot: string;        // e.g., "Child A", "Child B"
  profile_id: string;  // Family profile UUID
}
