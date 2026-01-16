# Chore Templates - JSONB Schema Design

**Document Created**: January 15, 2026
**Updated**: January 16, 2026
**Status**: Design Complete
**Architecture**: Zero New Tables - Static TypeScript + JSONB Config

## MVP Scope: 3-5 Curated Templates (Static TypeScript)

| Template | Key | Cycle | Kids | Description |
|----------|-----|-------|------|-------------|
| 🎯 Smart Family Rotation | `smart_rotation` | Biweekly | 2-4 | Cleaning week + maintenance week |
| ⚡ Weekend Warrior | `weekend_warrior` | Weekly | 2-6 | Light weekdays, heavy weekends |
| 🌱 Daily Basics | `daily_basics` | Daily | 2-3 | Same simple routine every day |

**All three use the same data model**: `schedule[weekType][slot][day] = choreKeys[]`

---

## Scalability Decision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHY STATIC TYPESCRIPT, NOT DATABASE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   QUESTION: What if we need 100 templates?                                  │
│   ANSWER: We don't. 3-5 templates cover 80%+ of families.                   │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   STATIC TYPESCRIPT (Current Approach)        DATABASE (Not Needed)         │
│   ════════════════════════════════════        ══════════════════════        │
│                                                                             │
│   ✅ Zero runtime DB queries for templates    ❌ Query on every page load   │
│   ✅ Type-safe template definitions           ❌ Runtime type validation    │
│   ✅ Version controlled (git history)         ❌ Data migration complexity  │
│   ✅ No bundle size issue with 3-5 templates  ❌ Lazy loading needed        │
│   ✅ Instant deployment (code push)           ❌ Data seeding scripts       │
│   ✅ Easy to review/audit template changes    ❌ Admin UI needed            │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   IF CUSTOMIZATION NEEDED (Future):                                         │
│   • Use JSONB customizations field (already in schema)                      │
│   • Family tweaks preset, stored in their settings                          │
│   • No new tables, no template proliferation                                │
│                                                                             │
│   IF 50+ TEMPLATES TRULY NEEDED (Unlikely):                                 │
│   • Move to database + lazy loading                                         │
│   • Only build if real usage data proves demand                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STATIC (TypeScript)              DYNAMIC (JSONB in Supabase) │
│   ════════════════════             ═══════════════════════════  │
│                                                                 │
│   ┌─────────────────┐              ┌─────────────────────────┐ │
│   │ Preset          │              │ families.settings       │ │
│   │ Definitions     │              │   .apps.choregami       │ │
│   │                 │              │     .rotation           │ │
│   │ • Templates     │              │                         │ │
│   │ • Chore catalog │   ────────▶  │ • Which preset active   │ │
│   │ • Schedules     │              │ • Child slot mappings   │ │
│   │                 │              │ • Start date            │ │
│   │ (Never changes) │              │ • Customizations        │ │
│   └─────────────────┘              └─────────────────────────┘ │
│                                                                 │
│   lib/data/                        Database                     │
│   rotation-presets.ts              public.families.settings     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Static data stays in code** - Template definitions, chore catalogs, schedules
2. **Dynamic data in JSONB** - Family's chosen template, child mappings, customizations
3. **Zero new tables** - Extend existing `families.settings` JSONB column
4. **Sparse storage** - Only store overrides, not full schedules

---

## Database: Extend Existing JSONB

### Current Schema (Already Exists)

```sql
-- From sql/20260114_jsonb_settings.sql
public.families.settings JSONB NOT NULL DEFAULT '{}'

-- Current structure:
{
  "theme": "fresh_meadow",
  "apps": {
    "choregami": {
      "points_per_dollar": 1,
      "children_pins_enabled": true,
      "weekly_bonus_points": 5
    }
  },
  "_version": 1
}
```

### Extended Schema (Add `rotation` key)

```sql
-- NO MIGRATION NEEDED - just write to the JSONB path
-- families.settings.apps.choregami.rotation

{
  "theme": "fresh_meadow",
  "apps": {
    "choregami": {
      "points_per_dollar": 1,
      "children_pins_enabled": true,
      "weekly_bonus_points": 5,

      "rotation": {                           -- NEW
        "active_preset": "smart_rotation",    -- Which template is active
        "start_date": "2026-01-13",           -- For week type calculation
        "child_slots": [                      -- Map template slots to real kids
          {
            "slot": "Child A",
            "profile_id": "1308d342-86f9-4c27-b185-39bd185c21b9"
          },
          {
            "slot": "Child B",
            "profile_id": "8349a1b3-b716-4744-91fd-dd2e28e71bc3"
          }
        ],
        "customizations": null                -- Future: sparse overrides
      }
    }
  },
  "_version": 1
}
```

### Size Analysis

| Data | Approx Size | Location |
|------|-------------|----------|
| Active preset key | ~20 bytes | JSONB |
| Start date | ~10 bytes | JSONB |
| Child mappings (4 kids) | ~300 bytes | JSONB |
| **Total per family** | **~350 bytes** | JSONB |
| Full preset definitions | ~50KB | Static TypeScript |

**Result**: Minimal database storage. Heavy lifting in static code.

---

## TypeScript Types

### Family Settings (Extends Existing)

```typescript
// lib/types/family-settings.ts (extend existing)

interface ChoreGamiAppSettings {
  points_per_dollar?: number;
  children_pins_enabled?: boolean;
  weekly_bonus_points?: number;

  // NEW: Rotation configuration
  rotation?: RotationConfig;
}

interface RotationConfig {
  active_preset: string;           // 'smart_rotation', 'weekend_warrior', etc.
  start_date: string;              // ISO date string 'YYYY-MM-DD'
  child_slots: ChildSlotMapping[];
  customizations?: RotationCustomizations | null;
}

interface ChildSlotMapping {
  slot: string;                    // 'Child A', 'Child B', 'Child C', 'Child D'
  profile_id: string;              // UUID from family_profiles
}

interface RotationCustomizations {
  // Override points or disable specific chores
  chore_overrides?: {
    [choreKey: string]: {
      points?: number;             // Override default points
      enabled?: boolean;           // false = disabled (default true)
    };
  };

  // Custom chores added by family (appear daily for all slots)
  custom_chores?: CustomChore[];
}

interface CustomChore {
  key: string;                     // Unique key (e.g., "custom_feed_fish")
  name: string;                    // Display name
  points: number;                  // Point value
  icon: string;                    // Emoji icon
}
```

### Static Preset Definitions

```typescript
// lib/data/rotation-presets.ts

// ============================================================
// PRESET TEMPLATE STRUCTURE
// ============================================================

export interface RotationPreset {
  // Identity
  key: string;                     // Unique identifier
  name: string;                    // Display name
  description: string;             // Short description
  icon: string;                    // Emoji icon
  color?: string;                  // Optional accent color (e.g., '#10b981')

  // Metadata (simplified for MVP)
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Constraints
  min_children: number;
  max_children: number;
  min_age?: number;

  // Schedule structure
  cycle_type: 'daily' | 'weekly' | 'biweekly';
  week_types: string[];            // ['cleaning', 'non-cleaning'] or ['standard']

  // Categories for display
  categories: ChoreCategory[];

  // The actual schedule
  schedule: RotationSchedule;
}

export interface ChoreCategory {
  key: string;
  name: string;
  icon: string;
  chore_count: number;
  point_range: string;             // "1-3"
  time_range: string;              // "5-15 min"
}

// ============================================================
// CHORE DEFINITION (in preset)
// ============================================================

export interface ChoreDefinition {
  key: string;                     // Unique within preset
  name: string;
  points: number;
  minutes: number;
  category: string;                // References ChoreCategory.key
  icon: string;
}

// ============================================================
// SCHEDULE STRUCTURE
// ============================================================

// schedule[weekType][slot][dayOfWeek] = choreKeys[]
export type RotationSchedule = {
  [weekType: string]: {
    [slot: string]: {
      [day: number]: string[];     // Array of chore keys
    };
  };
};

// ============================================================
// COMPUTED TYPES (derived at runtime)
// ============================================================

export interface SlotSummary {
  slot: string;
  weekly_points: number;
  weekly_minutes: number;
  chore_count: number;
  focus_area: string;              // "Cleaning focus", "Pet focus"
}

export interface DaySchedule {
  chores: ChoreDefinition[];
  total_points: number;
  total_minutes: number;
}
```

---

## Static Preset Data Structure

### Example: Smart Family Rotation

```typescript
// lib/data/presets/smart-rotation.ts

import { RotationPreset, ChoreDefinition } from '../rotation-presets.ts';

export const SMART_ROTATION_CHORES: ChoreDefinition[] = [
  // Kitchen & Dining
  { key: 'dishes', name: 'Dishes', points: 2, minutes: 15, category: 'kitchen', icon: '🍽️' },
  { key: 'load_dishwasher', name: 'Load dishwasher', points: 2, minutes: 10, category: 'kitchen', icon: '🍽️' },
  { key: 'unload_dishwasher', name: 'Unload dishwasher', points: 2, minutes: 10, category: 'kitchen', icon: '🍽️' },
  { key: 'wipe_counters', name: 'Wipe counters', points: 1, minutes: 5, category: 'kitchen', icon: '🍽️' },
  { key: 'clean_stove', name: 'Clean stove', points: 3, minutes: 12, category: 'kitchen', icon: '🍽️' },

  // Pet Care
  { key: 'feed_dog', name: 'Feed dog', points: 1, minutes: 3, category: 'pets', icon: '🐕' },
  { key: 'brush_dog', name: 'Brush dog', points: 2, minutes: 8, category: 'pets', icon: '🐕' },
  { key: 'walk_dog', name: 'Walk dog', points: 1, minutes: 5, category: 'pets', icon: '🐕' },

  // General Cleaning
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'cleaning', icon: '🛏️' },
  { key: 'organize_room', name: 'Organize room', points: 2, minutes: 15, category: 'cleaning', icon: '🏠' },
  { key: 'dust_surfaces', name: 'Dust surfaces', points: 2, minutes: 10, category: 'cleaning', icon: '🧹' },
  { key: 'vacuum_floor', name: 'Vacuum floor', points: 2, minutes: 12, category: 'cleaning', icon: '🧹' },

  // Laundry & More
  { key: 'sort_laundry', name: 'Sort & start laundry', points: 3, minutes: 10, category: 'laundry', icon: '🧺' },
  { key: 'fold_laundry', name: 'Fold & put away', points: 4, minutes: 20, category: 'laundry', icon: '🧺' },
  { key: 'tidy_bathroom', name: 'Tidy bathroom', points: 2, minutes: 10, category: 'bathroom', icon: '🚿' },
  { key: 'vacuum_car', name: 'Vacuum car', points: 3, minutes: 15, category: 'outdoor', icon: '🚗' },
  { key: 'vacuum_carpet', name: 'Vacuum carpet', points: 3, minutes: 15, category: 'cleaning', icon: '🧹' },
];

export const SMART_ROTATION_PRESET: RotationPreset = {
  key: 'smart_rotation',
  name: 'Smart Family Rotation',
  description: 'Two-week cycle balancing cleaning intensity with lighter maintenance weeks.',
  icon: '🎯',
  color: '#10b981',                // Emerald green

  difficulty: 'beginner',

  min_children: 2,
  max_children: 4,
  min_age: 8,

  cycle_type: 'biweekly',
  week_types: ['cleaning', 'non-cleaning'],

  categories: [
    { key: 'kitchen', name: 'Kitchen & Dining', icon: '🍽️', chore_count: 5, point_range: '1-3', time_range: '5-15 min' },
    { key: 'pets', name: 'Pet Care', icon: '🐕', chore_count: 3, point_range: '1-2', time_range: '3-8 min' },
    { key: 'cleaning', name: 'General Cleaning', icon: '🏠', chore_count: 4, point_range: '1-2', time_range: '3-15 min' },
    { key: 'laundry', name: 'Laundry & More', icon: '🧺', chore_count: 5, point_range: '2-4', time_range: '8-25 min' },
  ],

  schedule: {
    cleaning: {
      'Child A': {
        1: ['dishes', 'vacuum_car', 'walk_dog'],           // Monday
        2: ['brush_dog', 'walk_dog'],                       // Tuesday
        3: ['dishes', 'make_bed', 'organize_room'],         // Wednesday
        4: ['brush_dog', 'dishes', 'tidy_bathroom'],        // Thursday
        5: ['dishes', 'sort_laundry', 'walk_dog', 'vacuum_carpet'], // Friday
        6: ['brush_dog', 'make_bed', 'organize_room'],      // Saturday
        0: ['dust_surfaces'],                               // Sunday
      },
      'Child B': {
        1: ['brush_dog', 'fold_laundry', 'walk_dog'],
        2: ['dishes', 'sort_laundry'],
        3: ['brush_dog', 'dust_surfaces', 'vacuum_floor'],
        4: ['dishes', 'walk_dog', 'vacuum_carpet'],
        5: ['brush_dog', 'walk_dog'],
        6: ['dishes', 'walk_dog'],
        0: ['tidy_bathroom'],
      },
      'Child C': {
        1: ['dishes', 'make_bed'],
        2: ['walk_dog', 'dust_surfaces'],
        3: ['dishes', 'vacuum_floor'],
        4: ['brush_dog', 'make_bed'],
        5: ['dishes', 'tidy_bathroom'],
        6: ['walk_dog', 'organize_room'],
        0: ['make_bed'],
      },
      'Child D': {
        1: ['walk_dog', 'make_bed'],
        2: ['dishes', 'make_bed'],
        3: ['walk_dog', 'make_bed'],
        4: ['dishes', 'walk_dog'],
        5: ['make_bed', 'organize_room'],
        6: ['dishes', 'make_bed'],
        0: ['walk_dog'],
      },
    },
    'non-cleaning': {
      'Child A': {
        1: ['dishes', 'brush_dog', 'dust_surfaces', 'walk_dog'],
        2: ['dishes', 'sort_laundry', 'vacuum_floor'],
        3: ['dishes', 'make_bed', 'organize_room'],
        4: ['brush_dog', 'tidy_bathroom', 'organize_room'],
        5: ['dishes', 'vacuum_floor', 'make_bed', 'brush_dog'],
        6: ['wipe_counters', 'walk_dog'],
        0: ['dust_surfaces'],
      },
      'Child B': {
        1: ['brush_dog', 'vacuum_carpet', 'walk_dog'],
        2: ['brush_dog', 'tidy_bathroom', 'walk_dog'],
        3: ['brush_dog', 'clean_stove'],
        4: ['dishes', 'vacuum_carpet', 'sort_laundry'],
        5: ['walk_dog'],
        6: ['make_bed'],
        0: ['fold_laundry'],
      },
      // Child C and D have lighter schedules in non-cleaning week
      'Child C': {
        1: ['make_bed', 'walk_dog'],
        2: ['dishes', 'make_bed'],
        3: ['walk_dog'],
        4: ['make_bed'],
        5: ['dishes'],
        6: ['walk_dog'],
        0: ['make_bed'],
      },
      'Child D': {
        1: ['make_bed'],
        2: ['walk_dog'],
        3: ['make_bed'],
        4: ['walk_dog'],
        5: ['make_bed'],
        6: ['walk_dog'],
        0: ['make_bed'],
      },
    },
  },
};
```

### Preset 2: Weekend Warrior

```typescript
// lib/data/presets/weekend-warrior.ts

export const WEEKEND_WARRIOR_CHORES: ChoreDefinition[] = [
  // Quick daily chores (weekdays)
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'bedroom', icon: '🛏️' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 3, category: 'pets', icon: '🐕' },

  // Weekend deep clean chores
  { key: 'deep_clean_bedroom', name: 'Deep clean bedroom', points: 3, minutes: 25, category: 'bedroom', icon: '🛏️' },
  { key: 'vacuum_upstairs', name: 'Vacuum upstairs', points: 3, minutes: 20, category: 'cleaning', icon: '🧹' },
  { key: 'vacuum_downstairs', name: 'Vacuum downstairs', points: 3, minutes: 20, category: 'cleaning', icon: '🧹' },
  { key: 'sort_laundry', name: 'Sort & start laundry', points: 3, minutes: 10, category: 'laundry', icon: '🧺' },
  { key: 'fold_laundry', name: 'Fold & put away', points: 3, minutes: 20, category: 'laundry', icon: '🧺' },
  { key: 'clean_bathroom', name: 'Clean bathroom', points: 4, minutes: 25, category: 'bathroom', icon: '🚿' },
  { key: 'yard_work', name: 'Yard work', points: 4, minutes: 30, category: 'outdoor', icon: '🌿' },
  { key: 'organize_playroom', name: 'Organize playroom', points: 3, minutes: 20, category: 'cleaning', icon: '🧸' },
  { key: 'dust_living_room', name: 'Dust living room', points: 2, minutes: 15, category: 'cleaning', icon: '🧹' },
  { key: 'vacuum_stairs', name: 'Vacuum stairs', points: 2, minutes: 10, category: 'cleaning', icon: '🧹' },
];

export const WEEKEND_WARRIOR_PRESET: RotationPreset = {
  key: 'weekend_warrior',
  name: 'Weekend Warrior',
  description: 'Light weekday chores, intensive weekend deep-cleaning.',
  icon: '⚡',
  color: '#f59e0b',                // Amber

  difficulty: 'beginner',

  min_children: 2,
  max_children: 6,
  min_age: 8,

  cycle_type: 'weekly',
  week_types: ['standard'],  // Single week type

  categories: [
    { key: 'bedroom', name: 'Bedroom', icon: '🛏️', chore_count: 2, point_range: '1-3', time_range: '3-25 min' },
    { key: 'cleaning', name: 'Deep Cleaning', icon: '🧹', chore_count: 5, point_range: '2-3', time_range: '10-20 min' },
    { key: 'laundry', name: 'Laundry', icon: '🧺', chore_count: 2, point_range: '3', time_range: '10-20 min' },
    { key: 'outdoor', name: 'Outdoor', icon: '🌿', chore_count: 1, point_range: '4', time_range: '30 min' },
  ],

  schedule: {
    standard: {
      'Child A': {
        1: ['make_bed', 'feed_pet'],                    // Monday - light
        2: ['make_bed', 'feed_pet'],                    // Tuesday - light
        3: ['make_bed', 'feed_pet'],                    // Wednesday - light
        4: ['make_bed', 'feed_pet'],                    // Thursday - light
        5: ['make_bed', 'vacuum_downstairs'],           // Friday - transition
        6: ['deep_clean_bedroom', 'vacuum_upstairs', 'sort_laundry', 'fold_laundry'],  // Saturday - heavy
        0: ['clean_bathroom', 'yard_work', 'organize_playroom'],  // Sunday - heavy
      },
      'Child B': {
        1: ['make_bed', 'feed_pet'],
        2: ['make_bed', 'feed_pet'],
        3: ['make_bed', 'feed_pet'],
        4: ['make_bed', 'feed_pet'],
        5: ['make_bed', 'vacuum_upstairs'],
        6: ['dust_living_room', 'vacuum_stairs', 'vacuum_downstairs'],
        0: ['deep_clean_bedroom', 'sort_laundry', 'fold_laundry'],
      },
      // Lighter schedules for younger kids (Child C-F)
      'Child C': {
        1: ['make_bed'],
        2: ['make_bed'],
        3: ['make_bed'],
        4: ['make_bed'],
        5: ['make_bed'],
        6: ['make_bed', 'dust_living_room'],
        0: ['make_bed', 'organize_playroom'],
      },
      'Child D': {
        1: ['feed_pet'],
        2: ['feed_pet'],
        3: ['feed_pet'],
        4: ['feed_pet'],
        5: ['feed_pet'],
        6: ['feed_pet', 'vacuum_stairs'],
        0: ['feed_pet', 'deep_clean_bedroom'],
      },
    },
  },
};
```

### Preset 3: Daily Basics

```typescript
// lib/data/presets/daily-basics.ts

export const DAILY_BASICS_CHORES: ChoreDefinition[] = [
  // Morning routine
  { key: 'make_bed', name: 'Make bed', points: 1, minutes: 3, category: 'morning', icon: '🛏️' },
  { key: 'feed_pet', name: 'Feed pet', points: 1, minutes: 3, category: 'morning', icon: '🐕' },

  // After school routine
  { key: 'put_away_backpack', name: 'Put away backpack', points: 1, minutes: 5, category: 'afterschool', icon: '🎒' },
  { key: 'tidy_room', name: 'Tidy room', points: 1, minutes: 5, category: 'afterschool', icon: '🧸' },

  // Evening routine (optional extras)
  { key: 'set_table', name: 'Set table', points: 1, minutes: 3, category: 'evening', icon: '🍽️' },
  { key: 'clear_table', name: 'Clear table', points: 1, minutes: 5, category: 'evening', icon: '🍽️' },
];

export const DAILY_BASICS_PRESET: RotationPreset = {
  key: 'daily_basics',
  name: 'Daily Basics',
  description: 'Simple, consistent daily routine. Same chores every day builds habits.',
  icon: '🌱',
  color: '#3b82f6',                // Blue

  difficulty: 'beginner',

  min_children: 2,
  max_children: 3,
  min_age: 6,

  cycle_type: 'daily',
  week_types: ['standard'],  // Same every day

  categories: [
    { key: 'morning', name: 'Morning', icon: '☀️', chore_count: 2, point_range: '1', time_range: '3 min' },
    { key: 'afterschool', name: 'After School', icon: '🏠', chore_count: 2, point_range: '1', time_range: '5 min' },
    { key: 'evening', name: 'Evening', icon: '🌙', chore_count: 2, point_range: '1', time_range: '3-5 min' },
  ],

  schedule: {
    standard: {
      // Same schedule every day (0-6)
      'Child A': {
        0: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        1: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        2: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        3: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        4: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        5: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
        6: ['make_bed', 'feed_pet', 'put_away_backpack', 'tidy_room'],
      },
      'Child B': {
        0: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        1: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        2: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        3: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        4: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        5: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
        6: ['make_bed', 'set_table', 'clear_table', 'tidy_room'],
      },
      'Child C': {
        0: ['make_bed', 'feed_pet', 'tidy_room'],
        1: ['make_bed', 'feed_pet', 'tidy_room'],
        2: ['make_bed', 'feed_pet', 'tidy_room'],
        3: ['make_bed', 'feed_pet', 'tidy_room'],
        4: ['make_bed', 'feed_pet', 'tidy_room'],
        5: ['make_bed', 'feed_pet', 'tidy_room'],
        6: ['make_bed', 'feed_pet', 'tidy_room'],
      },
    },
  },
};
```

### Preset Registry (All 3 Templates)

```typescript
// lib/data/rotation-presets.ts

import { SMART_ROTATION_PRESET, SMART_ROTATION_CHORES } from './presets/smart-rotation.ts';
import { WEEKEND_WARRIOR_PRESET, WEEKEND_WARRIOR_CHORES } from './presets/weekend-warrior.ts';
import { DAILY_BASICS_PRESET, DAILY_BASICS_CHORES } from './presets/daily-basics.ts';

// ============================================================
// PRESET REGISTRY - MVP: 3 Daily Assignment Templates
// ============================================================

export const ROTATION_PRESETS: RotationPreset[] = [
  SMART_ROTATION_PRESET,
  WEEKEND_WARRIOR_PRESET,
  DAILY_BASICS_PRESET,
];

// Chore catalog per preset
export const PRESET_CHORES: Record<string, ChoreDefinition[]> = {
  smart_rotation: SMART_ROTATION_CHORES,
  weekend_warrior: WEEKEND_WARRIOR_CHORES,
  daily_basics: DAILY_BASICS_CHORES,
};

// ============================================================
// LOOKUP FUNCTIONS
// ============================================================

export function getPreset(key: string): RotationPreset | undefined {
  return ROTATION_PRESETS.find(p => p.key === key);
}

export function getPresetChores(presetKey: string): ChoreDefinition[] {
  return PRESET_CHORES[presetKey] || [];
}

export function getChoreByKey(presetKey: string, choreKey: string): ChoreDefinition | undefined {
  return getPresetChores(presetKey).find(c => c.key === choreKey);
}

export function getPresetsForFamily(childCount: number): RotationPreset[] {
  return ROTATION_PRESETS.filter(
    p => childCount >= p.min_children && childCount <= p.max_children
  );
}
```

---

## Query Patterns

### Read Family's Rotation Config

```typescript
// In existing service or component
const { data: family } = await supabase
  .from('families')
  .select('settings')
  .eq('id', familyId)
  .single();

const rotation = family?.settings?.apps?.choregami?.rotation;
if (rotation?.active_preset) {
  const preset = getPreset(rotation.active_preset);
  // Use preset + rotation.child_slots to compute today's chores
}
```

### Apply Template (Update JSONB)

```typescript
// Set rotation config
await supabase
  .from('families')
  .update({
    settings: supabase.sql`
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{apps,choregami,rotation}',
        ${JSON.stringify({
          active_preset: presetKey,
          start_date: new Date().toISOString().split('T')[0],
          child_slots: childSlots,
        })}::jsonb
      )
    `
  })
  .eq('id', familyId);
```

### Clear Rotation

```typescript
// Remove rotation config
await supabase
  .from('families')
  .update({
    settings: supabase.sql`
      settings #- '{apps,choregami,rotation}'
    `
  })
  .eq('id', familyId);
```

### Get Today's Rotation Chores for a Profile

```typescript
function getTodaysRotationChores(
  settings: FamilySettings,
  profileId: string
): ChoreDefinition[] {
  const rotation = settings?.apps?.choregami?.rotation;
  if (!rotation?.active_preset) return [];

  const preset = getPreset(rotation.active_preset);
  if (!preset) return [];

  // Find which slot this profile is assigned to
  const mapping = rotation.child_slots.find(s => s.profile_id === profileId);
  if (!mapping) return [];

  // Calculate current week type
  const weekType = getCurrentWeekType(rotation.start_date, preset.week_types);
  const dayOfWeek = new Date().getDay();

  // Get chore keys for this slot/day/week
  const choreKeys = preset.schedule[weekType]?.[mapping.slot]?.[dayOfWeek] || [];

  // Map keys to full chore definitions
  const chores = getPresetChores(rotation.active_preset);
  return choreKeys
    .map(key => chores.find(c => c.key === key))
    .filter((c): c is ChoreDefinition => c !== undefined);
}

function getCurrentWeekType(startDate: string, weekTypes: string[]): string {
  const start = new Date(startDate);
  const today = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceStart = Math.floor((today.getTime() - start.getTime()) / msPerWeek);
  return weekTypes[weeksSinceStart % weekTypes.length];
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. APPLY TEMPLATE                                              │
│  ═══════════════════                                            │
│                                                                 │
│  Parent taps "Use Template"                                     │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ POST /api/rotation/apply                │                   │
│  │ { presetKey, childSlots }               │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ UPDATE families.settings                │                   │
│  │ SET rotation = { ... }                  │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│                                                                 │
│  2. GET TODAY'S CHORES                                          │
│  ═══════════════════════                                        │
│                                                                 │
│  Kid opens dashboard                                            │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Read families.settings.apps             │                   │
│  │       .choregami.rotation               │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       │ active_preset: "smart_rotation"                         │
│       │ child_slots: [{slot: "Child A", profile_id: "..."}]    │
│       │ start_date: "2026-01-13"                               │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Load static preset from TypeScript      │                   │
│  │ getPreset("smart_rotation")             │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       │ preset.schedule["cleaning"]["Child A"][1]              │
│       │ = ["dishes", "vacuum_car", "walk_dog"]                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Map chore keys to definitions           │                   │
│  │ getPresetChores("smart_rotation")       │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Return ChoreDefinition[]                │                   │
│  │ [{ name: "Dishes", points: 2, ... }]    │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│                                                                 │
│  3. COMPLETE CHORE (unchanged flow)                             │
│  ═══════════════════════════════════                            │
│                                                                 │
│  Kid taps "I Did This!"                                         │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Existing ChoreService.completeChore()   │                   │
│  │ + TransactionService                    │                   │
│  │ + FamilyScore sync                      │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Future Extensibility

### Adding a New Template

```typescript
// 1. Create lib/data/presets/weekend-warrior.ts
export const WEEKEND_WARRIOR_CHORES: ChoreDefinition[] = [ /* ... */ ];
export const WEEKEND_WARRIOR_PRESET: RotationPreset = { /* ... */ };

// 2. Add to registry in lib/data/rotation-presets.ts
import { WEEKEND_WARRIOR_PRESET, WEEKEND_WARRIOR_CHORES } from './presets/weekend-warrior.ts';

export const ROTATION_PRESETS: RotationPreset[] = [
  SMART_ROTATION_PRESET,
  WEEKEND_WARRIOR_PRESET,  // ADD
];

export const PRESET_CHORES: Record<string, ChoreDefinition[]> = {
  smart_rotation: SMART_ROTATION_CHORES,
  weekend_warrior: WEEKEND_WARRIOR_CHORES,  // ADD
};

// That's it! No database changes needed.
```

### Template Customization (Future Enhancement)

**Design: Override Layer Pattern**

Store only the differences from the base preset, not full templates.
This enables 80% of customization needs with minimal complexity.

```typescript
// Example: Family tweaks the Smart Rotation template
{
  "rotation": {
    "active_preset": "smart_rotation",
    "start_date": "2026-01-13",
    "child_slots": [...],

    // NEW: Only stores differences from default
    "customizations": {
      // Override specific chores
      "chore_overrides": {
        "make_bed": { "points": 2 },         // Was 1, now 2
        "vacuum_floor": { "enabled": false }, // Disabled
        "dishes": { "points": 3 }            // Was 2, now 3
      },

      // Add family-specific chores (daily for all slots)
      "custom_chores": [
        { "key": "feed_fish", "name": "Feed the fish", "points": 1, "icon": "🐟" },
        { "key": "water_plants", "name": "Water plants", "points": 2, "icon": "🌱" }
      ]
    }
  }
}
```

**Runtime Merge Function** (~30 lines):

```typescript
function getChoresWithCustomizations(
  preset: RotationPreset,
  customizations?: RotationCustomizations
): PresetChore[] {
  let chores = [...preset.chores];

  // Apply overrides: filter disabled, map point changes
  chores = chores
    .filter(c => customizations?.chore_overrides?.[c.key]?.enabled !== false)
    .map(c => ({
      ...c,
      points: customizations?.chore_overrides?.[c.key]?.points ?? c.points
    }));

  // Append custom chores
  if (customizations?.custom_chores) {
    chores.push(...customizations.custom_chores.map(c => ({
      ...c,
      minutes: 5,           // Default estimate
      category: 'custom',
    })));
  }

  return chores;
}
```

**What Families CAN Customize:**
- ✅ Change points for any template chore
- ✅ Disable chores they don't want
- ✅ Add custom chores (appear daily)

**What Stays Fixed (Keep Simple):**
- ❌ Schedule/day assignments (pick a different template)
- ❌ Chore names/icons (add custom chore instead)
- ❌ Per-day custom chore assignment (always daily)

**UI Mockup:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Smart Family Rotation - Customize                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ TEMPLATE CHORES:                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [✓] 🛏️ Make bed                         [2▼] pts          │ │
│ │ [✓] 🧹 Vacuum floor                      [3▼] pts          │ │
│ │ [ ] 🪟 Wash windows                      [3▼] pts  DISABLED │ │
│ │ [✓] 🍽️ Dishes                            [3▼] pts          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ CUSTOM CHORES (daily):                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🐟 Feed the fish                         [1▼] pts    [×]   │ │
│ │ 🌱 Water plants                          [2▼] pts    [×]   │ │
│ │ [+ Add Chore]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Save]                                     [Reset to Defaults]  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Estimate:**

| File | Lines | Purpose |
|------|-------|---------|
| `rotation-service.ts` | +30 | `getChoresWithCustomizations()` |
| `routes/api/rotation/customize.ts` | ~50 | Save customizations endpoint |
| `islands/TemplateCustomizer.tsx` | ~150 | UI component |
| JSONB schema doc | +20 | Document new fields |
| **Total** | **~250** | Well under 500 limit |

**Applies To:**
- ✅ Smart Family Rotation
- ✅ Weekend Warrior
- ✅ Daily Basics
- N/A Manual (Default) - already has full control via DB tables

### Per-Profile Preferences (Future)

```typescript
// Store in family_profiles.preferences JSONB:
{
  "rotation": {
    "preferred_time": "after_school",    // When to show reminders
    "difficulty_level": "standard"        // vs "easy" or "challenge"
  }
}
```

---

## Database Migrations: NONE REQUIRED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NO SQL MIGRATIONS NEEDED                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   EXISTING INFRASTRUCTURE (Already in place):                               │
│   ═══════════════════════════════════════════                               │
│                                                                             │
│   public.families.settings JSONB NOT NULL DEFAULT '{}'                      │
│   Source: sql/20260114_jsonb_settings.sql                                   │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   HOW ROTATION CONFIG GETS STORED:                                          │
│   ═════════════════════════════════                                         │
│                                                                             │
│   We write to a new JSONB path - no schema change needed:                   │
│                                                                             │
│   families.settings.apps.choregami.rotation = {                             │
│     "active_preset": "smart_rotation",                                      │
│     "start_date": "2026-01-16",                                             │
│     "child_slots": [                                                        │
│       { "slot": "Child A", "profile_id": "uuid-here" },                     │
│       { "slot": "Child B", "profile_id": "uuid-here" }                      │
│     ]                                                                       │
│   }                                                                         │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   WHY NO MIGRATION:                                                         │
│   • JSONB columns accept any valid JSON at any path                         │
│   • No ALTER TABLE needed                                                   │
│   • No new columns                                                          │
│   • No new tables                                                           │
│   • Just UPDATE with jsonb_set()                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verification Queries (Optional - Run in Supabase SQL Editor)

```sql
-- Verify families.settings column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'families'
  AND column_name = 'settings';

-- Check current structure for a family
SELECT id, name, settings
FROM public.families
LIMIT 1;
```

### API Pattern for Setting Rotation

```sql
-- How the /api/rotation/apply endpoint will update the config
UPDATE public.families
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{apps,choregami,rotation}',
  '{
    "active_preset": "smart_rotation",
    "start_date": "2026-01-16",
    "child_slots": [
      {"slot": "Child A", "profile_id": "uuid-1"},
      {"slot": "Child B", "profile_id": "uuid-2"}
    ]
  }'::jsonb
)
WHERE id = 'family-uuid-here';
```

### API Pattern for Clearing Rotation

```sql
-- Remove rotation config entirely
UPDATE public.families
SET settings = settings #- '{apps,choregami,rotation}'
WHERE id = 'family-uuid-here';
```

---

## Implementation Checklist (Simplified)

| Task | Lines Est. | File |
|------|------------|------|
| TypeScript types | ~50 | `lib/types/rotation.ts` |
| Smart rotation preset | ~100 | `lib/data/presets/smart-rotation.ts` |
| Weekend warrior preset | ~80 | `lib/data/presets/weekend-warrior.ts` |
| Daily basics preset | ~60 | `lib/data/presets/daily-basics.ts` |
| Preset registry + helpers | ~80 | `lib/data/rotation-presets.ts` |
| Rotation service | ~80 | `lib/services/rotation-service.ts` |
| API: apply preset | ~40 | `routes/api/rotation/apply.ts` |
| FamilySettings addition | ~150 | `islands/FamilySettings.tsx` (modify existing) |
| **Total** | **~640** | 7 files (1 modified, 6 new) |

### What We're NOT Building

```
❌ routes/api/rotation/presets.ts    - Presets are static, no API needed
❌ islands/templates/TemplateGallery.tsx  - Inline in FamilySettings
❌ islands/templates/TemplateCard.tsx     - Inline in FamilySettings
❌ islands/templates/ChildMappingModal.tsx - Inline in FamilySettings
❌ Database table for templates            - Static TypeScript sufficient
```

All files under 150 lines. Total well under 500 line limit per module.

---

## References

- [UI/UX Mockups](./chore-templates-design.md)
- [Existing JSONB Settings](./jsonb-settings-architecture.md)
- [SQL Migration](../sql/20260114_jsonb_settings.sql)
