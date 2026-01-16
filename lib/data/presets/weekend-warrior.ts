/**
 * Weekend Warrior Preset
 * Light weekday chores, intensive weekend deep-cleaning
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Weekday quick chores
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'weekday', icon: '🛏️' },
  { key: 'load_dishwasher', name: 'Load dishwasher', points: 1, minutes: 5, category: 'weekday', icon: '🍽️' },
  { key: 'quick_tidy', name: 'Quick tidy', points: 1, minutes: 5, category: 'weekday', icon: '✨' },
  { key: 'take_trash', name: 'Take out trash', points: 1, minutes: 5, category: 'weekday', icon: '🗑️' },
  // Weekend deep cleaning
  { key: 'vacuum_whole', name: 'Vacuum whole floor', points: 4, minutes: 25, category: 'weekend', icon: '🧹' },
  { key: 'mop_floors', name: 'Mop all floors', points: 4, minutes: 25, category: 'weekend', icon: '🧽' },
  { key: 'clean_bathroom', name: 'Deep clean bathroom', points: 5, minutes: 30, category: 'weekend', icon: '🚿' },
  { key: 'organize_closet', name: 'Organize closet', points: 3, minutes: 20, category: 'weekend', icon: '👕' },
  { key: 'wash_windows', name: 'Wash windows', points: 3, minutes: 20, category: 'weekend', icon: '🪟' },
  { key: 'yard_work', name: 'Yard work', points: 4, minutes: 30, category: 'weekend', icon: '🌿' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'weekday', name: 'Quick Daily', icon: '⚡' },
  { key: 'weekend', name: 'Weekend Deep Clean', icon: '💪' },
];

export const WEEKEND_WARRIOR_PRESET: RotationPreset = {
  key: 'weekend_warrior',
  name: 'Weekend Warrior',
  description: 'Light weekday chores, intensive weekend deep-cleaning.',
  icon: '⚡',
  color: '#f59e0b',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 6,
  min_age: 8,
  cycle_type: 'weekly',
  week_types: ['standard'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    standard: {
      'Child A': {
        mon: ['make_bed', 'quick_tidy'],
        tue: ['make_bed', 'load_dishwasher'],
        wed: ['make_bed', 'take_trash'],
        thu: ['make_bed', 'quick_tidy'],
        fri: ['make_bed', 'load_dishwasher'],
        sat: ['vacuum_whole', 'clean_bathroom'],
        sun: ['mop_floors', 'organize_closet'],
      },
      'Child B': {
        mon: ['make_bed', 'load_dishwasher'],
        tue: ['make_bed', 'quick_tidy'],
        wed: ['make_bed', 'load_dishwasher'],
        thu: ['make_bed', 'take_trash'],
        fri: ['make_bed', 'quick_tidy'],
        sat: ['mop_floors', 'wash_windows'],
        sun: ['vacuum_whole', 'yard_work'],
      },
    },
  },
};
