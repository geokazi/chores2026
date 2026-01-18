# Large Family Template & Partial Assignment

**Document Created**: January 17, 2026
**Status**: ✅ Complete
**Superseded By**: [Dynamic Template Expansion](./20260117_dynamic_template_expansion.md) - For families wanting automatic scaling without fixed slots
**Related**:
- [Dynamic Template Expansion](./20260117_dynamic_template_expansion.md) - Distribution-based alternative (recommended for 5+ kids)
- [Seasonal Templates Implementation](./20260116_seasonal-templates-implementation.md)
- [Chore Templates Design](../chore-templates-design.md)
- [JSONB Schema Design](./20260115_chore-templates-jsonb-schema.md)

## Summary

This milestone addresses families with more than 2 children by:
1. Fixing incorrect `max_children` values in all existing templates
2. Creating a new "Large Family Rotation" template supporting 3-8 kids
3. Adding UI clarity when families have more kids than template slots
4. Enabling partial slot assignment (parents choose which kids participate)

## Problem Statement

### Discovery

Analysis revealed a critical mismatch between template `max_children` claims and actual slot definitions:

| Template | Claimed max_children | Actual Slots | Gap |
|----------|---------------------|--------------|-----|
| Smart Rotation | 4 | 2 (Child A, B) | -2 |
| Weekend Warrior | 6 | 2 (Child A, B) | -4 |
| Daily Basics | 3 | 2 (Child A, B) | -1 |
| Summer Break | 4 | 2 (Child A, B) | -2 |
| School Year | 4 | 2 (Child A, B) | -2 |

**Impact**: Families selecting templates based on `max_children` would have unmapped kids receiving no rotation chores, with no explanation in the UI.

### User Need

Families with 3+ kids had no template options:
- 3 kids: Only templates claiming support had 2 slots
- 5-8 kids: No templates available at all
- Kids beyond slot count: Silently received no rotation chores

---

## Solution

### 1. Fix Existing Templates

All 5 existing templates now have accurate `max_children: 2` to match their 2 slots:

```typescript
// All templates now have honest limits
export const SMART_ROTATION_PRESET: RotationPreset = {
  min_children: 2,
  max_children: 2,  // Only 2 slots defined (Child A, B)
  // ...
};
```

### 2. New Large Family Template

Created `lib/data/presets/large-family.ts` with 4 slots supporting 3-8 kids:

```
┌─────────────────────────────────────────────────────────────────┐
│               LARGE FAMILY ROTATION                              │
│               👨‍👩‍👧‍👦 For 3-8 Kids                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  4 Slots: Child A, Child B, Child C, Child D                    │
│                                                                 │
│  Schedule Philosophy:                                           │
│  - Daily basics (make bed, tidy room) for everyone              │
│  - Rotating kitchen duty (set/clear table, dishwasher, wipe)    │
│  - Rotating house chores (vacuum, trash, laundry, sweep)        │
│  - Care tasks (pet, plants) distributed fairly                  │
│                                                                 │
│  Week Distribution Example:                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │      Mon   Tue   Wed   Thu   Fri   Sat   Sun           │    │
│  │ A:   🍽️   🧹    ✨    🗑️   🍽️   👕    🐕              │    │
│  │ B:   🧹   🍽️    🧹    ✨    🗑️   🍽️   👕              │    │
│  │ C:   👕   🗑️    🍽️   🧹    ✨    🧹    🍽️              │    │
│  │ D:   ✨   👕    🗑️   🍽️   🧹    🧹    🗑️              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Legend: 🍽️=Kitchen  🧹=House  ✨=Quick  🗑️=Trash  👕=Laundry   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Chores Included (12 total)**:
- **Daily**: Make bed, Tidy room
- **Kitchen**: Set table, Clear table, Load dishwasher, Wipe counters
- **House**: Vacuum one room, Take out trash, Fold laundry, Sweep floor
- **Care**: Feed pet, Water plants

### 3. UI Clarity for Partial Assignment

When a family has more kids than template slots, the UI now clearly explains:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Set Up Large Family Rotation                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Assign Kids to Slots                                            │
│ This template has 4 slots. You have 6 kids - select which 4     │
│ will use this rotation.                                         │
│                                                                 │
│ Child A: [Julia        ▼]                                       │
│ Child B: [Ciku         ▼]                                       │
│ Child C: [Marcus       ▼]                                       │
│ Child D: [Elena        ▼]                                       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐     │
│ │ ⚠️ Manual chores only: Alex, Sam                         │     │
│ │ These kids won't get rotation chores. You can assign    │     │
│ │ them chores manually from the dashboard.                │     │
│ └─────────────────────────────────────────────────────────┘     │
│                                                                 │
│              [Activate Template]  [Cancel]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Partial Slot Assignment

Parents can now:
- Leave slots empty by selecting "(Not assigned)"
- Choose which subset of kids participate in rotation
- Mix rotation chores with manual assignments for specific kids

**Validation Changes**:
```typescript
// Before: Required all slots filled
if (mappings.some(m => !m.profile_id)) {
  alert("Please assign a child to each slot");
  return;
}

// After: Only require at least one slot
const mappings = slots
  .filter(slot => childSlots[slot])  // Only filled slots
  .map(slot => ({ slot, profile_id: childSlots[slot] }));

if (mappings.length === 0) {
  alert("Please assign at least one child to a slot");
  return;
}
```

---

## Files Changed

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `lib/data/presets/smart-rotation.ts` | EDIT | 1 | max_children: 4 → 2 |
| `lib/data/presets/weekend-warrior.ts` | EDIT | 1 | max_children: 6 → 2 |
| `lib/data/presets/daily-basics.ts` | EDIT | 1 | max_children: 3 → 2 |
| `lib/data/presets/summer-break.ts` | EDIT | 1 | max_children: 4 → 2 |
| `lib/data/presets/school-year.ts` | EDIT | 1 | max_children: 4 → 2 |
| `lib/data/presets/large-family.ts` | **NEW** | 91 | Large Family template |
| `lib/data/rotation-presets.ts` | EDIT | 4 | Register Large Family |
| `lib/data/rotation-presets_test.ts` | EDIT | 45 | Update tests for 6 presets |
| `islands/FamilySettings.tsx` | EDIT | 55 | UI clarity + partial assignment |

**Total**: ~200 lines changed/added

---

## Template Coverage After Changes

| Kids | Available Templates | Notes |
|------|---------------------|-------|
| 1 | None | Manual mode only |
| 2 | 5 templates | Smart Rotation, Weekend Warrior, Daily Basics, Summer Break, School Year |
| 3-8 | 1 template | Large Family Rotation |
| 9+ | None | Manual mode only |

**Before vs After**:
```
BEFORE (incorrect max_children):
┌─────────────────────────────────────────────────────────────────┐
│ Kids │ Templates Shown (Broken) │ Actual Slots Available        │
├──────┼──────────────────────────┼──────────────────────────────┤
│   2  │ 5 templates              │ 2 slots ✓                    │
│   3  │ 4 templates (claim 3-4)  │ 2 slots ✗ (1 kid ignored)    │
│   4  │ 4 templates (claim 4)    │ 2 slots ✗ (2 kids ignored)   │
│   5  │ 1 template (claim 6)     │ 2 slots ✗ (3 kids ignored)   │
│   6  │ 1 template (claim 6)     │ 2 slots ✗ (4 kids ignored)   │
│  7+  │ None                     │ Manual only                  │
└─────────────────────────────────────────────────────────────────┘

AFTER (accurate + Large Family):
┌─────────────────────────────────────────────────────────────────┐
│ Kids │ Templates Available      │ Slots │ Unmapped Kids        │
├──────┼──────────────────────────┼───────┼──────────────────────┤
│   2  │ 5 templates              │ 2     │ None                 │
│   3  │ Large Family             │ 4     │ None                 │
│   4  │ Large Family             │ 4     │ None                 │
│   5  │ Large Family             │ 4     │ 1 (clearly shown)    │
│   6  │ Large Family             │ 4     │ 2 (clearly shown)    │
│   7  │ Large Family             │ 4     │ 3 (clearly shown)    │
│   8  │ Large Family             │ 4     │ 4 (clearly shown)    │
│  9+  │ None                     │ -     │ All (Manual only)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tests

All 12 tests pass after updates:

```bash
$ deno test lib/data/rotation-presets_test.ts
running 12 tests from ./lib/data/rotation-presets_test.ts
ROTATION_PRESETS - contains all 6 presets ... ok
getPresetByKey - returns correct preset ... ok
getPresetByKey - returns undefined for unknown key ... ok
getPresetsForFamily - filters by child count ... ok
getPresetSlots - returns slot names ... ok
getCurrentWeekType - returns single week type for daily preset ... ok
getCurrentWeekType - alternates for biweekly preset ... ok
getDayOfWeek - returns correct day ... ok
all presets have valid structure ... ok
getPresetsByCategory - groups presets correctly ... ok
getPresetsByCategory - respects child count filter ... ok
large_family preset - supports 3-8 kids with 4 slots ... ok

ok | 12 passed | 0 failed
```

**New Test Added**:
```typescript
Deno.test("large_family preset - supports 3-8 kids with 4 slots", () => {
  const preset = getPresetByKey("large_family");
  assertExists(preset);
  assertEquals(preset?.min_children, 3);
  assertEquals(preset?.max_children, 8);

  const slots = getPresetSlots(preset!);
  assertEquals(slots.length, 4);
  assertEquals(slots.includes("Child A"), true);
  assertEquals(slots.includes("Child B"), true);
  assertEquals(slots.includes("Child C"), true);
  assertEquals(slots.includes("Child D"), true);
});
```

---

## UI Changes

### FamilySettings Template Selection

Templates now grouped correctly with Large Family in Everyday:

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
│ ○ 🎯 Smart Family Rotation       (2 kids)                  │
│ ○ ⚡ Weekend Warrior              (2 kids)                  │
│ ○ 🌱 Daily Basics                 (2 kids)                  │
│ ○ 👨‍👩‍👧‍👦 Large Family Rotation      (3-8 kids)               │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│ Seasonal                                                   │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ○ ☀️ Summer Break                 (2 kids)                  │
│ ○ 📚 School Year                  (2 kids)                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### New CSS Added

```css
.slot-hint {
  font-size: 0.85rem;
  color: var(--color-text-light);
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.unassigned-notice {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
}

.unassigned-notice p {
  margin: 0;
  font-size: 0.85rem;
  color: #92400e;
}

.unassigned-hint {
  margin-top: 0.25rem !important;
  font-size: 0.75rem !important;
  color: #b45309 !important;
}
```

---

## Backwards Compatibility

- ✅ Existing families with active templates: **Unaffected** (configurations preserved)
- ✅ API endpoints: **No changes** to `/api/rotation/apply`
- ✅ JSONB schema: **No changes** to `rotation` config structure
- ✅ Database: **No migrations required**

---

## Future Considerations

### Now Available: Dynamic Templates

The limitations of the slot-based approach have been addressed by [Dynamic Template Expansion](./20260117_dynamic_template_expansion.md):

| Problem | Slot-Based Solution | Dynamic Solution |
|---------|-------------------|------------------|
| 5+ kids with 4 slots | Partial assignment (some kids excluded) | All kids automatically included |
| 1-2 kids | Can't use Large Family template | Works with any family size |
| Fairness concern | Manual slot selection | Automatic round-robin rotation |

**Recommendation**: For families with 1, 3, or 5+ kids, use "Daily Routines (Any Size)" instead.

### Remaining Slot-Based Use Cases

1. **Hand-crafted schedules**: When parents want specific kids on specific days
2. **Team rotation**: Child A & C do Monday chores, Child B & D do Tuesday
3. **Age-based grouping**: Older kids in slots with harder chores

### Not Implemented (Intentionally)

| Feature | Reason |
|---------|--------|
| Templates for 9+ kids | Diminishing returns; very rare family size |
| Slot sharing (2 kids per slot) | Dynamic templates solve this better |

---

## Cross-References

- **Dynamic Templates**: [20260117_dynamic_template_expansion.md](./20260117_dynamic_template_expansion.md) - Distribution-based scaling (recommended alternative)
- **Seasonal Templates**: [20260116_seasonal-templates-implementation.md](./20260116_seasonal-templates-implementation.md) - Category grouping pattern reused
- **Template Design**: [chore-templates-design.md](../chore-templates-design.md) - Core template architecture
- **JSONB Schema**: [20260115_chore-templates-jsonb-schema.md](./20260115_chore-templates-jsonb-schema.md) - Override Layer Pattern
- **Kid Management**: [20260117_kid_management.md](./20260117_kid_management.md) - Max 8 kids per family limit

---

*Implementation follows 20/80 Pareto principle: Simple 4-slot solution covers 3-8 kids with minimal complexity.*
