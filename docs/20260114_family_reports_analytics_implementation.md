# Family Reports & Analytics - Implementation

**Date**: January 14, 2026
**Status**: ✅ Implemented

## Philosophy

**20% effort → 80% value.** Simple, extensible, zero cognitive load.

---

## What We Built

A `/reports` page showing:
1. **Savings** by person with dollar values
2. **Points Earned** by person (Week/Month/YTD/All Time)
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
  // Calculate week/month/ytd/all_time in JavaScript
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
           AND ct.points_change > 0 THEN ct.points_change END), 0)::int as earned_ytd,
  COALESCE(SUM(CASE WHEN ct.points_change > 0
           THEN ct.points_change END), 0)::int as earned_all_time
FROM public.family_profiles fp
JOIN public.families f ON f.id = fp.family_id
LEFT JOIN choretracker.chore_transactions ct
  ON ct.profile_id = fp.id AND ct.family_id = fp.family_id
WHERE fp.family_id = $1 AND fp.is_deleted = false
GROUP BY fp.id, fp.name, fp.role, fp.current_points, f.points_per_dollar
ORDER BY fp.current_points DESC;
```

### Query 2: Goals Achieved (Aggregated by Person)

**Implementation**: `ChoreService.getGoalsAchieved(familyId)`

Returns aggregated data by person for the past year (card-style display):

```typescript
// Query redemption transactions from past year
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const { data: transactions } = await this.client
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, points_change")
  .eq("family_id", familyId)
  .in("transaction_type", ["reward_redemption", "cash_out"])
  .gte("created_at", oneYearAgo.toISOString())
  .order("created_at", { ascending: false });

// Aggregate by person
// Returns: { byPerson: [...], familyTotal: { totalPoints, rewardCount } }
```

**Return Structure**:
```typescript
{
  byPerson: Array<{
    name: string;
    totalPoints: number;
    rewardCount: number;
  }>;
  familyTotal: {
    totalPoints: number;
    rewardCount: number;
  };
}
```

---

## UI Layout

```
┌───────────────────────────────────────────────────────┐
│ ← Back              Family Progress                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 💰 SAVINGS                                            │
│ ───────────────────────────────────────────────────── │
│ ⭐ Cikū        107 pts  ($107.00)                     │
│    Tonie!       37 pts   ($37.00)                     │
│    Dad          12 pts   ($12.00)                     │
│    Mom           5 pts    ($5.00)                     │
│                                                       │
│ 📈 EARNED THIS   Week  Month   YTD   All              │
│ ───────────────────────────────────────────────────── │
│ Cikū              47    120    450   890              │
│ Tonie!            32     98    380   720              │
│ Dad               12     45    200   400              │
│ Mom                5     20     85   180              │
│ ───────────────────────────────────────────────────── │
│ Family Total      96    283   1115  2190              │
│                                                       │
│ 🎯 GOALS ACHIEVED (Past Year)                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🏅 Julia                               100 pts  │   │
│ │                              5 rewards claimed  │   │
│ └─────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────┐   │
│ │    Tonie!                               32 pts  │   │
│ │                             11 rewards claimed  │   │
│ └─────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────┐   │
│ │    Cikũ                                 23 pts  │   │
│ │                              3 rewards claimed  │   │
│ └─────────────────────────────────────────────────┘   │
│ ───────────────────────────────────────────────────── │
│ Family Total                    155 pts (19 rewards)  │
│                                                       │
│ 🏆 Cikū is this week's Top Earner!                    │
└───────────────────────────────────────────────────────┘
```

**Period Definitions**:
- **Week**: Current calendar week (Sun-Sat)
- **Month**: Current calendar month
- **YTD**: Year to Date (Jan 1 to now)
- **All**: All time (lifetime total)

**Goals Achieved (Card Layout)**:
- **Aggregated by person**: Shows total per family member, not individual transactions
- **Past year filter**: Only redemptions from the past 12 months
- **Card-style**: Each person in a bordered card
- **Top achiever badge**: 🏅 and highlighted border for highest total
- **Family total**: Sum of all points and rewards at bottom

**Note**: Dollar values depend on family's `points_per_dollar` setting (from JSONB `settings.apps.choregami.points_per_dollar`).

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

---

## Related Documentation

- [Points Consistency: Single Source of Truth](./20260131_points_consistency_single_source_of_truth.md) - Critical guide for timezone handling and ensuring all pages show consistent point totals
- [FamilyScore Sync Integration](./20260112_familyscore_sync_integration.md) - How transactions sync with FamilyScore
- [JSONB Settings Architecture](./20260114_JSONB_settings_architecture.md) - Family settings storage
