/**
 * Smart Family Rotation Preset
 * Two-week cycle: cleaning week + maintenance week
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Cleaning chores
  { key: 'vacuum_living', name: 'Vacuum living room', points: 3, minutes: 15, category: 'cleaning', icon: '🧹' },
  { key: 'vacuum_bedroom', name: 'Vacuum bedroom', points: 2, minutes: 10, category: 'cleaning', icon: '🧹' },
  { key: 'mop_kitchen', name: 'Mop kitchen floor', points: 3, minutes: 15, category: 'cleaning', icon: '🧽' },
  { key: 'clean_bathroom', name: 'Clean bathroom', points: 4, minutes: 20, category: 'cleaning', icon: '🚿' },
  { key: 'dust_surfaces', name: 'Dust surfaces', points: 2, minutes: 10, category: 'cleaning', icon: '✨' },
  // Maintenance chores
  { key: 'take_trash', name: 'Take out trash', points: 1, minutes: 5, category: 'maintenance', icon: '🗑️' },
  { key: 'water_plants', name: 'Water plants', points: 1, minutes: 5, category: 'maintenance', icon: '🌱' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'maintenance', icon: '🐕' },
  { key: 'tidy_room', name: 'Tidy bedroom', points: 2, minutes: 10, category: 'maintenance', icon: '🛏️' },
  { key: 'sort_laundry', name: 'Sort laundry', points: 2, minutes: 10, category: 'maintenance', icon: '👕' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'cleaning', name: 'Deep Cleaning', icon: '🧹' },
  { key: 'maintenance', name: 'Daily Maintenance', icon: '🔧' },
];

export const SMART_ROTATION_PRESET: RotationPreset = {
  key: 'smart_rotation',
  name: 'Smart Family Rotation',
  description: 'Two-week cycle balancing cleaning intensity with lighter maintenance weeks.',
  icon: '🎯',
  color: '#10b981',
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 2,  // Only 2 slots defined (Child A, B)
  min_age: 8,
  cycle_type: 'biweekly',
  week_types: ['cleaning', 'non-cleaning'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    cleaning: {
      'Child A': {
        mon: ['vacuum_living', 'take_trash'],
        tue: ['dust_surfaces'],
        wed: ['mop_kitchen'],
        thu: ['tidy_room'],
        fri: ['vacuum_bedroom'],
        sat: ['clean_bathroom'],
        sun: ['water_plants'],
      },
      'Child B': {
        mon: ['dust_surfaces'],
        tue: ['vacuum_living', 'take_trash'],
        wed: ['tidy_room'],
        thu: ['mop_kitchen'],
        fri: ['clean_bathroom'],
        sat: ['vacuum_bedroom'],
        sun: ['feed_pet'],
      },
    },
    'non-cleaning': {
      'Child A': {
        mon: ['take_trash'],
        tue: ['water_plants'],
        wed: ['tidy_room'],
        thu: ['feed_pet'],
        fri: ['sort_laundry'],
        sat: ['tidy_room'],
        sun: ['water_plants'],
      },
      'Child B': {
        mon: ['feed_pet'],
        tue: ['take_trash'],
        wed: ['water_plants'],
        thu: ['tidy_room'],
        fri: ['feed_pet'],
        sat: ['sort_laundry'],
        sun: ['tidy_room'],
      },
    },
  },
};
