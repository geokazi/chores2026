# Weekly Grid Enhancement: Show Individual Chores

**Date**: February 10, 2026
**Status**: ✅ Implemented
**Related**: [Weekly Grid Architecture](./20260209_weekly_grid_template_architecture.md)

---

## Overview

Enhance the Weekly Grid to show individual chore names and point allocations per day, instead of just daily point totals. This provides parents with visibility into exactly which chores are assigned to each kid.

---

## Implementation Summary

### What Was Built

1. **Expandable Rows** (Option A) - Default collapsed, expand button per kid
2. **Mobile Day Tabs** - Single day view with tab navigation on narrow screens
3. **Print Support** - Auto-expands all rows, fixed table layout for proper column widths
4. **Multi-Source Chore Fetching** - Fetches from rotation config, recurring templates, AND manual assignments

### Key Design Decisions

| Question | Decision |
|----------|----------|
| Default expanded or collapsed? | Collapsed by default, "Expand All" button available |
| Show missed/skipped chores? | Yes, shown as "—" |
| Mobile view? | Day tabs/swipe (Option B) |
| Print behavior? | Always expanded with all chores visible |
| Chore styling? | Plain text (no emojis), normal small font |

---

## Architecture: Multi-Source Chore Data

**Critical Discovery**: Chores come from THREE different sources, not just `chore_assignments`:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Weekly Grid Data Sources                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ROTATION CHORES (Dynamic)                                   │
│     Source: families.settings.apps.choregami.rotation           │
│     Generated: getChoresForChild() from rotation-service.ts     │
│     Completion: chore_transactions.metadata.rotation_chore      │
│                                                                  │
│  2. RECURRING CHORES (Template-based)                           │
│     Source: chore_templates WHERE is_recurring=true             │
│     Generated: Match recurring_days to day of week              │
│     Completion: chore_transactions.metadata.recurring_template_id│
│                                                                  │
│  3. MANUAL ONE-TIME CHORES                                      │
│     Source: chore_assignments table                             │
│     Generated: Stored directly in database                      │
│     Completion: chore_assignments.status = 'completed'          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Completion Status Tracking

```typescript
// Rotation chores: Check metadata in chore_transactions
completedSet.has(`${profileId}:rotation:${choreKey}:${dateStr}`)

// Recurring chores: Check metadata in chore_transactions
completedSet.has(`${profileId}:recurring:${templateId}:${dateStr}`)

// Manual chores: Check status in chore_assignments
assignment.status === "completed" || assignment.status === "verified"
```

---

## Data Model

### GridChore Interface
```typescript
interface GridChore {
  id: string;
  name: string;
  icon?: string;  // Not displayed in grid (cleaner look)
  points: number;
  status: "completed" | "pending" | "not_assigned";
}
```

### GridDay Interface
```typescript
interface GridDay {
  date: string;       // YYYY-MM-DD
  dayName: string;    // Sun, Mon, etc.
  points: number;     // Points earned (completed only)
  totalPoints: number; // Total points possible
  complete: boolean;  // All chores done
  chores: GridChore[]; // Individual chores
}
```

### GridKid Interface
```typescript
interface GridKid {
  id: string;
  name: string;
  avatar: string;
  days: GridDay[];
  weeklyTotal: number;
  weeklyPossible: number;
  streak: number;
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/services/grid-service.ts` | Multi-source chore fetching (rotation + recurring + manual) |
| `islands/WeeklyGrid.tsx` | Expandable rows, mobile day tabs, print styles, plain text styling |

---

## UI Features

### Desktop View
- Expandable rows per kid (▶/▼ toggle)
- "Expand All" / "Collapse All" button
- Day summary: completion count (e.g., "2/3") and points (e.g., "4/5")
- Expanded: Individual chores with status and points

### Mobile View
- Day tabs for navigation (WED, THU, FRI, etc.)
- Selected day shows all kids with their chores
- Compact card layout per kid

### Print View
- Auto-expands all rows
- Fixed table layout ensures kid names column is visible
- Smaller fonts to fit on page
- Legend and footer included

---

## Styling Decisions

- **No emojis** on chore names (cleaner grid)
- **Plain text points** (no gradient pills)
- **Normal small font** for chore names (not bold)
- **Minimal visual noise** for easy scanning

---

## Related Documentation

- [Weekly Grid Architecture](./20260209_weekly_grid_template_architecture.md) - Original grid implementation
- [Smart Family Rotation](./rotation/) - How rotation chores are generated
- [Points Consistency](./troubleshooting/20260131_points_consistency_single_source_of_truth.md) - Transaction tracking
