# Dynamic Template Expansion via Chore-Type Tagging

**Document Created**: January 17, 2026
**Status**: ✅ Complete
**Related**:
- [Large Family & Partial Assignment](./20260117_large_family_template_partial_assignment.md) - Previous solution for 3-8 kids
- [Seasonal Templates Implementation](./20260116_seasonal-templates-implementation.md) - Category grouping pattern
- [Chore Templates Design](../chore-templates-design.md) - Core template architecture
- [JSONB Schema Design](./20260115_chore-templates-jsonb-schema.md) - Override Layer Pattern
- [Kid Management](./20260117_kid_management.md) - Max 8 kids per family limit

---

## Summary

This milestone introduces **dynamic template expansion** - templates that automatically scale to any family size (1-8 kids) without fixed slots. Instead of pre-defined "Child A, Child B" schedules, chores are tagged with distribution types that determine how they're assigned at runtime.

**Key Innovation**: Chores now have a `distribution` property:
- `'all'` - Everyone does this chore daily (e.g., make bed, brush teeth)
- `'rotate'` - Round-robin through all participants (e.g., set table, dishes)

---

## Problem Statement

### Previous Approach: Fixed Slots

The [Large Family Template](./20260117_large_family_template_partial_assignment.md) solved the 3+ kids problem with 4 fixed slots. However:

| Family Size | Large Family Template | Limitation |
|-------------|----------------------|------------|
| 1-2 kids | Not applicable (min 3) | Can't use this template |
| 3-4 kids | Works perfectly | None |
| 5-8 kids | 4 slots available | 1-4 kids get "manual only" |

**User Pain Point**: A family of 5 kids selecting the 4-slot template still has 1 child excluded from the rotation - visible but awkward UX.

### The Insight

Examining the "Daily Basics" template revealed that chores have **different distribution semantics**:

```
Child A: make_bed, brush_teeth_am, clear_table, brush_teeth_pm, tidy_toys
Child B: get_dressed, brush_teeth_am, pajamas, brush_teeth_pm, tidy_toys
```

Notice:
- `brush_teeth_am` appears in BOTH slots - everyone should do this
- `clear_table` appears in only ONE slot - one person does this, should rotate

**With distribution tagging**, any family size works naturally.

---

## Solution: Distribution-Tagged Chores

### 1. New Type System

**File**: `lib/types/rotation.ts`

```typescript
// Distribution type for dynamic templates
export type ChoreDistribution = 'all' | 'rotate';

export interface PresetChore {
  key: string;
  name: string;
  points: number;
  minutes: number;
  category: string;
  icon: string;
  distribution?: ChoreDistribution;  // NEW: undefined = slot-based (legacy)
}

export interface RotationPreset {
  // ... existing fields ...
  is_dynamic?: boolean;  // NEW: True = uses distribution tags, no fixed slots
}
```

### 2. Dynamic Schedule Generator

**File**: `lib/services/rotation-service.ts`

```typescript
/**
 * Generate chores for a child in a dynamic (non-slot) template
 */
export function getDynamicChoresForChild(
  preset: RotationPreset,
  participantIds: string[],
  childProfileId: string,
  date: Date
): PresetChore[] {
  const childIndex = participantIds.indexOf(childProfileId);
  if (childIndex === -1) return [];

  const dayOfYear = getDayOfYear(date);
  const numKids = participantIds.length;
  const rotatingChores = preset.chores.filter(c => c.distribution === 'rotate');

  return preset.chores.filter(chore => {
    if (chore.distribution === 'all') {
      return true;  // Everyone does this
    }
    if (chore.distribution === 'rotate') {
      const choreIndex = rotatingChores.indexOf(chore);
      const assignedKidIndex = (dayOfYear + choreIndex) % numKids;
      return assignedKidIndex === childIndex;
    }
    return false;
  });
}
```

### 3. "Daily Routines (Any Size)" Template

**File**: `lib/data/presets/dynamic-daily.ts`

```typescript
export const DYNAMIC_DAILY_PRESET: RotationPreset = {
  key: 'dynamic_daily',
  name: 'Daily Routines (Any Size)',
  description: 'Scales to any family size. Personal chores for all, shared chores rotate automatically.',
  icon: '🔄',
  color: '#8b5cf6',
  preset_category: 'everyday',
  min_children: 1,
  max_children: 8,
  is_dynamic: true,
  chores: [
    // Personal - everyone does these daily
    { key: 'make_bed', ..., distribution: 'all' },
    { key: 'brush_teeth_am', ..., distribution: 'all' },
    { key: 'brush_teeth_pm', ..., distribution: 'all' },
    { key: 'tidy_room', ..., distribution: 'all' },

    // Rotating - one kid per day
    { key: 'set_table', ..., distribution: 'rotate' },
    { key: 'clear_table', ..., distribution: 'rotate' },
    { key: 'load_dishwasher', ..., distribution: 'rotate' },
    { key: 'feed_pet', ..., distribution: 'rotate' },
    { key: 'take_trash', ..., distribution: 'rotate' },
    { key: 'water_plants', ..., distribution: 'rotate' },
  ],
  schedule: {},  // Empty - generated dynamically at runtime
};
```

### 4. Simplified UI for Dynamic Templates

**File**: `islands/FamilySettings.tsx`

Dynamic templates show **checkboxes** instead of slot dropdowns:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Set Up Daily Routines (Any Size)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Select Kids to Include                                          │
│ All selected kids will get personal chores daily.               │
│ Shared chores rotate through them automatically.                │
│                                                                 │
│ [✓] Anna Log                                                    │
│ [✓] Dee Nomi Nator                                              │
│ [✓] Al Jebra                                                    │
│ [✓] Testy McTestface                                            │
│                                                                 │
│ ✓ 4 kids will participate in the rotation                       │
│                                                                 │
│              [Activate Template]  [Cancel]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: 4-Kid Family Distribution

**Template**: Daily Routines (Any Size)
**Kids**: Anna, Marcus, Ciku, Elena (indices 0, 1, 2, 3)
**Day of Year**: 17 (January 17)

### Algorithm

For each `rotate` chore:
```
assignedKidIndex = (dayOfYear + choreIndex) % numKids
                 = (17 + choreIndex) % 4
```

| Chore | choreIndex | (17 + index) % 4 | Assigned To |
|-------|------------|------------------|-------------|
| set_table | 0 | 17 % 4 = 1 | Marcus |
| clear_table | 1 | 18 % 4 = 2 | Ciku |
| load_dishwasher | 2 | 19 % 4 = 3 | Elena |
| feed_pet | 3 | 20 % 4 = 0 | Anna |
| take_trash | 4 | 21 % 4 = 1 | Marcus |
| water_plants | 5 | 22 % 4 = 2 | Ciku |

### Monday (Day 17) Result

```
Anna:   make_bed, brush_am, brush_pm, tidy_room, feed_pet
Marcus: make_bed, brush_am, brush_pm, tidy_room, set_table, take_trash
Ciku:   make_bed, brush_am, brush_pm, tidy_room, clear_table, water_plants
Elena:  make_bed, brush_am, brush_pm, tidy_room, load_dishwasher
```

### Tuesday (Day 18) - Rotation Shifts

```
Anna:   make_bed, brush_am, brush_pm, tidy_room, water_plants (was Ciku's)
Marcus: make_bed, brush_am, brush_pm, tidy_room, feed_pet (was Anna's)
Ciku:   make_bed, brush_am, brush_pm, tidy_room, set_table, take_trash (was Marcus's)
Elena:  make_bed, brush_am, brush_pm, tidy_room, clear_table (was Ciku's)
```

---

## Files Changed

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `lib/types/rotation.ts` | EDIT | +5 | Added `ChoreDistribution` type, `distribution` field, `is_dynamic` flag |
| `lib/services/rotation-service.ts` | EDIT | +45 | Added `getDayOfYear()`, `getDynamicChoresForChild()`, updated `getChoresForChild()` |
| `lib/data/presets/dynamic-daily.ts` | **NEW** | 55 | Dynamic Daily Routines template |
| `lib/data/rotation-presets.ts` | EDIT | +4 | Registered `DYNAMIC_DAILY_PRESET` |
| `lib/data/rotation-presets_test.ts` | EDIT | +20 | Updated tests for 7 presets + dynamic template test |
| `lib/services/rotation-service_test.ts` | **NEW** | 65 | Tests for dynamic chore generation |
| `islands/FamilySettings.tsx` | EDIT | +60 | Checkbox UI + CSS for dynamic templates |

**Total**: ~170 lines added

---

## Template Coverage After Changes

| Kids | Slot-Based Templates | Dynamic Templates | Best Choice |
|------|---------------------|-------------------|-------------|
| 1 | None | Daily Routines (Any Size) | **Dynamic** |
| 2 | 5 templates | Daily Routines (Any Size) | Either |
| 3 | Large Family (4 slots) | Daily Routines (Any Size) | **Dynamic** |
| 4 | Large Family (4 slots) | Daily Routines (Any Size) | Either |
| 5-8 | Large Family (4 slots, partial) | Daily Routines (Any Size) | **Dynamic** |

**Recommendation**: For families with 1, 3, or 5+ kids, the dynamic template provides the best experience with no unmapped children.

---

## Tests

**17 tests total** (13 preset tests + 4 rotation service tests):

```bash
$ deno test lib/data/rotation-presets_test.ts lib/services/rotation-service_test.ts

running 13 tests from ./lib/data/rotation-presets_test.ts
ROTATION_PRESETS - contains all 7 presets ... ok
getPresetByKey - returns correct preset ... ok
...
dynamic_daily preset - supports 1-8 kids with distribution tags ... ok

running 4 tests from ./lib/services/rotation-service_test.ts
getDayOfYear - returns correct day number ... ok
getDynamicChoresForChild - distributes chores correctly ... ok
getDynamicChoresForChild - rotation shifts daily ... ok
getDynamicChoresForChild - returns empty for non-participant ... ok

ok | 17 passed | 0 failed
```

---

## Backward Compatibility

- ✅ **Slot-based templates**: Unchanged (no `is_dynamic` flag = use slots)
- ✅ **Existing family configs**: Unchanged (`child_slots` structure reused)
- ✅ **API endpoints**: No changes to `/api/rotation/apply`
- ✅ **JSONB schema**: Dynamic templates use same `rotation` config structure
- ✅ **Database**: No migrations required

---

## UI Changes

### Template Selection

Dynamic template appears first in Everyday category:

```
┌────────────────────────────────────────────────────────────┐
│ Chore Assignment Mode                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ● Manual (Default)                                         │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│ Everyday Routines                                          │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ○ 🔄 Daily Routines (Any Size)     (1-8 kids) ⭐ NEW       │
│ ○ 🎯 Smart Family Rotation         (2 kids)               │
│ ○ ⚡ Weekend Warrior                (2 kids)               │
│ ○ 🌱 Daily Basics                   (2 kids)               │
│ ○ 👨‍👩‍👧‍👦 Large Family Rotation        (3-8 kids)             │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│ Seasonal                                                   │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ○ ☀️ Summer Break                   (2 kids)               │
│ ○ 📚 School Year                    (2 kids)               │
└────────────────────────────────────────────────────────────┘
```

### New CSS Classes

```css
.dynamic-kid-list { display: flex; flex-direction: column; gap: 0.5rem; }
.dynamic-kid-checkbox { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; ... }
.dynamic-summary { background: #dcfce7; color: #166534; ... }
```

---

## Comparison: Slot-Based vs Dynamic

| Aspect | Slot-Based | Dynamic |
|--------|-----------|---------|
| **Schedule** | Pre-defined per slot per day | Generated at runtime |
| **Family Size** | Limited by slot count | Works for 1-8 kids |
| **Chore Fairness** | Hand-crafted balance | Algorithmic (round-robin) |
| **UI** | Dropdown per slot | Checkbox per kid |
| **Complexity** | Simple lookup | Slightly more complex |
| **Customization** | Per-slot schedule | Per-chore distribution type |

**When to use Slot-Based**: When you want hand-crafted weekly variety (e.g., Child A does dishes Mon/Wed/Fri, Child B does Tue/Thu).

**When to use Dynamic**: When you want automatic fairness across any family size.

---

## Future Considerations

### Potential Enhancements

1. **More distribution types**: `'weekday_only'`, `'weekend_only'`, `'age_appropriate'`
2. **Convert existing templates**: Tag chores in Smart Rotation, Daily Basics for hybrid mode
3. **Custom rotation frequency**: Weekly instead of daily rotation
4. **Distribution visualization**: Show rotation calendar preview before activation

### Not Implemented (Intentionally)

| Feature | Reason |
|---------|--------|
| Auto-convert all templates to dynamic | Preserves hand-crafted schedules |
| Complex rotation algorithms | Simple round-robin is fair and predictable |
| Per-chore rotation frequency | Adds complexity; daily rotation is clear |

---

## Cross-References

- **Large Family Template**: [20260117_large_family_template_partial_assignment.md](./20260117_large_family_template_partial_assignment.md) - Slot-based alternative for 3-8 kids
- **Seasonal Templates**: [20260116_seasonal-templates-implementation.md](./20260116_seasonal-templates-implementation.md) - Category grouping pattern
- **Template Design**: [chore-templates-design.md](../chore-templates-design.md) - Core template architecture
- **JSONB Schema**: [20260115_chore-templates-jsonb-schema.md](./20260115_chore-templates-jsonb-schema.md) - Override Layer Pattern
- **Kid Management**: [20260117_kid_management.md](./20260117_kid_management.md) - Max 8 kids per family limit

---

*Implementation follows 20/80 Pareto principle: Simple distribution tagging enables infinite scalability with ~170 lines of code.*
