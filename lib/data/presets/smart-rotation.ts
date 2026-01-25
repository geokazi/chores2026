/**
 * Smart Family Rotation Preset
 * Two-week cycle where kids SWAP chores for fairness
 *
 * Design principles:
 * 1. Same chores appear in BOTH weeks
 * 2. Kid A's chores in Week 1 become Kid B's in Week 2 (swap)
 * 3. Each day has balanced workload
 * 4. Mix of harder (cleaning) and easier (maintenance) tasks
 */

import type { RotationPreset, PresetChore, ChoreCategory } from "../../types/rotation.ts";

const CHORES: PresetChore[] = [
  // Cleaning chores (harder, more points)
  { key: 'vacuum_living', name: 'Vacuum living room', points: 3, minutes: 15, category: 'cleaning', icon: '🧹' },
  { key: 'vacuum_bedroom', name: 'Vacuum bedroom', points: 2, minutes: 10, category: 'cleaning', icon: '🧹' },
  { key: 'mop_kitchen', name: 'Mop kitchen floor', points: 3, minutes: 15, category: 'cleaning', icon: '🧽' },
  { key: 'clean_bathroom', name: 'Clean bathroom', points: 4, minutes: 20, category: 'cleaning', icon: '🚿' },
  { key: 'dust_surfaces', name: 'Dust surfaces', points: 2, minutes: 10, category: 'cleaning', icon: '✨' },
  // Maintenance chores (lighter, fewer points)
  { key: 'take_trash', name: 'Take out trash', points: 1, minutes: 5, category: 'maintenance', icon: '🗑️' },
  { key: 'water_plants', name: 'Water plants', points: 1, minutes: 5, category: 'maintenance', icon: '🌱' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 5, category: 'maintenance', icon: '🐕' },
  { key: 'tidy_room', name: 'Tidy bedroom', points: 1, minutes: 10, category: 'maintenance', icon: '🛏️' },
  { key: 'sort_laundry', name: 'Sort laundry', points: 2, minutes: 10, category: 'maintenance', icon: '👕' },
];

const CATEGORIES: ChoreCategory[] = [
  { key: 'cleaning', name: 'Deep Cleaning', icon: '🧹' },
  { key: 'maintenance', name: 'Daily Maintenance', icon: '🔧' },
];

export const SMART_ROTATION_PRESET: RotationPreset = {
  key: 'smart_rotation',
  name: 'Smart Family Rotation',
  description: 'Two-week cycle where kids swap chores for fairness. Same chores, different assignments each week.',
  icon: '🎯',
  color: '#10b981',
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 4,
  min_age: 8,
  cycle_type: 'biweekly',
  week_types: ['week_a', 'week_b'],
  categories: CATEGORIES,
  chores: CHORES,
  schedule: {
    // WEEK A: Child A gets "Set 1" chores, Child B gets "Set 2" chores
    week_a: {
      'Child A': {
        mon: ['vacuum_living', 'take_trash'],      // 4 pts - cleaning heavy
        tue: ['mop_kitchen'],                       // 3 pts
        wed: ['dust_surfaces', 'tidy_room'],       // 3 pts - mixed
        thu: ['feed_pet', 'water_plants'],         // 2 pts - light day
        fri: ['vacuum_bedroom'],                    // 2 pts
        sat: ['clean_bathroom'],                    // 4 pts - big chore
        sun: ['sort_laundry'],                      // 2 pts - easy day
      },
      'Child B': {
        mon: ['dust_surfaces', 'feed_pet'],        // 3 pts - lighter start
        tue: ['tidy_room', 'water_plants'],        // 2 pts
        wed: ['vacuum_living', 'take_trash'],      // 4 pts - cleaning heavy
        thu: ['mop_kitchen'],                       // 3 pts
        fri: ['clean_bathroom'],                    // 4 pts - big chore
        sat: ['vacuum_bedroom'],                    // 2 pts
        sun: ['sort_laundry'],                      // 2 pts - easy day
      },
      'Child C': {
        mon: ['tidy_room', 'water_plants'],        // 2 pts
        tue: ['vacuum_living', 'take_trash'],      // 4 pts
        wed: ['feed_pet'],                          // 1 pt - light day
        thu: ['dust_surfaces', 'tidy_room'],       // 3 pts
        fri: ['mop_kitchen'],                       // 3 pts
        sat: ['sort_laundry'],                      // 2 pts
        sun: ['clean_bathroom'],                    // 4 pts
      },
      'Child D': {
        mon: ['feed_pet'],                          // 1 pt - light day
        tue: ['dust_surfaces', 'tidy_room'],       // 3 pts
        wed: ['mop_kitchen'],                       // 3 pts
        thu: ['vacuum_living', 'take_trash'],      // 4 pts
        fri: ['tidy_room', 'water_plants'],        // 2 pts
        sat: ['clean_bathroom'],                    // 4 pts
        sun: ['vacuum_bedroom'],                    // 2 pts
      },
    },
    // WEEK B: SWAPPED - Child A gets "Set 2" chores, Child B gets "Set 1" chores
    week_b: {
      'Child A': {
        mon: ['dust_surfaces', 'feed_pet'],        // Was Child B's Mon
        tue: ['tidy_room', 'water_plants'],        // Was Child B's Tue
        wed: ['vacuum_living', 'take_trash'],      // Was Child B's Wed
        thu: ['mop_kitchen'],                       // Was Child B's Thu
        fri: ['clean_bathroom'],                    // Was Child B's Fri
        sat: ['vacuum_bedroom'],                    // Was Child B's Sat
        sun: ['sort_laundry'],                      // Same - everyone does
      },
      'Child B': {
        mon: ['vacuum_living', 'take_trash'],      // Was Child A's Mon
        tue: ['mop_kitchen'],                       // Was Child A's Tue
        wed: ['dust_surfaces', 'tidy_room'],       // Was Child A's Wed
        thu: ['feed_pet', 'water_plants'],         // Was Child A's Thu
        fri: ['vacuum_bedroom'],                    // Was Child A's Fri
        sat: ['clean_bathroom'],                    // Was Child A's Sat
        sun: ['sort_laundry'],                      // Same - everyone does
      },
      'Child C': {
        mon: ['feed_pet'],                          // Was Child D's Mon
        tue: ['dust_surfaces', 'tidy_room'],       // Was Child D's Tue
        wed: ['mop_kitchen'],                       // Was Child D's Wed
        thu: ['vacuum_living', 'take_trash'],      // Was Child D's Thu
        fri: ['tidy_room', 'water_plants'],        // Was Child D's Fri
        sat: ['clean_bathroom'],                    // Was Child D's Sat
        sun: ['vacuum_bedroom'],                    // Was Child D's Sun
      },
      'Child D': {
        mon: ['tidy_room', 'water_plants'],        // Was Child C's Mon
        tue: ['vacuum_living', 'take_trash'],      // Was Child C's Tue
        wed: ['feed_pet'],                          // Was Child C's Wed
        thu: ['dust_surfaces', 'tidy_room'],       // Was Child C's Thu
        fri: ['mop_kitchen'],                       // Was Child C's Fri
        sat: ['sort_laundry'],                      // Was Child C's Sat
        sun: ['clean_bathroom'],                    // Was Child C's Sun
      },
    },
  },
};
