# Weekly Grid Template - Architecture Review

**Document Created**: February 9, 2026
**Status**: Design Phase - Awaiting Optimization Guidelines
**Architecture**: JSONB-First, Zero New Tables, Reuse Existing Systems

---

## Executive Summary

Weekly Grid is a visual chore progress template inspired by Amazon/Pinterest marketing patterns. It provides families with a printable/shareable weekly view showing each child's chore completion status in a grid format.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | JSONB (no new tables) | Flexibility, O(1) queries with GIN indexing |
| **Pricing Tier** | Pro feature | Value-add for paid subscribers |
| **Template Count** | 1 (MVP) | Pareto: 20% effort, 80% value |
| **Rewards System** | Reuse existing | No duplicate code, leverage `balance-service.ts` |

---

## Design Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT PRINCIPLES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PARETO (80/20)                                                            │
│   ══════════════                                                            │
│   • 1 template design covers majority use case                              │
│   • Reuse existing rewards, transactions, family_profiles                   │
│   • Ship minimal, iterate based on real usage data                          │
│                                                                             │
│   NO CODE BLOAT                                                             │
│   ══════════════                                                            │
│   • Max 500 lines per module (hard limit)                                   │
│   • Delete before you add                                                   │
│   • No premature abstraction                                                │
│                                                                             │
│   DATABASE OPTIMIZATION                                                     │
│   ═════════════════════                                                     │
│   • O(1) operations via JSONB + GIN indexing                                │
│   • NO O(n × m) loops in application code                                   │
│   • Single query returns complete grid data                                 │
│                                                                             │
│   REUSE FIRST                                                               │
│   ═══════════                                                               │
│   • Existing rewards system (balance-service.ts)                            │
│   • Existing transaction queries (chore_transactions)                       │
│   • Existing family/profile data structures                                 │
│   • Existing plan-gate.ts for Pro tier access                               │
│                                                                             │
│   SECURITY (No Shortcuts)                                                   │
│   ═══════════════════════                                                   │
│   • Session-based access (no GUIDs in URLs)                                 │
│   • Family-scoped queries only                                              │
│   • Service role key for server routes                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### Existing Infrastructure to Reuse

| Component | Location | Purpose for Weekly Grid |
|-----------|----------|------------------------|
| `chore_transactions` | `choretracker` schema | Source of completion data |
| `family_profiles` | `public` schema | Kid names, avatars |
| `families.settings` | JSONB column | Store grid preferences |
| `plan-gate.ts` | `lib/plan-gate.ts` | Pro tier access control |
| `balance-service.ts` | `lib/services/` | Weekly points calculation |
| `insights-service.ts` | `lib/services/` | Streak data, weekly patterns |

### Existing Query Patterns

```typescript
// REUSE: Weekly transaction aggregation (already exists)
// From: lib/services/insights-service.ts

const weeklyData = await supabase
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, points_change, created_at, metadata")
  .eq("family_id", familyId)
  .gte("created_at", weekStart)
  .lte("created_at", weekEnd);
```

---

## Proposed Architecture

### JSONB Schema (Zero New Tables)

**Follows Existing Pattern**: See [JSONB Settings Architecture](./20260114_JSONB_settings_architecture.md)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JSONB STORAGE STRATEGY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   EXISTING INFRASTRUCTURE (sql/20260114_jsonb_settings.sql):                │
│   ═══════════════════════════════════════════════════════════               │
│                                                                             │
│   public.families.settings JSONB NOT NULL DEFAULT '{}'                      │
│   └── GIN index: idx_families_settings_gin (ALREADY EXISTS)                 │
│                                                                             │
│   public.family_profiles.preferences JSONB NOT NULL DEFAULT '{}'            │
│   └── GIN index: idx_family_profiles_preferences_gin (ALREADY EXISTS)       │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   WEEKLY GRID LOCATION (follows app namespace pattern):                     │
│   families.settings.apps.choregami.weekly_grid                              │
│                                                                             │
│   {                                                                         │
│     "enabled": true,                                                        │
│     "template": "classic",           // MVP: only "classic"                 │
│     "preferences": {                                                        │
│       "show_points": true,           // Show point values                   │
│       "show_streaks": true,          // Show streak indicators              │
│       "week_start": "sunday"         // Sunday-first (US convention)        │
│     },                                                                      │
│     "last_generated": "2026-02-09"   // Cache invalidation                  │
│   }                                                                         │
│                                                                             │
│   SIZE: ~150 bytes per family (sparse storage - only overrides)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GIN Index (Already Exists - NO Migration Needed)

```sql
-- FROM sql/20260114_jsonb_settings.sql (ALREADY DEPLOYED)
CREATE INDEX IF NOT EXISTS idx_families_settings_gin
ON public.families USING GIN (settings);

CREATE INDEX IF NOT EXISTS idx_family_profiles_preferences_gin
ON public.family_profiles USING GIN (preferences);
```

**Query Patterns (O(1) with existing GIN index):**

```sql
-- Find families with Weekly Grid enabled
SELECT id, name FROM families
WHERE settings @> '{"apps": {"choregami": {"weekly_grid": {"enabled": true}}}}';

-- Get grid preferences with inheritance (member overrides family)
SELECT
  COALESCE(
    fp.preferences->'apps'->'choregami'->'weekly_grid',
    f.settings->'apps'->'choregami'->'weekly_grid',
    '{}'::jsonb
  ) as grid_settings
FROM family_profiles fp
JOIN families f ON f.id = fp.family_id
WHERE fp.id = $1;
```

### JSONB Update Pattern (No Migration)

```typescript
// Set Weekly Grid config (uses existing jsonb_set pattern)
await supabase
  .from('families')
  .update({
    settings: supabase.sql`
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{apps,choregami,weekly_grid}',
        ${JSON.stringify({
          enabled: true,
          template: 'classic',
          preferences: { show_points: true, show_streaks: true }
        })}::jsonb
      )
    `
  })
  .eq('id', familyId);
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEEKLY GRID DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. GRID REQUEST (GET /api/grid/weekly)                                    │
│      │                                                                      │
│      ├── Validate session (existing auth)                                   │
│      ├── Check Pro tier (plan-gate.ts)                                      │
│      │                                                                      │
│      ▼                                                                      │
│   2. SINGLE DATABASE QUERY (O(1) with proper indexing)                      │
│      │                                                                      │
│      │   SELECT                                                             │
│      │     fp.id, fp.name, fp.avatar_url,                                   │
│      │     ct.created_at::date as day,                                      │
│      │     SUM(ct.points_change) as daily_points,                           │
│      │     COUNT(*) as chores_completed                                     │
│      │   FROM family_profiles fp                                            │
│      │   LEFT JOIN choretracker.chore_transactions ct                       │
│      │     ON ct.profile_id = fp.id                                         │
│      │     AND ct.created_at >= week_start                                  │
│      │     AND ct.created_at < week_end                                     │
│      │   WHERE fp.family_id = $1                                            │
│      │     AND fp.role = 'child'                                            │
│      │   GROUP BY fp.id, fp.name, fp.avatar_url, ct.created_at::date        │
│      │                                                                      │
│      ▼                                                                      │
│   3. TRANSFORM TO GRID (in-memory, O(n) where n = kids × 7 days)            │
│      │                                                                      │
│      │   {                                                                  │
│      │     "week": "2026-02-03 to 2026-02-09",                              │
│      │     "kids": [                                                        │
│      │       {                                                              │
│      │         "name": "Emma",                                              │
│      │         "days": [                                                    │
│      │           { "day": "Sun", "points": 4, "chores": 3, "complete": true },│
│      │           { "day": "Mon", "points": 2, "chores": 2, "complete": false },│
│      │           ...                                                        │
│      │         ],                                                           │
│      │         "weekly_total": 28,                                          │
│      │         "streak": 5                                                  │
│      │       }                                                              │
│      │     ]                                                                │
│      │   }                                                                  │
│      │                                                                      │
│      ▼                                                                      │
│   4. RENDER TEMPLATE (static HTML/CSS, no complex JS)                       │
│      │                                                                      │
│      └── Return grid for display/print/share                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure (Max 500 Lines Each)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FILE STRUCTURE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   NEW FILES (Estimated Lines)                                               │
│   ═══════════════════════════                                               │
│                                                                             │
│   routes/api/grid/weekly.ts           ~60 lines    API endpoint             │
│   lib/services/grid-service.ts        ~80 lines    Compose existing services│
│   islands/WeeklyGrid.tsx              ~150 lines   Display component        │
│   static/grid-print.css               ~50 lines    Print styles             │
│                                                                             │
│   TOTAL: ~340 lines (well under 500 per module)                             │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   REUSED (Zero New Code - Heavy Lifting Already Done)                       │
│   ═══════════════════════════════════════════════════                       │
│                                                                             │
│   lib/services/balance-service.ts     ← getFamilyBalances() returns:        │
│                                         • currentPoints per kid             │
│                                         • weeklyEarnings per kid            │
│                                         • dailyEarnings[] (7-day rolling)   │
│                                         • Timezone-aware date handling      │
│                                                                             │
│   lib/services/insights-service.ts    ← calculateStreak() for 🔥 badge      │
│   lib/plan-gate.ts                    ← Pro tier access control             │
│   lib/auth/session.ts                 ← Session validation                  │
│                                                                             │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   COMPOSITION PATTERN                                                       │
│   ═══════════════════                                                       │
│                                                                             │
│   GridService composes:                                                     │
│   ├── BalanceService.getFamilyBalances()  ← Daily/weekly points             │
│   ├── InsightsService.calculateStreak()   ← Streak calculation              │
│   └── Simple mapping logic                ← Transform to grid format        │
│                                                                             │
│   NO duplicate query logic. NO duplicate point aggregation.                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Template Design (MVP: 1 Template)

### "Classic" Weekly Grid

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   📊 WEEKLY CHORE GRID                          Feb 3 - Feb 9, 2026     │
│   ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│              Sun    Mon    Tue    Wed    Thu    Fri    Sat    TOTAL     │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   👧 Emma    ✅4    ✅2    ✅3    ✅2    ⬜0    ⬜─    ⬜─     11 pts    │
│              🔥5                                                         │
│                                                                          │
│   👦 Noah    ✅3    ✅2    ⬜1    ✅4    ⬜0    ⬜─    ⬜─     10 pts    │
│              🔥3                                                         │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   ✅ = All daily chores complete    ⬜ = Incomplete    🔥 = Streak      │
│                                                                          │
│                          ┌─────────────┐                                │
│                          │  📤 Share   │                                │
│                          └─────────────┘                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Layout** | Table grid | Familiar, scannable, print-friendly |
| **Indicators** | ✅/⬜ + points | Clear completion status |
| **Streaks** | 🔥 badge | Reuse existing streak logic |
| **Colors** | Theme-aware | Use existing CSS variables |
| **Print** | CSS @media print | No JS complexity |

---

## Integration Points

### Rewards/Balance System (Existing - REUSE 100%)

**Key Discovery**: `BalanceService.getFamilyBalances()` already provides EXACTLY what Weekly Grid needs:

```typescript
// lib/services/balance-service.ts (lines 101-168)
// ALREADY IMPLEMENTED - just call it!

interface BalanceInfo {
  profileId: string;
  profileName: string;
  avatarEmoji: string;
  currentPoints: number;           // ← Grid "Total" column
  dollarValue: number;
  weeklyEarnings: number;          // ← Grid "Week Total"
  dailyEarnings: DailyEarning[];   // ← Grid day columns!
}

interface DailyEarning {
  date: string;      // "2026-02-09"
  dayName: string;   // "Sun"
  points: number;    // Points earned that day
}

// Usage in Weekly Grid API:
const balanceService = new BalanceService();
const balances = await balanceService.getFamilyBalances(familyId, timezone);

// Returns array of BalanceInfo - one per kid
// Each has dailyEarnings[] for last 7 days (rolling window)
```

### What BalanceService Already Does

| Feature | Method | Notes |
|---------|--------|-------|
| Per-kid points | `getFamilyBalances()` | Returns `currentPoints` |
| Weekly earnings | `getFamilyBalances()` | Returns `weeklyEarnings` |
| Daily breakdown | `getFamilyBalances()` | Returns `dailyEarnings[]` with 7 days |
| Timezone support | `getRolling7DayDates(tz)` | Uses IANA timezone |
| Transaction query | Reuses existing pattern | Same as `chore-service` |

### What Weekly Grid Needs to Add

| Feature | Source | New Code? |
|---------|--------|-----------|
| Kid names/points | `BalanceService` | **NO** |
| Daily points | `BalanceService.dailyEarnings` | **NO** |
| Weekly total | `BalanceService.weeklyEarnings` | **NO** |
| Completion status | Query `chore_assignments` | ~20 lines |
| Streak indicator | `InsightsService.calculateStreak()` | **NO** |

### Grid Service Integration (Minimal New Code)

```typescript
// lib/services/grid-service.ts (~80 lines, NOT 120)
// Most work already done by BalanceService!

import { BalanceService } from "./balance-service.ts";
import { InsightsService } from "./insights-service.ts";

export class GridService {
  private balanceService = new BalanceService();
  private insightsService = new InsightsService();

  async getWeeklyGrid(familyId: string, timezone: string) {
    // 1. Get balance data (includes daily earnings)
    const balances = await this.balanceService.getFamilyBalances(familyId, timezone);

    // 2. Get streak data for each kid
    const grids = await Promise.all(
      balances.map(async (balance) => {
        const streak = await this.insightsService.calculateStreak(balance.profileId);

        return {
          kid: {
            id: balance.profileId,
            name: balance.profileName,
            avatar: balance.avatarEmoji,
          },
          days: balance.dailyEarnings.map(d => ({
            day: d.dayName,
            date: d.date,
            points: d.points,
            // TODO: Add completion status from chore_assignments if needed
          })),
          weeklyTotal: balance.weeklyEarnings,
          streak: streak,
        };
      })
    );

    return {
      week: this.getWeekLabel(timezone),
      kids: grids,
    };
  }
}
```

### TransactionService (Data Source - No Direct Integration)

**Key Insight**: Weekly Grid is **READ-ONLY**. It displays data created by TransactionService but never calls it directly.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LINEAGE                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WRITE PATH (TransactionService)           READ PATH (Weekly Grid)         │
│   ═══════════════════════════════           ═════════════════════════       │
│                                                                             │
│   Kid completes chore                       Grid API request                │
│         │                                          │                        │
│         ▼                                          ▼                        │
│   TransactionService                        BalanceService                  │
│   .recordChoreCompletion()                  .getFamilyBalances()            │
│         │                                          │                        │
│         ▼                                          ▼                        │
│   ┌─────────────────────┐                   ┌─────────────────────┐        │
│   │ choretracker.       │◀──── READS ──────│ Query transactions  │        │
│   │ chore_transactions  │                   │ + aggregate by day  │        │
│   └─────────────────────┘                   └─────────────────────┘        │
│         │                                          │                        │
│         ▼                                          ▼                        │
│   ┌─────────────────────┐                   ┌─────────────────────┐        │
│   │ family_profiles.    │◀──── READS ──────│ Return dailyEarnings│        │
│   │ current_points      │                   │ weeklyEarnings      │        │
│   └─────────────────────┘                   └─────────────────────┘        │
│         │                                          │                        │
│         ▼                                          ▼                        │
│   FamilyScore sync                          Weekly Grid display             │
│   (real-time leaderboard)                   (read-only visualization)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**TransactionService Methods (for reference):**

| Method | Transaction Type | Points |
|--------|------------------|--------|
| `recordChoreCompletion()` | `chore_completed` | + |
| `recordChoreReversal()` | `chore_reversed` | - |
| `recordBonusAward()` | `bonus_awarded` | + |
| `recordManualAdjustment()` | `adjustment` | ± |
| `recordRewardRedemption()` | `reward_redemption` | - |
| `recordCashOut()` | `cash_out` | - |
| `recordGoalContribution()` | `adjustment` | - |

**Weekly Grid reads the RESULT of these transactions via BalanceService queries.**

### Why No Direct TransactionService Integration

| Concern | Answer |
|---------|--------|
| Does Grid create transactions? | **NO** - read-only display |
| Does Grid modify balances? | **NO** - just visualizes |
| Does Grid need FamilyScore sync? | **NO** - handled by write path |
| What does Grid need? | Aggregated daily points (BalanceService provides this) |

### Rewards Marketplace (No Integration Needed)

Weekly Grid does NOT interact with rewards system:
- Grid shows **points earned** (from chores)
- Rewards shows **points spent** (on rewards)
- Separate concerns, no coupling needed

### Plan Gating (Existing)

```typescript
// REUSE: lib/plan-gate.ts
import { requireProPlan } from "../lib/plan-gate.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);

    // Existing Pro tier check
    const access = await requireProPlan(session.family_id);
    if (!access.allowed) {
      return Response.json({
        error: "Weekly Grid requires Pro plan",
        upgrade_url: "/pricing"
      }, { status: 403 });
    }

    // ... generate grid
  }
};
```

---

## Security Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY (NO SHORTCUTS)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ✅ IMPLEMENTED                                                            │
│   ══════════════                                                            │
│                                                                             │
│   • Session-based auth (no family_id in URL)                                │
│   • Family-scoped queries (WHERE family_id = session.family_id)             │
│   • Service role key for server routes                                      │
│   • Pro tier validation before data access                                  │
│                                                                             │
│   ❌ REJECTED PATTERNS                                                      │
│   ════════════════════                                                      │
│                                                                             │
│   • /api/grid/[family_id]/weekly → Exposes family ID                        │
│   • Client-side plan checks → Bypassable                                    │
│   • Caching without family scope → Data leakage risk                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **API Response** | < 100ms | Single indexed query |
| **Database Queries** | 1 | Aggregated JOIN |
| **Memory** | O(n) where n = kids × 7 | No full transaction scan |
| **Bundle Size** | < 5KB | Static HTML/CSS, minimal JS |

### Query Optimization

```sql
-- REQUIRED: Ensure index exists for O(1) lookups
-- choretracker.chore_transactions

CREATE INDEX IF NOT EXISTS idx_transactions_family_profile_date
ON choretracker.chore_transactions (family_id, profile_id, created_at);

-- With this index, the weekly grid query is O(log n) not O(n)
```

---

## Implementation Phases

### Phase 1: MVP (Pareto - 20% effort, 80% value)

| Task | Effort | Value |
|------|--------|-------|
| Single "Classic" template | Low | High - covers most use cases |
| JSONB preferences storage | Low | High - no migrations |
| Reuse existing services | Zero | High - no new code |
| Pro tier gating | Low | High - monetization ready |

### Phase 2: Enhancements (Only if data proves demand)

| Feature | Build If... |
|---------|-------------|
| Additional templates | > 50% users request variety |
| Export to PDF | > 30% users attempt print |
| Historical grids | > 20% users navigate to past weeks |

---

## Anti-Patterns to Avoid

```
❌ Creating new database tables (use JSONB)
❌ Building custom rewards logic (reuse existing)
❌ Multiple template designs upfront (start with 1)
❌ Complex client-side grid rendering (static HTML)
❌ Separate grid service duplicating transaction queries (compose existing)
❌ Exceeding 500 lines per module (split immediately)
❌ O(n × m) loops aggregating data (use SQL aggregation)
```

---

## Open Questions

> **For optimization phase (Pareto + GIN indexing):**
>
> 1. Should grid data be cached in JSONB for instant re-renders?
> 2. GIN vs BTREE for `settings` column queries?
> 3. Materialized view for weekly aggregates?

---

## References

### Core Architecture (MUST READ)
- [**JSONB Settings Architecture**](./20260114_JSONB_settings_architecture.md) - Storage pattern, GIN indexes, inheritance
- [**SQL Migration**](../sql/20260114_jsonb_settings.sql) - GIN indexes already deployed

### Related Features
- [Chore Templates Design](./chore-templates-design.md) - Related template architecture
- [Chore Templates JSONB Schema](./milestones/20260115_chore-templates-jsonb-schema.md) - Rotation config pattern
- [Plan Gating Implementation](./milestones/20260118_template_gating_gift_codes.md) - Pro tier system
- [Points Consistency](./troubleshooting/20260131_points_consistency_single_source_of_truth.md) - Transaction query patterns
- [Balance/Rewards Implementation](./milestones/20260125_balance_rewards_goals_implementation.md) - BalanceService patterns

---

## Appendix: Screenshot Reference

*Weekly Grid template design based on Amazon/Pinterest marketing visual patterns. Single template ("Classic") provides grid view of weekly chore completion per child with points, completion status, and streak indicators.*
