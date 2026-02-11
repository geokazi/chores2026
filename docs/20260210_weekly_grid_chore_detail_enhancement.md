# Weekly Grid Enhancement: Show Individual Chores

**Date**: February 10, 2026
**Status**: Implemented
**Related**: [Weekly Grid Architecture](./20260209_weekly_grid_template_architecture.md)

---

## Overview

Enhance the Weekly Grid to show individual chore names and point allocations per day, instead of just daily point totals. This provides parents with visibility into exactly which chores are assigned to each kid.

---

## Current State

The weekly grid currently shows **daily point totals** only:

```
┌─────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬───────┬────────┐
│ KID             │ SUN │ MON │ TUE │ WED │ THU │ FRI │ SAT │ TOTAL │ STREAK │
├─────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┼────────┤
│ 👦 Anna Log     │  ⬜ │  ⬜ │  ✅ │  ⬜ │  ⬜ │  ⬜ │  ⬜ │   2   │  🔥1   │
│                 │  —  │  —  │  2  │  —  │  —  │  —  │  —  │  pts  │        │
├─────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┼────────┤
│ 👦 Dee Nomi     │  ⬜ │  ⬜ │  ✅ │  ⬜ │  ⬜ │  ⬜ │  ⬜ │   4   │  🔥1   │
│                 │  —  │  —  │  4  │  —  │  —  │  —  │  —  │  pts  │        │
└─────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴───────┴────────┘
```

**Problem**: Parents can't see WHICH chores are assigned to each kid per day.

---

## Proposed Design: Detail View with Chore Names

### Option A: Expandable Rows (Recommended)

Default collapsed view (current behavior), with expand button to show chores:

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┬───────┬────────┐
│ KID             │ TUE             │ WED             │ THU             │ TOTAL │ STREAK │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────┼────────┤
│ ▶ 👦 Anna Log   │      ✅         │      ⬜         │      ⬜         │   2   │  🔥1   │
│                 │      2 pts      │       —         │       —         │  pts  │        │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────┼────────┤
│ ▼ 👦 Dee Nomi   │      ✅         │      ⬜         │      ⬜         │   4   │  🔥1   │
│   ├ Mop kitchen │   ✅ 3 pts      │   ☐ 3 pts       │   ☐ 3 pts       │       │        │
│   └ Tidy bedroom│   ✅ 1 pt       │   ☐ 1 pt        │   ☐ 1 pt        │       │        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴───────┴────────┘

Legend: ✅ Completed  ☐ Pending  — No chore
```

### Option B: Always-Expanded Grid (Alternative)

Shows all chores inline - good for print view:

```
┌─────────────────────┬────────────────────┬────────────────────┬────────────────────┐
│ KID / CHORE         │ TUE                │ WED                │ THU                │
├─────────────────────┼────────────────────┼────────────────────┼────────────────────┤
│ 👦 Anna Log         │                    │                    │                    │
│   Vacuum living rm  │ ✅ 3 pts           │ — (not assigned)   │ ☐ 3 pts            │
│   Dust surfaces     │ — (not assigned)   │ ☐ 2 pts            │ ✅ 2 pts           │
│   Feed pet          │ ✅ 1 pt            │ ☐ 1 pt             │ — (not assigned)   │
│                     │ ─────────────────  │ ─────────────────  │ ─────────────────  │
│   DAY TOTAL         │ 4 pts (2 done)     │ 3 pts (0 done)     │ 5 pts (1 done)     │
├─────────────────────┼────────────────────┼────────────────────┼────────────────────┤
│ 👦 Dee Nomi Nator   │                    │                    │                    │
│   Mop kitchen floor │ ✅ 3 pts           │ ☐ 3 pts            │ — (not assigned)   │
│   Tidy bedroom      │ ✅ 1 pt            │ ☐ 1 pt             │ ☐ 1 pt             │
│   Water plants      │ — (not assigned)   │ ☐ 1 pt             │ ✅ 1 pt            │
│                     │ ─────────────────  │ ─────────────────  │ ─────────────────  │
│   DAY TOTAL         │ 4 pts (2 done)     │ 5 pts (0 done)     │ 2 pts (1 done)     │
└─────────────────────┴────────────────────┴────────────────────┴────────────────────┘

WEEK TOTALS:
  👦 Anna Log: 12 pts (3/9 chores) 🔥1
  👦 Dee Nomi: 11 pts (4/9 chores) 🔥1
```

### Mobile-Responsive View (Single Day Focus)

On narrow screens, show one day at a time with swipe/tabs:

```
┌─────────────────────────────────────────┐
│      ◀  Tuesday, Feb 11  ▶              │
├─────────────────────────────────────────┤
│ 👦 Anna Log           4 pts  (2/3 done) │
│   ✅ Vacuum living room         3 pts   │
│   ✅ Feed pet                   1 pt    │
│   ☐ Dust surfaces              2 pts   │
├─────────────────────────────────────────┤
│ 👦 Dee Nomi Nator     4 pts  (2/2 done) │
│   ✅ Mop kitchen floor          3 pts   │
│   ✅ Tidy bedroom               1 pt    │
├─────────────────────────────────────────┤
│ 👦 Al Jebra           0 pts  (0/3 done) │
│   ☐ Clean bathroom              4 pts   │
│   ☐ Vacuum bedroom              2 pts   │
│   ☐ Sort laundry                2 pts   │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Extend Data Model (~50 lines)

**File: `lib/services/grid-service.ts`**

1. Add new interface for detailed chore data:
```typescript
interface GridChore {
  id: string;
  name: string;
  icon?: string;
  points: number;
  status: "completed" | "pending" | "not_assigned";
}

interface GridDay {
  date: string;
  dayName: string;
  totalPoints: number;      // Sum of all chores
  earnedPoints: number;     // Sum of completed only
  chores: GridChore[];      // NEW: Individual chores
}
```

2. Modify `getWeeklyGrid()` to fetch chore assignments along with transactions

### Phase 2: Update GridService Query (~80 lines)

**File: `lib/services/grid-service.ts`**

1. Query `chore_assignments` for the week to get:
   - Which chores are assigned to each kid per day
   - Point values from `chore_template`
   - Completion status

2. Cross-reference with `chore_transactions` to determine completion

### Phase 3: Update WeeklyGrid UI (~150 lines)

**File: `islands/WeeklyGrid.tsx`**

1. Add expand/collapse state for each kid row
2. Render chore details when expanded
3. Mobile-responsive single-day view
4. Update print styles for expanded view

### Phase 4: Print-Friendly Styling (~30 lines)

**File: `static/grid-print.css`**

1. Force expanded view when printing
2. Adjust column widths for chore names
3. Page break handling for long lists

---

## Data Flow

```
chore_assignments (for week)
    ↓
    ├── assigned_to_profile_id → kid
    ├── assigned_date → day column
    ├── status → completed/pending
    ├── point_value → points
    └── chore_template_id → name, icon

chore_transactions (for week)
    ↓
    └── confirms completion with timestamp
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/services/grid-service.ts` | Add chore-level data to GridDay |
| `islands/WeeklyGrid.tsx` | Expandable rows, chore detail rendering |
| `static/grid-print.css` | Print styles for detailed view |
| `lib/types/finance.ts` | (Optional) Extend types if needed |

---

## Estimated Effort

- Data model extension: ~30 min
- Service query changes: ~45 min
- UI component updates: ~1 hour
- Print styling: ~20 min
- Testing: ~30 min

**Total: ~3 hours**

---

## Questions for Approval

1. **Default expanded or collapsed?**
   - Recommend: Collapsed by default, "Expand All" button available

2. **Show missed/skipped chores?**
   - Recommend: Yes, show as gray "—" or struck through

3. **Mobile view preference?**
   - Option A: Horizontal scroll (current)
   - Option B: Day tabs/swipe (more mobile-friendly)

4. **Print behavior?**
   - Recommend: Always print expanded view with all chores visible
