# Weekly Patterns Analysis

**Date**: January 14, 2026
**Status**: ✅ Complete
**Priority**: Medium
**Effort**: ~95 lines (actual)

---

## Summary

Add a "Weekly Patterns" card to `/reports` showing which days of the week are most active for chore completions. Combines text insights with a visual heatmap grid.

---

## Data Source

```sql
-- Query: Weekly Pattern Analysis (Single Family)
-- Shows which days of week are most active for a specific family
SELECT
  fp.name,
  TO_CHAR(ct.created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM ct.created_at) as day_num,
  COUNT(*) as completions,
  SUM(ct.points_change) as total_points
FROM public.family_profiles fp
JOIN choretracker.chore_transactions ct
  ON fp.id = ct.profile_id
WHERE fp.family_id = $1
  AND ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
  AND fp.role = 'child'
  AND ct.created_at >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY fp.name, TO_CHAR(ct.created_at, 'Day'), EXTRACT(DOW FROM ct.created_at)
ORDER BY fp.name, day_num;
```

---

## UI Mockup

### Desktop

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Weekly Patterns (Last 60 Days)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔥 Family's busiest day: Friday (14 chores)                 │
│ 😴 Slowest days: Sunday & Thursday                          │
│                                                             │
│ Cikũ: Most active Mon & Fri (25 total)                      │
│ Julia: Most active Mon & Fri (24 total)                     │
│ Tonie!: Occasional (3 total)                                │
│                                                             │
│         S    M    T    W    T    F    S                     │
│ Cikũ    ·    ██   ·    ·    ·   ███   █                     │
│ Julia   ·    ██   █    ·    ·   ███   ·                     │
│ Tonie!  ·    ·    ·    ·    ·    ·    ·                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile

```
┌───────────────────────────────────┐
│ 📅 Weekly Patterns (60 Days)      │
├───────────────────────────────────┤
│                                   │
│ 🔥 Busiest: Friday (14)           │
│ 😴 Slowest: Sun & Thu             │
│                                   │
│ Cikũ: Mon & Fri (25)              │
│ Julia: Mon & Fri (24)             │
│ Tonie!: Occasional (3)            │
│                                   │
│       S  M  T  W  T  F  S         │
│ Cikũ  ·  █  ·  ·  ·  ██ ·         │
│ Julia ·  █  ·  ·  ·  ██ ·         │
│ Tonie ·  ·  ·  ·  ·  ·  ·         │
│                                   │
└───────────────────────────────────┘
```

---

## UI Components

### 1. Family Aggregate Insights
- **Busiest day**: Day with highest total completions
- **Slowest days**: Days with lowest completions (can be multiple if tied)

### 2. Per-Kid Text Summary
- Top 2 most active days for each kid
- Total completions in period
- "Occasional" label if < 5 total

### 3. Visual Heatmap Grid
- 7 columns (S M T W T F S)
- 1 row per kid
- Intensity levels:
  - `·` = 0-2 completions (low)
  - `█` = 3-4 completions (medium)
  - `██` = 5-6 completions (high)
  - `███` = 7+ completions (very high)

---

## Implementation

### Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `lib/services/chore-service.ts` | Added `getWeeklyPatterns()` method | +95 |
| `islands/FamilyReports.tsx` | Added Weekly Patterns card with heatmap | +56 |
| `routes/reports.tsx` | Fetch and pass weekly patterns data | +5 |

**Total**: ~156 lines (actual, including interfaces and error handling)

### ChoreService Method

```typescript
async getWeeklyPatterns(familyId: string): Promise<{
  familyBusiestDay: { day: string; count: number };
  familySlowestDays: string[];
  byPerson: Array<{
    name: string;
    total: number;
    topDays: string[];
    heatmap: number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  }>;
}>
```

---

## Design Principles Applied

| Principle | How Applied |
|-----------|-------------|
| **20/80 value** | Single query, derived insights, no over-engineering |
| **No bloat** | ~70 lines total, no new files |
| **Zero cognitive load** | Text insights first, visual confirms pattern |
| **Simplicity** | Uses existing card pattern from FamilyReports |
| **Extensible** | Can add date range selector later if needed |

---

## What We're NOT Building

| Feature | Status | Add Later? |
|---------|--------|------------|
| Date range selector | ❌ Skip | Maybe |
| Hourly patterns | ❌ Skip | No |
| Trend comparison | ❌ Skip | Maybe |
| Export to CSV | ❌ Skip | No |

---

## Testing Scenarios

| Scenario | Expected |
|----------|----------|
| No data (new family) | Card hidden or "Not enough data" |
| Single kid | Shows one row in heatmap |
| All days equal | "No clear pattern" message |
| One dominant day | Highlights that day as busiest |

---

## Related Documentation

- [Family Reports Analytics](../20260114_family_reports_analytics_implementation.md)
- [Collaborative Family Goals](./20260114_collaborative_family_goals_bonus_system.md)
