# Family Reports & Analytics - Simplified Plan

**Date**: January 14, 2026

## Philosophy

**20% effort → 80% value.** Simple, extensible, zero cognitive load.

---

## What We're Building

A `/reports` page showing:
1. **Points Earned** by person (week/month/year/all)
2. **Points Spent** by person (week/month/year/all)
3. **Quick Stats** (weekly champion, family total, streaks)

---

## Architecture: Minimal Code

| Component | Lines | Description |
|-----------|-------|-------------|
| `routes/reports.tsx` | ~80 | Server-side route (family-wide, not parent-only) |
| `islands/FamilyReports.tsx` | ~150 | Simple UI with period toggles |
| `lib/services/chore-service.ts` | +40 | Add `getFamilyAnalytics()` method |
| **Total** | **~270** | 2 new files + 1 edit |

**No new services. No new APIs. No bloat.**

**Why `/reports` not `/parent/reports`?** Everyone in the family should see insights - kids seeing their progress is motivating!

---

## SQL Queries

### Query 1: Family Stats (Savings + Earned)

```sql
-- ChoreService.getFamilyAnalytics(familyId)
SELECT
  fp.id,
  fp.name,
  fp.role,
  fp.current_points as savings,
  ROUND(fp.current_points * 0.10, 2) as savings_dollars,

  -- Earned This Week/Month/Year
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('week', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_week,
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('month', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_month,
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('year', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_year

FROM public.family_profiles fp
LEFT JOIN choretracker.chore_transactions ct
  ON ct.profile_id = fp.id AND ct.family_id = fp.family_id
WHERE fp.family_id = $1
GROUP BY fp.id, fp.name, fp.role, fp.current_points
ORDER BY fp.current_points DESC;
```

### Query 2: Goals Achieved (Recent Redemptions)

```sql
-- ChoreService.getGoalsAchieved(familyId, limit)
SELECT
  fp.name,
  ar.name as reward_name,
  ar.icon as reward_icon,
  ABS(ct.points_change)::int as points_used,
  ct.created_at as achieved_at

FROM choretracker.chore_transactions ct
JOIN public.family_profiles fp ON fp.id = ct.profile_id
LEFT JOIN choretracker.available_rewards ar
  ON ar.family_id = ct.family_id
  AND ct.description ILIKE '%' || ar.name || '%'
WHERE ct.family_id = $1
  AND ct.transaction_type IN ('reward_redemption', 'cash_out')
ORDER BY ct.created_at DESC
LIMIT 5;
```

---

## UI: Savings-Focused Layout (Zero Clicks)

```
┌─────────────────────────────────────────────────┐
│ ← Back           Family Progress                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 💰 SAVINGS                                      │
│ ─────────────────────────────────────────────── │
│ Cikū         107 pts  ($10.70)    ⭐ Top Saver  │
│ Tonie!        37 pts   ($3.70)                  │
│ Dad           12 pts   ($1.20)                  │
│ Mom            5 pts   ($0.50)                  │
│                                                 │
│ 📈 EARNED THIS    Week  Month  Year             │
│ ─────────────────────────────────────────────── │
│ Cikū              47    120    450              │
│ Tonie!            32     98    380              │
│ Dad               12     45    200              │
│ Mom                5     20     85              │
│ ─────────────────────────────────────────────── │
│ Family Total      96    283   1115              │
│                                                 │
│ 🎯 GOALS ACHIEVED                               │
│ ─────────────────────────────────────────────── │
│ Tonie!  🎮 Extra Gaming (20 pts) ✓ Jan 10      │
│ Cikū    🍕 Pizza Choice (10 pts) ✓ Jan 8       │
│                                                 │
│ 🏆 Cikū is this week's Top Earner!              │
│                                                 │
│        Family Chores Made Fun                   │
└─────────────────────────────────────────────────┘
```

**Key Features**:
- Savings shown first with dollar values
- "Top Saver" badge for highest balance
- All periods visible at once (no clicks)
- Goals Achieved = positive framing (not "spent")

---

## Files Changed

| File | Change |
|------|--------|
| `routes/reports.tsx` | **NEW** - ~80 lines |
| `islands/FamilyReports.tsx` | **NEW** - ~150 lines |
| `lib/services/chore-service.ts` | **EDIT** - +40 lines |
| `fresh.gen.ts` | Auto-updated |

---

## Extensibility Hooks (Future)

When needed, just add to the SQL query:
- Savings goals → Add `savings_goal` column to family_profiles
- Streaks → Add streak calculation CTE
- Badges → Join to badges table
- Export → Add API route later

**No premature abstraction. Add when needed.**

---

## Implementation Order

1. Add `getFamilyAnalytics()` to ChoreService
2. Create `routes/reports.tsx`
3. Create `islands/FamilyReports.tsx`
4. Add link from kid dashboard + parent dashboard
5. Deploy

---

## Benefits

| Feature | Financial Literacy Value |
|---------|--------------------------|
| 💰 Savings First | Reinforces saving as the goal |
| 💵 Dollar Values | Connects points to real money |
| ⭐ Top Saver | Celebrates saving, not spending |
| 🎯 Goals Achieved | Reframes spending as achievement |
| 📈 Earning History | Shows hard work pays off |
| 🏆 Weekly Champion | Motivates consistent effort |
