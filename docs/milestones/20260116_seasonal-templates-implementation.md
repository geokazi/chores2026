# Seasonal Templates Implementation

**Document Created**: January 16, 2026
**Status**: Complete
**Commit**: `98e712c`

## Summary

Added seasonal rotation templates that complement the existing "everyday" templates. Families can now choose templates optimized for different times of year:

| Category | Templates | Use Case |
|----------|-----------|----------|
| **Everyday** | Smart Rotation, Weekend Warrior, Daily Basics | Year-round routines |
| **Seasonal** | Summer Break, School Year | Time-of-year specific |

## Design Decisions

### Minimal MVP (Pareto Principle)

Per the project's "20% effort for 80% value" philosophy, we implemented only **2 seasonal templates** that cover the full calendar year:

```
┌─────────────────────────────────────────────────────────────────┐
│                    YEAR-ROUND COVERAGE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☀️ Summer Break         📚 School Year                         │
│  ══════════════          ═════════════                          │
│  June - August           September - May                        │
│                                                                 │
│  Outdoor-focused         Homework-respecting                    │
│  More chores             Lighter weekdays                       │
│  Kids have time          Weekend catch-up                       │
│                                                                 │
│  ❌ NOT IMPLEMENTED (diminishing returns):                      │
│  - Holiday Season (just disable chores manually)                │
│  - Spring Cleaning (use Summer Break)                           │
│  - Winter Break (use Summer Break)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Category Field for UI Grouping

Added `preset_category` field to group templates in the UI without changing the data model:

```typescript
export interface RotationPreset {
  // ... existing fields
  preset_category: 'everyday' | 'seasonal';  // UI grouping
  // ... rest of fields
}
```

**Why a field instead of separate arrays?**
- Single source of truth (`ROTATION_PRESETS` array)
- Existing `getPresetsForFamily()` filter still works
- Easy to add more categories later (e.g., 'advanced')

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `lib/types/rotation.ts` | Added `preset_category` field | +1 |
| `lib/data/presets/summer-break.ts` | **NEW** - Summer Break template | +72 |
| `lib/data/presets/school-year.ts` | **NEW** - School Year template | +71 |
| `lib/data/presets/smart-rotation.ts` | Added `preset_category: 'everyday'` | +1 |
| `lib/data/presets/weekend-warrior.ts` | Added `preset_category: 'everyday'` | +1 |
| `lib/data/presets/daily-basics.ts` | Added `preset_category: 'everyday'` | +1 |
| `lib/data/rotation-presets.ts` | Added imports + `getPresetsByCategory()` | +17 |
| `islands/FamilySettings.tsx` | UI grouping with category headers | ~70 |
| `lib/data/rotation-presets_test.ts` | Tests for 5 presets + category helper | +30 |

**Total**: ~275 lines added/modified across 9 files

---

## New Templates

### Summer Break

**File**: `lib/data/presets/summer-break.ts`

```typescript
export const SUMMER_BREAK_PRESET: RotationPreset = {
  key: 'summer_break',
  name: 'Summer Break',
  description: 'More chores with outdoor focus. Perfect for when kids have extra time.',
  icon: '☀️',
  color: '#eab308',
  preset_category: 'seasonal',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 4,
  min_age: 6,
  cycle_type: 'weekly',
  week_types: ['standard'],
  // ...
};
```

**Chores included** (13 total):
- **Morning**: Make bed, Breakfast dishes
- **Outdoor**: Water garden, Help mow lawn, Wash car, Pull weeds, Sweep patio
- **Indoor**: Vacuum room, Fold laundry, Clean room
- **Evening**: Help with dinner, Clear table, Feed pet

**Schedule philosophy**: Heavier chore load with outdoor focus (yard work, gardening, car washing). Kids have more time in summer.

---

### School Year

**File**: `lib/data/presets/school-year.ts`

```typescript
export const SCHOOL_YEAR_PRESET: RotationPreset = {
  key: 'school_year',
  name: 'School Year',
  description: 'Light weekday chores that respect homework time. More on weekends.',
  icon: '📚',
  color: '#8b5cf6',
  preset_category: 'seasonal',
  difficulty: 'beginner',
  min_children: 2,
  max_children: 4,
  min_age: 6,
  cycle_type: 'weekly',
  week_types: ['standard'],
  // ...
};
```

**Chores included** (12 total):
- **Morning**: Make bed, Pack lunch
- **After School**: Unpack school bag, Clean up snack
- **Evening**: Set table, Clear table, Feed pet, Quick tidy room
- **Weekend**: Vacuum room, Fold laundry, Clean bathroom, Help with groceries

**Schedule philosophy**: Light weekday chores (respects homework time). Substantial weekend chores when kids have more time.

---

## UI Grouping

### FamilySettings Template Selection

Templates are now grouped with category headers:

```
┌────────────────────────────────────────────────────────────┐
│ Chore Assignment Mode                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ● Manual (Default)                                         │
│   You create and assign chores yourself                    │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│ Everyday Routines                                          │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ○ 🎯 Smart Family Rotation                                 │
│ ○ ⚡ Weekend Warrior                                        │
│ ○ 🌱 Daily Basics                                          │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│ Seasonal                                                   │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ○ ☀️ Summer Break                                          │
│ ○ 📚 School Year                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// islands/FamilySettings.tsx
import { getPresetsByCategory } from "../lib/data/rotation-presets.ts";

// In render:
const { everyday, seasonal } = getPresetsByCategory(children.length);

{everyday.length > 0 && (
  <>
    <div class="preset-category-header">Everyday Routines</div>
    {everyday.map(renderPreset)}
  </>
)}
{seasonal.length > 0 && (
  <>
    <div class="preset-category-header">Seasonal</div>
    {seasonal.map(renderPreset)}
  </>
)}
```

---

## New Helper Function

### `getPresetsByCategory(childCount: number)`

**File**: `lib/data/rotation-presets.ts`

```typescript
export function getPresetsByCategory(childCount: number): {
  everyday: RotationPreset[];
  seasonal: RotationPreset[];
} {
  const suitable = getPresetsForFamily(childCount);
  return {
    everyday: suitable.filter(p => p.preset_category === 'everyday'),
    seasonal: suitable.filter(p => p.preset_category === 'seasonal'),
  };
}
```

**Behavior**:
- First filters by child count (respects `min_children`/`max_children`)
- Then groups by `preset_category`
- Returns empty arrays for categories with no suitable presets

**Example**:
```typescript
// Family with 2 kids:
getPresetsByCategory(2)
// → { everyday: [smart, weekend, daily], seasonal: [summer, school] }

// Family with 5 kids:
getPresetsByCategory(5)
// → { everyday: [weekend], seasonal: [] }  // Only weekend_warrior supports 5+ kids
```

---

## Tests Added

**File**: `lib/data/rotation-presets_test.ts`

```typescript
Deno.test("ROTATION_PRESETS - contains all 5 presets", () => {
  assertEquals(ROTATION_PRESETS.length, 5);
  // Everyday presets
  assertEquals(keys.includes("smart_rotation"), true);
  assertEquals(keys.includes("weekend_warrior"), true);
  assertEquals(keys.includes("daily_basics"), true);
  // Seasonal presets
  assertEquals(keys.includes("summer_break"), true);
  assertEquals(keys.includes("school_year"), true);
});

Deno.test("all presets have valid structure", () => {
  for (const preset of ROTATION_PRESETS) {
    assertExists(preset.preset_category);
    assertEquals(['everyday', 'seasonal'].includes(preset.preset_category), true);
  }
});

Deno.test("getPresetsByCategory - groups presets correctly", () => {
  const { everyday, seasonal } = getPresetsByCategory(2);
  assertEquals(everyday.length, 3);
  assertEquals(seasonal.length, 2);
});

Deno.test("getPresetsByCategory - respects child count filter", () => {
  const { everyday, seasonal } = getPresetsByCategory(5);
  assertEquals(everyday.length, 1);  // Only weekend_warrior
  assertEquals(seasonal.length, 0);  // None support 5 kids
});
```

---

## Adding More Seasonal Templates

To add a new seasonal template (e.g., "Holiday Season"):

1. **Create preset file** (`lib/data/presets/holiday-season.ts`):
```typescript
export const HOLIDAY_SEASON_PRESET: RotationPreset = {
  key: 'holiday_season',
  name: 'Holiday Season',
  preset_category: 'seasonal',
  // ... rest of definition
};
```

2. **Register in `rotation-presets.ts`**:
```typescript
import { HOLIDAY_SEASON_PRESET } from "./presets/holiday-season.ts";

export const ROTATION_PRESETS: RotationPreset[] = [
  // Everyday
  SMART_ROTATION_PRESET,
  WEEKEND_WARRIOR_PRESET,
  DAILY_BASICS_PRESET,
  // Seasonal
  SUMMER_BREAK_PRESET,
  SCHOOL_YEAR_PRESET,
  HOLIDAY_SEASON_PRESET,  // NEW
];
```

3. **Update tests**:
```typescript
assertEquals(ROTATION_PRESETS.length, 6);  // Was 5
assertEquals(keys.includes("holiday_season"), true);
```

**No UI changes needed** - the `getPresetsByCategory()` helper automatically includes new templates in the correct group.

---

## Backwards Compatibility

- Existing `getPresetsForFamily()` works unchanged
- Existing `getPresetByKey()` works unchanged
- No database schema changes
- No API changes
- Families with active templates unaffected

---

## Future Considerations

### Not Implemented (by design)

| Template | Reason Not Implemented |
|----------|------------------------|
| Holiday Season | Parents can manually disable chores; low ROI |
| Spring Cleaning | Use Summer Break (similar outdoor focus) |
| Winter Break | Use Summer Break (kids have free time) |
| Back to School | Use School Year (covers transition) |

### Potential Future Categories

If usage data shows demand, could add:
- `'advanced'` - Complex templates for power users
- `'age-specific'` - Templates for specific age ranges

The `preset_category` field supports string values, so new categories can be added without changing the schema.
