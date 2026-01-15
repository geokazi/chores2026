# Family Reports & Analytics - Implementation

**Date**: January 14, 2026
**Status**: ✅ Implemented

## Philosophy

**20% effort → 80% value.** Simple, extensible, zero cognitive load.

---

## What We Built

A `/reports` page showing:
1. **Savings** by person with dollar values
2. **Points Earned** by person (week/month/year)
3. **Goals Achieved** (positive framing for redemptions)
4. **Weekly Champion** badge

---

## Architecture

| Component | Lines | Description |
|-----------|-------|-------------|
| `routes/reports.tsx` | ~100 | Server-side route (session-based, no GUIDs in URL) |
| `islands/FamilyReports.tsx` | ~180 | Savings-focused UI, zero clicks needed |
| `lib/services/chore-service.ts` | +200 | `getFamilyAnalytics()` + `getGoalsAchieved()` |
| `lib/auth/session.ts` | +3 | Added `points_per_dollar` to session |

**No new services. No new APIs. No bloat.**

---

## Dollar Conversion

### Source of Truth
The `points_per_dollar` setting is stored in `public.families` table:

```sql
SELECT points_per_dollar FROM public.families WHERE id = $1;
```

### Formula
```
dollars = points / points_per_dollar
```

| points_per_dollar | 100 points = |
|-------------------|--------------|
| 1 | $100.00 |
| 10 | $10.00 |
| 100 | $1.00 |

### Optimization: Session Caching
To avoid querying `families` on every page load:

1. **Login** → `session.ts` fetches `points_per_dollar` once
2. **Session** → Stores it in `session.family.points_per_dollar`
3. **Routes** → Pass cached value to service methods

```typescript
// routes/reports.tsx
const pointsPerDollar = session.family.points_per_dollar;
const analytics = await choreService.getFamilyAnalytics(familyId, pointsPerDollar);
```

---

## Data Queries

### Query 1: Family Analytics (Savings + Earned)

**Implementation**: `ChoreService.getFamilyAnalytics(familyId, pointsPerDollar)`

The method tries an RPC first, then falls back to JavaScript calculations:

```typescript
// 1. Try RPC (if exists in DB)
const { data, error } = await this.client.rpc("get_family_analytics", { p_family_id: familyId });

// 2. Fallback: Direct queries + JS calculation
if (error?.code === "PGRST202") {
  // Query family_profiles for current_points
  // Query chore_transactions for period earnings
  // Calculate week/month/year in JavaScript
}
```

**Equivalent SQL** (for reference):
```sql
SELECT
  fp.id,
  fp.name,
  fp.role,
  fp.current_points as savings,
  ROUND(fp.current_points / f.points_per_dollar, 2) as savings_dollars,
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('week', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_week,
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('month', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_month,
  COALESCE(SUM(CASE WHEN ct.created_at >= date_trunc('year', CURRENT_DATE)
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_year
FROM public.family_profiles fp
JOIN public.families f ON f.id = fp.family_id
LEFT JOIN choretracker.chore_transactions ct
  ON ct.profile_id = fp.id AND ct.family_id = fp.family_id
WHERE fp.family_id = $1 AND fp.is_deleted = false
GROUP BY fp.id, fp.name, fp.role, fp.current_points, f.points_per_dollar
ORDER BY fp.current_points DESC;
```

### Query 2: Goals Achieved

**Implementation**: `ChoreService.getGoalsAchieved(familyId, limit)`

```typescript
// Query redemption transactions
const { data: transactions } = await this.client
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, points_change, description, created_at")
  .eq("family_id", familyId)
  .in("transaction_type", ["reward_redemption", "cash_out"])
  .order("created_at", { ascending: false })
  .limit(limit);
```

---

## UI Layout

```
┌─────────────────────────────────────────────────┐
│ ← Back           Family Progress                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 💰 SAVINGS                                      │
│ ─────────────────────────────────────────────── │
│ Cikū         107 pts  ($107.00)   ⭐ Top Saver  │
│ Tonie!        37 pts   ($37.00)                 │
│ Dad           12 pts   ($12.00)                 │
│ Mom            5 pts    ($5.00)                 │
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
└─────────────────────────────────────────────────┘
```

**Note**: Dollar values depend on family's `points_per_dollar` setting.

---

## Files Changed

| File | Change |
|------|--------|
| `routes/reports.tsx` | **NEW** - Session-based route |
| `islands/FamilyReports.tsx` | **NEW** - Savings-focused UI |
| `lib/services/chore-service.ts` | **EDIT** - Added analytics methods |
| `lib/auth/session.ts` | **EDIT** - Added `points_per_dollar` to session |
| `islands/KidDashboard.tsx` | **EDIT** - Added reports link |
| `islands/ParentDashboard.tsx` | **EDIT** - Fixed reports link (removed GUID) |
| `fresh.gen.ts` | Auto-updated |

---

## Security

- **Session-based**: No family_id or user GUIDs in URL
- **Authentication required**: Redirects to `/login` if not authenticated
- **Family-scoped**: Only shows data for authenticated user's family

---

## Extensibility (Future)

When needed, extend without refactoring:
- **Savings goals** → Add `savings_goal` column to `family_profiles`
- **Streaks** → Add streak calculation to analytics method
- **Export** → Add `/api/reports/export` route
- **Date range picker** → Add query params to route

**No premature abstraction. Add when needed.**
