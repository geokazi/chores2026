# Points Consistency: Single Source of Truth

**Date**: January 31, 2026
**Status**: Resolved
**Criticality**: HIGH - User trust depends on accurate, consistent data

## Executive Summary

ChoreGami's gamification system relies on **accurate, consistent points calculations** across all pages. Users must see the same numbers everywhere - if Reports shows Julia earned 5 points, then Dashboard, Balances, and Insights must all show 5 points. Any discrepancy destroys user trust.

This document captures the architecture decisions and troubleshooting guide for maintaining **single source of truth** across all points-related displays.

---

## The Problem (What Went Wrong)

Different pages showed different point totals for the same kid in the same week:

| Page | Julia's Points | Cikū's Points |
|------|----------------|---------------|
| /reports | 5 | 3 |
| /parent/dashboard | 7 | 4 |
| /parent/balances | 7 | 4 |
| /kid/dashboard | 4 | 3 |

**Root Causes Identified:**

1. **Week boundary inconsistency**: Some services used Monday-first weeks, others Sunday-first
2. **Timezone inconsistency**: Some services used UTC, others used local timezone
3. **Query pattern inconsistency**: Some queried by `profile_id`, others by `family_id`
4. **Transaction filter inconsistency**: Some filtered `transaction_type = 'chore_completed'`, others counted all positive transactions

---

## The Solution: Aligned Architecture

### 1. Single Week Boundary: Sunday-First (Sun-Sat)

All services MUST use Sunday as the first day of the week to match US convention:

```typescript
// CORRECT: Sunday-first week calculation
const todayDate = new Date(year, month - 1, day);
const dayOfWeek = todayDate.getDay(); // 0=Sun, 6=Sat
const sundayDate = new Date(year, month - 1, day - dayOfWeek);
```

**Files that implement this:**
- `lib/services/chore-service.ts` - `getFamilyAnalytics()`, `getFamilyGoalStatus()`
- `lib/services/balance-service.ts` - `getCurrentWeekDates()`, `getFamilyBalances()`
- `lib/services/insights-service.ts` - `computeThisWeekActivity()`

### 2. Timezone-Aware Date Calculations

All date comparisons MUST use the user's local timezone, not UTC:

```typescript
import { getLocalDate } from "./insights-service.ts";

// CORRECT: Convert UTC timestamp to local date
const txLocalDate = getLocalDate(transaction.created_at, timezone);
const isThisWeek = txLocalDate >= weekStartStr;

// WRONG: Using UTC date
const txDate = transaction.created_at.substring(0, 10); // UTC date!
```

**The `getLocalDate()` function** (defined in `insights-service.ts`):
```typescript
export function getLocalDate(isoTimestamp: string, timezone: string): string {
  const date = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: timezone,
  }).formatToParts(date);
  return `${year}-${month}-${day}`; // YYYY-MM-DD in user's timezone
}
```

### 3. Browser Timezone Detection

All routes MUST detect the browser's timezone and pass it to services:

```typescript
// In route handler:
const url = new URL(req.url);
const timezone = url.searchParams.get("tz") || "America/Los_Angeles";

// Pass to services:
await choreService.getFamilyAnalytics(familyId, pointsPerDollar, timezone);
await insightsService.getInsights(familyId, settings, profiles, timezone);
await balanceService.getFamilyBalances(familyId, timezone);
```

```typescript
// In page component (client-side detection):
const timezoneScript = `
  (function() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('tz')) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      url.searchParams.set('tz', tz);
      window.location.replace(url.toString());
    }
  })();
`;
```

**Routes that implement this:**
- `routes/reports.tsx`
- `routes/parent/dashboard.tsx`
- `routes/parent/balances.tsx`
- `routes/parent/insights.tsx`
- `routes/kid/dashboard.tsx`

### 4. Consistent Query Pattern

All services MUST query by `family_id` and filter by `profile_id` in memory:

```typescript
// CORRECT: Query by family, filter by profile
const { data: allTransactions } = await client
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, points_change, created_at")
  .eq("family_id", familyId)
  .gt("points_change", 0);

// Filter for specific profile
const profileTx = allTransactions.filter(t => t.profile_id === profileId);
```

**Why?** This ensures all services see the same transaction set and apply the same filters.

### 5. Count ALL Positive Transactions

All services MUST count all positive transactions, not just `chore_completed`:

```typescript
// CORRECT: All positive transactions
.gt("points_change", 0)

// WRONG: Only chore completions (misses adjustments, bonuses)
.eq("transaction_type", "chore_completed")
.gt("points_change", 0)
```

**Transaction types that earn points:**
- `chore_completed` - Kid completes a chore
- `adjustment` - Parent adds bonus points
- `bonus_awarded` - System awards bonus (e.g., weekly goal)

---

## Verification: How to Confirm Data Matches

### Quick Database Query Script

Create a script to query actual transactions and compare with UI:

```typescript
// query-txns.ts - Run with: deno run --allow-env --allow-net query-txns.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const client = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Get week boundaries in LA timezone
const now = new Date();
const laDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const [year, month, day] = laDateStr.split("-").map(Number);
const laToday = new Date(year, month - 1, day);
const dayOfWeek = laToday.getDay();
const laSunday = new Date(year, month - 1, day - dayOfWeek);
const sundayStr = laSunday.toISOString().split("T")[0];

console.log("Week start (Sunday):", sundayStr);
console.log("Today (LA):", laDateStr);

// Get transactions
const { data: txns } = await client
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, points_change, created_at, transaction_type")
  .eq("family_id", YOUR_FAMILY_ID)
  .gt("points_change", 0);

// Filter to this week and group by profile
const weekTxns = txns?.filter(tx => {
  const utcDate = new Date(tx.created_at);
  const laDate = utcDate.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return laDate >= sundayStr;
}) || [];

console.log(`This week: ${weekTxns.length} transactions`);

// Show per day per profile
// ... (see full script in scratchpad)
```

### Expected Output Format

```
=== SUMMARY (should match all UI pages) ===
Julia: 5 points, 4 days with activity
Cikū: 3 points, 3 days with activity
Family Total: 8 points
```

Compare this output against:
- `/reports` - "Earned This Week" table
- `/parent/dashboard` - "This Week" card
- `/parent/balances` - "This Week" section
- `/kid/dashboard` - "This Week" card

---

## Troubleshooting Checklist

When points don't match across pages:

### 1. Check Week Boundaries
- [ ] All services using Sunday as week start?
- [ ] Search for `getDay() === 1` or `Monday` - should not exist in production code

### 2. Check Timezone Handling
- [ ] Route receiving `?tz=` parameter?
- [ ] Service receiving timezone parameter?
- [ ] Using `getLocalDate()` for date comparisons?
- [ ] Search for `"UTC"` hardcoded - should only be in fallback/test code

### 3. Check Query Pattern
- [ ] Querying `chore_transactions` by `family_id`?
- [ ] Using `.gt("points_change", 0)` (not filtering by transaction_type)?
- [ ] Using `.schema("choretracker")` for transaction queries?

### 4. Check Interface Alignment
- [ ] `ThisWeekActivity` interface includes `points` and `totalPoints`?
- [ ] All islands using updated interface?

### 5. Browser Cache
- [ ] Hard refresh (Cmd+Shift+R)?
- [ ] Dev server restarted?

---

## Service Responsibility Matrix

| Service | What It Calculates | Used By |
|---------|-------------------|---------|
| `chore-service.getFamilyAnalytics()` | Earned this week/month/YTD per member | `/reports` |
| `chore-service.getFamilyGoalStatus()` | Family weekly goal progress | `/reports`, `/kid/dashboard` |
| `balance-service.getFamilyBalances()` | Points + daily breakdown per kid | `/parent/balances` |
| `insights-service.computeThisWeekActivity()` | Day-by-day activity + points | `/parent/dashboard`, `/kid/dashboard`, `/parent/insights` |

**All four services MUST produce identical totals for the same week.**

---

## Key Files Reference

### Services (Single Source of Truth)
- `lib/services/chore-service.ts` - Lines 916-1000 (`getFamilyAnalytics`)
- `lib/services/balance-service.ts` - Lines 24-52 (`getCurrentWeekDates`), 104-171 (`getFamilyBalances`)
- `lib/services/insights-service.ts` - Lines 38-50 (`getLocalDate`), 184-248 (`computeThisWeekActivity`)

### Routes (Timezone Detection)
- `routes/reports.tsx` - Line 85 (timezone from URL)
- `routes/parent/dashboard.tsx` - Line 49 (timezone from URL)
- `routes/parent/balances.tsx` - Line 54 (timezone from URL)
- `routes/kid/dashboard.tsx` - Line 51 (timezone from URL)

### Components (Display)
- `islands/WeeklyProgress.tsx` - Shows points per day + total
- `islands/HabitInsights.tsx` - Shows points per day + total

---

## Principles for Future Development

1. **Single Source of Truth**: One function calculates points, others call it
2. **Timezone Awareness**: Never use UTC for user-facing dates
3. **Sunday-First Weeks**: US convention, consistent everywhere
4. **All Positive Transactions**: Don't filter by transaction_type for totals
5. **Query by Family**: Fetch all family transactions, filter by profile in memory
6. **Test with Real Data**: Always verify against database before shipping

---

## Related Documentation

- [Family Reports Analytics Implementation](./20260114_family_reports_analytics_implementation.md)
- [FamilyScore Sync Integration](./20260112_familyscore_sync_integration.md)
- [JSONB Settings Architecture](./20260114_JSONB_settings_architecture.md)
