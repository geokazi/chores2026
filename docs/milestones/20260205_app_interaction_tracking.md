# App Interaction Tracking (Demand Signals v3)

**Date**: February 5, 2026
**Status**: Complete
**Author**: Claude Code AI
**Related**: [Landing Page Demand Capture](./20260201_landing_page_demand_capture.md)

## Overview

Extended the existing demand signal tracking system to capture authenticated user interactions across the app. This brings parity with landing page tracking, enabling product analytics for feature adoption and user engagement patterns.

## Key Features

### 1. Tracking Utility (`lib/utils/track-interaction.ts`)

**Lightweight, non-blocking tracking** (~40 lines):
- Reuses existing `/api/demand-signal` endpoint
- Session ID persistence (same pattern as landing page)
- Navigator context collection (language, platform, screen, timezone)
- Fire-and-forget pattern (never blocks UI)

```typescript
import { trackInteraction } from "../lib/utils/track-interaction.ts";

// Simple usage
trackInteraction("payout_click");

// With metadata
trackInteraction("reward_tab", { tab: "catalog" });
```

### 2. Extended Demand Signal API

**v3 Schema** (backwards compatible with v1/v2):

```json
{
  "v": 3,
  "feature": "app_interaction",
  "session_id": "uuid",
  "navigator": { "language", "platform", "screen", "timezone" },
  "interaction": {
    "action": "nav_open_left",
    "page": "dashboard",
    "ts": 1707148800000
  }
}
```

### 3. Tracked Interactions

| Component | Interactions Tracked |
|-----------|---------------------|
| **AppHeader** | `nav_open_left`, `nav_open_right`, `theme_change`, `user_switch`, `logout` |
| **ParentRewards** | `reward_tab` (pending/catalog/goals), `goal_boost_click` |
| **BalanceCards** | `payout_click` |
| **PinEntryModal** | `pin_attempt` (success/fail, type: kid) |
| **FamilySettings** | `setting_toggle` (confetti, kids_events, weekly_digest, daily_digest) |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `lib/utils/track-interaction.ts` | **New** - tracking utility | ~40 |
| `routes/api/demand-signal.ts` | Accept `app_interaction` feature + v3 interaction data | +6 |
| `islands/AppHeader.tsx` | Nav & theme tracking | +8 |
| `islands/ParentRewards.tsx` | Tab & boost tracking | +5 |
| `islands/BalanceCards.tsx` | Payout tracking | +3 |
| `islands/PinEntryModal.tsx` | PIN attempt tracking | +4 |
| `islands/FamilySettings.tsx` | Setting toggle tracking | +6 |

**Total: ~70 new lines** (well under 500 limit)

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Reuse demand_signals table** | No schema changes, JSONB flexibility handles v3 |
| **Fire-and-forget tracking** | Never blocks UI, failures are silent |
| **Session ID per tab** | Correlate interactions within a session |
| **No sensitive data** | No PINs, no point values in tracking (except aggregate) |
| **Minimal metadata** | Only track what's needed for product insights |

## Analytics Queries

### Feature Adoption by Week
```sql
SELECT
  date_trunc('week', created_at) AS week,
  data->'interaction'->>'action' AS action,
  COUNT(*) AS count
FROM demand_signals
WHERE data->>'feature' = 'app_interaction'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

### Navigation Patterns
```sql
SELECT
  data->'interaction'->>'action' AS action,
  data->'interaction'->>'page' AS from_page,
  COUNT(*) AS count
FROM demand_signals
WHERE data->>'feature' = 'app_interaction'
  AND data->'interaction'->>'action' LIKE 'nav_%'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

### Setting Toggle Popularity
```sql
SELECT
  data->'interaction'->>'setting' AS setting,
  data->'interaction'->>'enabled' AS enabled,
  COUNT(*) AS count
FROM demand_signals
WHERE data->>'feature' = 'app_interaction'
  AND data->'interaction'->>'action' = 'setting_toggle'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

### PIN Success Rate
```sql
SELECT
  data->'interaction'->>'success' AS success,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM demand_signals
WHERE data->>'feature' = 'app_interaction'
  AND data->'interaction'->>'action' = 'pin_attempt'
GROUP BY 1;
```

## Pareto Analysis

**20% effort, 80% value**:
- Reused existing infrastructure (endpoint, table, patterns)
- ~70 lines of code for comprehensive interaction tracking
- No new dependencies or schema migrations
- Silent failure mode ensures zero impact on user experience

## Security Notes

- No sensitive data tracked (no PINs, no personal info)
- Only action names and minimal context (page, tab, enabled state)
- Session ID is ephemeral (sessionStorage, cleared on tab close)
- IP anonymization inherited from v1/v2 endpoint

## Cross-References

- **Landing page tracking**: [20260201_landing_page_demand_capture.md](./20260201_landing_page_demand_capture.md)
- **Demand signal endpoint**: `routes/api/demand-signal.ts`
- **SQL schema docs**: `sql/20260201_demand_signals_v2_assessment.sql`

---

**Implementation Time**: ~30 minutes
**Effort Level**: Small (Pareto-optimized)
**Risk Level**: Low (non-blocking, silent fail)
