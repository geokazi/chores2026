/**
 * Summer Break Preset
 * More chores, outdoor focus - kids have more time during summer
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Morning routine
  { key: 'make_bed', name: 'Make bed', points: 0, minutes: 3, category: 'morning', icon: '🛏️' },
  { key: 'breakfast_dishes', name: 'Breakfast dishes', points: 1, minutes: 10, category: 'morning', icon: '🍽️' },
  // Outdoor chores (summer focus)
  { key: 'water_garden', name: 'Water garden', points: 1, minutes: 15, category: 'outdoor', icon: '🌻' },
  { key: 'mow_lawn', name: 'Help mow lawn', points: 3, minutes: 30, category: 'outdoor', icon: '🌿' },
  { key: 'wash_car', name: 'Wash car', points: 2, minutes: 20, category: 'outdoor', icon: '🚗' },
  { key: 'pull_weeds', name: 'Pull weeds', points: 2, minutes: 20, category: 'outdoor', icon: '🌱' },
  { key: 'sweep_patio', name: 'Sweep patio', points: 1, minutes: 10, category: 'outdoor', icon: '🧹' },
  // Indoor chores
  { key: 'vacuum_room', name: 'Vacuum room', points: 2, minutes: 15, category: 'indoor', icon: '🧹' },
  { key: 'fold_laundry', name: 'Fold laundry', points: 2, minutes: 15, category: 'indoor', icon: '👕' },
  { key: 'clean_room', name: 'Clean room', points: 2, minutes: 20, category: 'indoor', icon: '🏠' },
  // Evening routine
  { key: 'dinner_help', name: 'Help with dinner', points: 1, minutes: 15, category: 'evening', icon: '🍳' },
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'evening', icon: '🍽️' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'evening', icon: '🐕' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'morning', name: 'Morning', icon: '☀️' },
  { key: 'outdoor', name: 'Outdoor', icon: '🌻' },
  { key: 'indoor', name: 'Indoor', icon: '🏠' },
  { key: 'evening', name: 'Evening', icon: '🌅' },
];

export const SUMMER_BREAK_PRESET: RotationPreset = {
  key: 'summer_break',
  name: 'Summer Break',
  description: 'More chores with outdoor focus. Perfect for when kids have extra time.',
  icon: '☀️',
  color: '#eab308',
  preset_category: 'seasonal',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 2,  // Only 2 slots defined (Child A, B)
  min_age: 6,
  cycle_type: 'weekly',
  week_types: ['standard'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    standard: {
      'Child A': {
        mon: ['make_bed', 'breakfast_dishes', 'water_garden', 'clear_table'],
        tue: ['make_bed', 'vacuum_room', 'pull_weeds', 'feed_pet'],
        wed: ['make_bed', 'breakfast_dishes', 'sweep_patio', 'dinner_help'],
        thu: ['make_bed', 'fold_laundry', 'water_garden', 'clear_table'],
        fri: ['make_bed', 'clean_room', 'wash_car', 'feed_pet'],
        sat: ['make_bed', 'breakfast_dishes', 'mow_lawn', 'dinner_help'],
        sun: ['make_bed', 'water_garden', 'clear_table'],
      },
      'Child B': {
        mon: ['make_bed', 'vacuum_room', 'pull_weeds', 'feed_pet'],
        tue: ['make_bed', 'breakfast_dishes', 'water_garden', 'dinner_help'],
        wed: ['make_bed', 'fold_laundry', 'wash_car', 'clear_table'],
        thu: ['make_bed', 'breakfast_dishes', 'sweep_patio', 'feed_pet'],
        fri: ['make_bed', 'vacuum_room', 'water_garden', 'dinner_help'],
        sat: ['make_bed', 'clean_room', 'pull_weeds', 'clear_table'],
        sun: ['make_bed', 'breakfast_dishes', 'feed_pet'],
      },
    },
  },
};
