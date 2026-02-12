# Weekly Grid: Multi-Source Chore Display

**Date**: February 11, 2026
**Status**: Resolved
**Criticality**: MEDIUM - Affects parent visibility into kid chore schedules

## Executive Summary

The Weekly Grid (`/parent/grid/weekly`) displays chores from **three distinct sources**, merged together for a unified view. This document explains how each source works, completion tracking, and debugging steps.

---

## The Three Chore Sources

| Source | Storage | Scheduling | Example |
|--------|---------|------------|---------|
| **Rotation** | `families.settings` JSONB | Preset-based algorithm | "Dishes" from Weekday Fairness preset |
| **Recurring** | `chore_templates` table | Day-of-week pattern | "Make Bed" every Mon/Wed/Fri |
| **Manual** | `chore_assignments` table | One-time due date | "Clean Room" due Feb 15 |

---

## Source 1: Rotation Chores

### How It Works

Rotation chores come from preset templates stored in family settings. The rotation algorithm distributes chores fairly among children.

**Data Flow:**
```
families.settings.apps.choregami.rotation
  → getRotationConfig()
  → getChoresForChild(config, childId, date, familyCustomChores)
  → Array of chores for that kid on that date
```

**Key Files:**
- `lib/services/rotation-service.ts` - Core rotation logic
- `lib/data/rotation-presets.ts` - Preset definitions
- `lib/services/grid-service.ts` - Grid composition

**Settings Structure:**
```json
{
  "apps": {
    "choregami": {
      "rotation": {
        "active_preset": "weekday_fairness",
        "child_slots": {
          "A": "kid-uuid-1",
          "B": "kid-uuid-2"
        },
        "start_date": "2026-01-01"
      }
    }
  }
}
```

### Completion Tracking

Rotation chores are tracked via `chore_transactions` with specific metadata:

```typescript
// Recording (routes/api/rotation/complete.ts):
metadata: {
  rotation_preset: "weekday_fairness",
  rotation_chore: "dishes",        // chore.key from preset
  rotation_date: "2026-02-11"      // YYYY-MM-DD
}

// Lookup (grid-service.ts):
completedKey = `${profileId}:rotation:${meta.rotation_chore}:${meta.rotation_date}`
```

**Critical**: The `rotation_chore` key must match exactly between recording and lookup.

---

## Source 2: Recurring Chores

### How It Works

Recurring chores are templates with `is_recurring: true` and `recurring_days` array.

**Data Flow:**
```
chore_templates WHERE is_recurring = true
  → Filter by assigned_to_profile_id
  → Filter by recurring_days matching today's day
  → Array of templates due today
```

**Query Pattern:**
```typescript
const { data: templates } = await supabase
  .schema("choretracker")
  .from("chore_templates")
  .select("id, name, points, recurring_days, icon, assigned_to_profile_id")
  .eq("family_id", familyId)
  .eq("is_recurring", true)
  .eq("is_active", true)
  .or("is_deleted.is.null,is_deleted.eq.false");
```

**Day Mapping:**
```typescript
const dayNameToNum = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
// recurring_days: ["mon", "wed", "fri"] → Due on days 1, 3, 5
```

### Completion Tracking

```typescript
// Recording (routes/api/recurring/complete.ts):
metadata: {
  recurring_template_id: "template-uuid",
  recurring_date: "2026-02-11"
}

// Lookup (grid-service.ts):
completedKey = `${profileId}:recurring:${meta.recurring_template_id}:${meta.recurring_date}`
```

---

## Source 3: Manual (One-Time) Chores

### How It Works

Manual chores are individual assignments with a specific due date.

**Data Flow:**
```
chore_assignments WHERE status = 'pending' OR status = 'completed'
  → Filter by assigned_to_profile_id
  → Filter by due_date matching target date
  → Include chore_template for name/icon
```

**Query Pattern:**
```typescript
const { data: assignments } = await supabase
  .schema("choretracker")
  .from("chore_assignments")
  .select(`
    id, status, point_value, due_date,
    chore_template:chore_template_id (id, name, icon)
  `)
  .eq("family_id", familyId)
  .in("status", ["pending", "completed"]);
```

### Completion Tracking

Manual chores use the assignment's `status` field directly:
- `status: "pending"` → Not completed
- `status: "completed"` → Done

No transaction metadata lookup needed - status is authoritative.

---

## Grid Service: Merging All Sources

### Key Function: `getWeekAssignments()`

Location: `lib/services/grid-service.ts`

```typescript
export async function getWeekAssignments(
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<WeekAssignment[]>
```

### Merge Order

1. **Rotation chores** - From family settings via `getChoresForChild()`
2. **Recurring chores** - From `chore_templates` filtered by day
3. **Manual chores** - From `chore_assignments` filtered by due_date

All sources are combined into a single array per kid per day.

### Diagnostic Logging

Added in Feb 11, 2026 fix:

```typescript
console.log(`📊 Grid: Family settings check`, {
  familyId,
  hasSettings: !!family?.settings,
  hasRotation: !!rotationConfig,
  rotationPreset: rotationConfig?.active_preset || null,
  customChoresCount: familyCustomChores.length,
});
```

---

## Troubleshooting Checklist

When the Weekly Grid shows "—" instead of chores:

### 1. Check Rotation Config
- [ ] Does `families.settings.apps.choregami.rotation` exist?
- [ ] Is `active_preset` set?
- [ ] Are `child_slots` mapped to actual profile IDs?
- [ ] Look for `📊 Grid: Family settings check` in server logs

### 2. Check Recurring Templates
- [ ] Are there templates with `is_recurring: true`?
- [ ] Is `assigned_to_profile_id` set for each?
- [ ] Does `recurring_days` include today's day abbreviation?
- [ ] Is `is_deleted` NULL or false?
- [ ] Is `is_active` true?

### 3. Check Manual Assignments
- [ ] Are there assignments with `status: 'pending'`?
- [ ] Does `due_date` match the grid date?
- [ ] Is `assigned_to_profile_id` correct?

### 4. Check Completion Tracking
- [ ] Do transaction metadata keys match lookup keys?
- [ ] Rotation: `rotation_chore` + `rotation_date`
- [ ] Recurring: `recurring_template_id` + `recurring_date`

### 5. Check is_deleted Filter
- [ ] Using `.or("is_deleted.is.null,is_deleted.eq.false")`?
- [ ] NOT using `.eq("is_deleted", false)` (misses NULL values)

---

## Common Issues & Fixes

### Issue: Rotation chores not appearing

**Cause**: `familyCustomChores` not passed to `getChoresForChild()`

**Fix** (Feb 11, 2026):
```typescript
const familyCustomChores = getFamilyCustomChores(family?.settings || {});
const chores = getChoresForChild(rotationConfig, childId, dateObj, familyCustomChores);
```

### Issue: Recurring chores filtered out incorrectly

**Cause**: Using `.eq("is_deleted", false)` instead of OR filter

**Fix**:
```typescript
// WRONG - misses NULL values
.eq("is_deleted", false)

// CORRECT - handles NULL and false
.or("is_deleted.is.null,is_deleted.eq.false")
```

### Issue: Completed chores still showing as pending

**Cause**: Metadata key mismatch between recording and lookup

**Fix**: Ensure exact key names match:
- Recording: `{ rotation_chore: key, rotation_date: date }`
- Lookup: Must use same property names

---

## Related Files

| File | Purpose |
|------|---------|
| `lib/services/grid-service.ts` | Weekly Grid data composition |
| `lib/services/rotation-service.ts` | Rotation algorithm + config getters |
| `lib/data/rotation-presets.ts` | Preset definitions |
| `routes/api/rotation/complete.ts` | Rotation completion endpoint |
| `routes/api/recurring/complete.ts` | Recurring completion endpoint |
| `routes/api/kids/chores.ts` | Kid dashboard chore fetching |
| `islands/WeeklyGrid.tsx` | Grid UI component |

---

## Related Documentation

- [Points Consistency: Single Source of Truth](./20260131_points_consistency_single_source_of_truth.md)
- [Collaborative Family Goals & Bonus System](../milestones/20260114_collaborative_family_goals_bonus_system.md)
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md)

---

*Created: February 11, 2026*
*Purpose: Document Weekly Grid multi-source chore display for future debugging*
