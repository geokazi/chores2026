/**
 * Large Family Preset
 * 4-slot rotation for families with 3-8 kids
 * Uses alternating daily rotation to spread workload fairly
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Quick daily chores (everyone does these)
  { key: 'make_bed', name: 'Make bed', points: 0, minutes: 3, category: 'daily', icon: '🛏️' },
  { key: 'tidy_room', name: 'Tidy room', points: 0, minutes: 5, category: 'daily', icon: '🧸' },
  // Rotating kitchen duties
  { key: 'set_table', name: 'Set table', points: 1, minutes: 5, category: 'kitchen', icon: '🍽️' },
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'kitchen', icon: '🍽️' },
  { key: 'load_dishwasher', name: 'Load dishwasher', points: 1, minutes: 10, category: 'kitchen', icon: '🫧' },
  { key: 'wipe_counters', name: 'Wipe counters', points: 1, minutes: 5, category: 'kitchen', icon: '✨' },
  // Rotating house chores
  { key: 'vacuum_floor', name: 'Vacuum one room', points: 2, minutes: 10, category: 'house', icon: '🧹' },
  { key: 'take_trash', name: 'Take out trash', points: 1, minutes: 5, category: 'house', icon: '🗑️' },
  { key: 'fold_laundry', name: 'Fold laundry', points: 2, minutes: 15, category: 'house', icon: '👕' },
  { key: 'sweep_floor', name: 'Sweep floor', points: 2, minutes: 10, category: 'house', icon: '🧹' },
  // Pet/plant care
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'care', icon: '🐕' },
  { key: 'water_plants', name: 'Water plants', points: 1, minutes: 5, category: 'care', icon: '🌱' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'daily', name: 'Daily Routine', icon: '☀️' },
  { key: 'kitchen', name: 'Kitchen Duty', icon: '🍽️' },
  { key: 'house', name: 'House Chores', icon: '🏠' },
  { key: 'care', name: 'Care Tasks', icon: '💚' },
];

export const LARGE_FAMILY_PRESET: RotationPreset = {
  key: 'large_family',
  name: 'Large Family Rotation',
  description: '4-slot rotation perfect for 3-8 kids. Fair workload distribution across all children.',
  icon: '👨‍👩‍👧‍👦',
  color: '#ec4899',  // Pink
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 3,
  max_children: 8,
  min_age: 6,
  cycle_type: 'weekly',
  week_types: ['standard'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    standard: {
      'Child A': {
        // Kitchen duty Mon/Fri, House chores Tue/Sat
        mon: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        tue: ['make_bed', 'vacuum_floor', 'feed_pet', 'tidy_room'],
        wed: ['make_bed', 'wipe_counters', 'water_plants', 'tidy_room'],
        thu: ['make_bed', 'take_trash', 'tidy_room'],
        fri: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        sat: ['make_bed', 'fold_laundry', 'tidy_room'],
        sun: ['make_bed', 'feed_pet', 'tidy_room'],
      },
      'Child B': {
        // Kitchen duty Tue/Sat, House chores Wed/Sun
        mon: ['make_bed', 'vacuum_floor', 'water_plants', 'tidy_room'],
        tue: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        wed: ['make_bed', 'sweep_floor', 'feed_pet', 'tidy_room'],
        thu: ['make_bed', 'wipe_counters', 'tidy_room'],
        fri: ['make_bed', 'take_trash', 'tidy_room'],
        sat: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        sun: ['make_bed', 'fold_laundry', 'water_plants', 'tidy_room'],
      },
      'Child C': {
        // Kitchen duty Wed/Sun, House chores Thu/Mon
        mon: ['make_bed', 'fold_laundry', 'feed_pet', 'tidy_room'],
        tue: ['make_bed', 'take_trash', 'tidy_room'],
        wed: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        thu: ['make_bed', 'vacuum_floor', 'water_plants', 'tidy_room'],
        fri: ['make_bed', 'wipe_counters', 'tidy_room'],
        sat: ['make_bed', 'sweep_floor', 'feed_pet', 'tidy_room'],
        sun: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
      },
      'Child D': {
        // Kitchen duty Thu, House chores Fri/Tue
        mon: ['make_bed', 'wipe_counters', 'tidy_room'],
        tue: ['make_bed', 'fold_laundry', 'water_plants', 'tidy_room'],
        wed: ['make_bed', 'take_trash', 'feed_pet', 'tidy_room'],
        thu: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        fri: ['make_bed', 'sweep_floor', 'tidy_room'],
        sat: ['make_bed', 'vacuum_floor', 'water_plants', 'tidy_room'],
        sun: ['make_bed', 'take_trash', 'feed_pet', 'tidy_room'],
      },
    },
  },
};
