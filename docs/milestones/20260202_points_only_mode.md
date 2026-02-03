# Points-Only Mode

**Date**: February 2, 2026
**Status**: Implemented
**Effort**: ~100 lines (Pareto: 20% effort for 80% value)

## Overview

Family-level setting to hide all dollar ($) displays throughout the app. For parents who prefer points-based rewards without monetary conversion.

## User Story

> As a parent, I want to use points without dollar conversion, so my kids focus on earning points rather than thinking about money.

## Storage

**Location**: `families.settings.apps.choregami.points_only_mode`

```jsonb
{
  "apps": {
    "choregami": {
      "points_per_dollar": 1,
      "children_pins_enabled": true,
      "points_only_mode": false  // ← NEW
    }
  }
}
```

**No database migration required** - uses existing JSONB column.

## Implementation

### 1. Session Exposure

**File**: `lib/auth/session.ts`

```typescript
family: {
  // existing fields...
  points_only_mode: choregamiSettings.points_only_mode ?? false,
}
```

### 2. API Endpoint

**File**: `routes/api/settings/points-only-mode.ts`

- POST with `{ enabled: boolean }`
- Validates session
- Merges into JSONB settings
- Returns success/error

### 3. Settings Toggle

**File**: `islands/settings/PointsOnlySection.tsx`

Simple toggle switch in Family Settings.

### 4. Conditional Rendering

| File | Element | Points Mode OFF | Points Mode ON |
|------|---------|-----------------|----------------|
| `BalanceCards.tsx` | Dollar display | `116 pts ($116.00)` | `116 pts` |
| `BalanceCards.tsx` | Pay Out button | Visible | Hidden |
| `FamilyReports.tsx` | Goal progress | `$3 of $10` | `3 of 10 pts` |
| `FamilyReports.tsx` | Savings | `($116.00)` | Hidden |
| `FamilyReports.tsx` | Goal message | `+$2!` | `+2 pts!` |
| `WeeklyGoalSection.tsx` | Input labels | `$ 20 /week` | `20 pts /week` |

## UX Behavior

When **Points-Only Mode** is enabled:

1. All `$X.XX` displays are hidden
2. Goals show points instead of dollars
3. "Pay Out" buttons are hidden (no cash conversion)
4. Settings inputs show "pts" instead of "$"

## Files Modified

- `lib/auth/session.ts` - Expose setting in family session
- `routes/api/settings/points-only-mode.ts` - NEW API endpoint
- `islands/settings/PointsOnlySection.tsx` - NEW toggle component
- `islands/FamilySettings.tsx` - Include new section (#5 in settings order)
- `islands/BalanceCards.tsx` - Conditional $ display + hide Pay Out
- `islands/FamilyReports.tsx` - Conditional $ display in goals/savings
- `islands/settings/WeeklyGoalSection.tsx` - Conditional $ labels
- `routes/parent/balances.tsx` - Pass pointsOnlyMode to island
- `routes/reports.tsx` - Pass pointsOnlyMode to island

## Cross-References

- See [Balance & Rewards Implementation](./20260125_balance_rewards_goals_implementation.md) for points system
- See [Collaborative Family Goals](./20260114_collaborative_family_goals_bonus_system.md) for goal settings pattern
- See [JSONB Settings Schema](./20260115_chore-templates-jsonb-schema.md) for settings structure

## Testing

1. Enable Points-Only Mode in Settings
2. Verify $ hidden on Balances page
3. Verify $ hidden on Reports page
4. Verify "Pay Out" button hidden
5. Verify goal inputs show "pts" not "$"
6. Disable mode - verify $ returns

## Rollback

Setting defaults to `false`. No data migration needed. Simply set `points_only_mode: false` to restore dollar displays.
