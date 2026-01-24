/**
 * Daily Basics Preset
 * Simple, consistent daily routine - same chores every day builds habits
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Morning routine
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'morning', icon: '🛏️' },
  { key: 'brush_teeth_am', name: 'Brush teeth (morning)', points: 1, minutes: 3, category: 'morning', icon: '🦷' },
  { key: 'get_dressed', name: 'Get dressed', points: 1, minutes: 5, category: 'morning', icon: '👕' },
  // Evening routine
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'evening', icon: '🍽️' },
  { key: 'brush_teeth_pm', name: 'Brush teeth (evening)', points: 1, minutes: 3, category: 'evening', icon: '🦷' },
  { key: 'pajamas', name: 'Put on pajamas', points: 1, minutes: 3, category: 'evening', icon: '🌙' },
  { key: 'tidy_toys', name: 'Tidy toys', points: 1, minutes: 5, category: 'evening', icon: '🧸' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'morning', name: 'Morning Routine', icon: '🌅' },
  { key: 'evening', name: 'Evening Routine', icon: '🌙' },
];

export const DAILY_BASICS_PRESET: RotationPreset = {
  key: 'daily_basics',
  name: 'Daily Basics',
  description: 'Simple, consistent daily routine. Same chores every day builds habits.',
  icon: '🌱',
  color: '#3b82f6',
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 2,  // Only 2 slots defined (Child A, B)
  min_age: 6,
  cycle_type: 'daily',
  week_types: ['standard'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    standard: {
      'Child A': {
        mon: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        tue: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        wed: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        thu: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        fri: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        sat: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
        sun: ['make_bed', 'brush_teeth_am', 'clear_table', 'brush_teeth_pm', 'tidy_toys'],
      },
      'Child B': {
        mon: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        tue: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        wed: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        thu: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        fri: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        sat: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
        sun: ['get_dressed', 'brush_teeth_am', 'pajamas', 'brush_teeth_pm', 'tidy_toys'],
      },
    },
  },
};
