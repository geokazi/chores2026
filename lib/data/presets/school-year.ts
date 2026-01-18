/**
 * School Year Preset
 * Light weekday chores, more on weekends - respects homework time
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Morning routine (quick)
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'morning', icon: '🛏️' },
  { key: 'pack_lunch', name: 'Pack lunch', points: 1, minutes: 5, category: 'morning', icon: '🥪' },
  // After school (quick)
  { key: 'unpack_bag', name: 'Unpack school bag', points: 1, minutes: 5, category: 'afterschool', icon: '🎒' },
  { key: 'snack_cleanup', name: 'Clean up snack', points: 1, minutes: 3, category: 'afterschool', icon: '🍎' },
  // Evening (quick)
  { key: 'set_table', name: 'Set table', points: 1, minutes: 5, category: 'evening', icon: '🍽️' },
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'evening', icon: '🍽️' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'evening', icon: '🐕' },
  { key: 'tidy_room', name: 'Quick tidy room', points: 1, minutes: 5, category: 'evening', icon: '🧸' },
  // Weekend (more substantial)
  { key: 'vacuum_room', name: 'Vacuum room', points: 2, minutes: 15, category: 'weekend', icon: '🧹' },
  { key: 'fold_laundry', name: 'Fold laundry', points: 2, minutes: 15, category: 'weekend', icon: '👕' },
  { key: 'clean_bathroom', name: 'Clean bathroom', points: 3, minutes: 20, category: 'weekend', icon: '🚿' },
  { key: 'help_groceries', name: 'Help with groceries', points: 2, minutes: 15, category: 'weekend', icon: '🛒' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'morning', name: 'Before School', icon: '📚' },
  { key: 'afterschool', name: 'After School', icon: '🎒' },
  { key: 'evening', name: 'Evening', icon: '🌙' },
  { key: 'weekend', name: 'Weekend', icon: '🏠' },
];

export const SCHOOL_YEAR_PRESET: RotationPreset = {
  key: 'school_year',
  name: 'School Year',
  description: 'Light weekday chores that respect homework time. More on weekends.',
  icon: '📚',
  color: '#8b5cf6',
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
        mon: ['make_bed', 'unpack_bag', 'set_table', 'tidy_room'],
        tue: ['make_bed', 'pack_lunch', 'clear_table', 'feed_pet'],
        wed: ['make_bed', 'unpack_bag', 'set_table', 'tidy_room'],
        thu: ['make_bed', 'snack_cleanup', 'clear_table', 'feed_pet'],
        fri: ['make_bed', 'unpack_bag', 'set_table', 'tidy_room'],
        sat: ['make_bed', 'vacuum_room', 'fold_laundry', 'help_groceries'],
        sun: ['make_bed', 'clean_bathroom', 'tidy_room'],
      },
      'Child B': {
        mon: ['make_bed', 'pack_lunch', 'clear_table', 'feed_pet'],
        tue: ['make_bed', 'unpack_bag', 'set_table', 'tidy_room'],
        wed: ['make_bed', 'snack_cleanup', 'clear_table', 'feed_pet'],
        thu: ['make_bed', 'unpack_bag', 'set_table', 'tidy_room'],
        fri: ['make_bed', 'pack_lunch', 'clear_table', 'feed_pet'],
        sat: ['make_bed', 'clean_bathroom', 'help_groceries', 'tidy_room'],
        sun: ['make_bed', 'vacuum_room', 'fold_laundry'],
      },
    },
  },
};
