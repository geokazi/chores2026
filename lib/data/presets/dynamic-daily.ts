/**
 * Dynamic Daily Routines Preset
 * Scales to any family size (1-8 kids) using distribution tags
 * - 'all': Everyone does this chore daily
 * - 'rotate': Round-robin through all kids
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Personal chores - everyone does these daily
  { key: 'make_bed', name: 'Make bed', points: 0, minutes: 3, category: 'morning', icon: '🛏️', distribution: 'all' },
  { key: 'brush_teeth_am', name: 'Brush teeth (AM)', points: 0, minutes: 3, category: 'morning', icon: '🦷', distribution: 'all' },
  { key: 'brush_teeth_pm', name: 'Brush teeth (PM)', points: 0, minutes: 3, category: 'evening', icon: '🦷', distribution: 'all' },
  { key: 'tidy_room', name: 'Tidy room', points: 0, minutes: 5, category: 'evening', icon: '🧸', distribution: 'all' },

  // Rotating chores - one kid per day, shifts daily
  { key: 'set_table', name: 'Set table', points: 1, minutes: 5, category: 'meals', icon: '🍽️', distribution: 'rotate' },
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'meals', icon: '🧹', distribution: 'rotate' },
  { key: 'load_dishwasher', name: 'Load dishwasher', points: 1, minutes: 10, category: 'meals', icon: '🫧', distribution: 'rotate' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'care', icon: '🐕', distribution: 'rotate' },
  { key: 'take_trash', name: 'Take out trash', points: 1, minutes: 5, category: 'house', icon: '🗑️', distribution: 'rotate' },
  { key: 'water_plants', name: 'Water plants', points: 1, minutes: 5, category: 'care', icon: '🌱', distribution: 'rotate' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'morning', name: 'Morning', icon: '🌅' },
  { key: 'evening', name: 'Evening', icon: '🌙' },
  { key: 'meals', name: 'Meals', icon: '🍽️' },
  { key: 'house', name: 'House', icon: '🏠' },
  { key: 'care', name: 'Care', icon: '🐾' },
];

export const DYNAMIC_DAILY_PRESET: RotationPreset = {
  key: 'dynamic_daily',
  name: 'Daily Routines (Any Size)',
  description: 'Scales to any family size. Personal chores for all, shared chores rotate automatically.',
  icon: '🔄',
  color: '#8b5cf6',
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 1,
  max_children: 8,
  min_age: 5,
  cycle_type: 'daily',
  week_types: ['standard'],
  is_dynamic: true,
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {},  // Empty - generated dynamically at runtime
};
