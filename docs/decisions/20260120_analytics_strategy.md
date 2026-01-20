# Analytics Strategy Decision

**Date**: January 20, 2026
**Status**: Decided
**Decision**: Use external analytics (Plausible/Umami) + existing data; don't build custom analytics into FamilyScore

## Context

Question arose: Can we leverage FamilyScore for tracking user clicks and analytics, similar to how we use it for leaderboards?

### Current FamilyScore Integration

| Component | Purpose | Data Sent |
|-----------|---------|-----------|
| `TransactionService.notifyFamilyScore()` | Real-time point sync | Points, user_id, family_id, metadata |
| `/api/familyscore/sync` | Leaderboard reconciliation | Family state, sync_mode |
| `/api/familyscore/live/[family_id]` | WebSocket proxy | Real-time broadcasts |
| `FamilyScoreRegistrationService` | Auto-register families | Member info, initial points |

FamilyScore already receives event-like metadata with every transaction:
```typescript
metadata: {
  source: "chores2026_transaction_service",
  transaction_type: request.transactionType,
  timestamp: new Date().toISOString(),
  chore_assignment_id: "...",
}
```

## Options Considered

### Option A: Piggyback on `/api/points/award`

Track events as 0-point "transactions":
```typescript
await fetch(`${familyScoreApiUrl}/api/points/award`, {
  body: JSON.stringify({
    points: 0,  // No points, just tracking
    reason: "analytics_event",
    metadata: { event_type: "page_view", page: "/parent/events" },
  }),
});
```

**Pros:** Zero FamilyScore changes, already non-blocking
**Cons:** Pollutes transaction history, no aggregation capabilities, mixing concerns

### Option B: New FamilyScore Endpoint `/api/events/track`

**Would require:**
- New endpoint in FamilyScore (Elixir/Phoenix)
- New events table
- Aggregation queries
- Reporting UI

**Effort:** 2-4 days on separate project
**Verdict:** Overkill - building analytics into a gamification engine

### Option C: External Analytics Tool ✅ **Selected**

**Tools considered:**
- Plausible ($9/mo or self-hosted free) - privacy-focused
- Umami (open source, self-hosted free)
- PostHog (free tier: 1M events/mo)

**Effort:** 30 minutes (add script tag)
**Data:** Page views, device types, referrers, geography

### Option D: Supabase JSONB Table

```sql
CREATE TABLE choretracker.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  profile_id UUID,
  event_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort:** 1-2 hours
**When to use:** If we need custom event tracking beyond page views

## Why FamilyScore Is Wrong for Analytics

| Concern | FamilyScore's Job | Analytics' Job |
|---------|------------------|----------------|
| Purpose | Gamification | Usage insights |
| Data model | Points, leaderboards | Events, funnels |
| Query patterns | "Who's winning?" | "What's popular?" |
| Retention | Per-user points | Aggregated trends |
| Privacy | User-identifiable | Often anonymized |

**Principle:** Use the right tool for the job. Mixing concerns creates technical debt.

## What Data Do We Actually Need?

| Question | Best Source | Status |
|----------|-------------|--------|
| Device breakdown | External analytics | Add Plausible |
| Page popularity | External analytics | Add Plausible |
| Feature usage | Transaction metadata | **Already tracked** |
| User retention | Supabase `last_login` | **Already available** |
| Chore completion rates | `chore_transactions` | **Already tracked** |
| Template popularity | `chore_assignments` | **Already tracked** |
| Feature requests | Google Form | **Already decided** |

**Key insight:** We're already tracking the important behavioral data via existing tables.

## Decision

### Use External Analytics for Page-Level Data

1. **Add Plausible or Umami** for:
   - Page views
   - Device/browser breakdown
   - Geographic distribution
   - Referral sources

2. **Leverage existing data** for feature analytics:
   - `chore_transactions` → completion rates, popular times
   - `chore_assignments` → template popularity
   - `family_events` → event feature adoption

3. **Enrich transaction metadata** if needed:
   ```typescript
   // Already possible - just add fields to existing transactions
   metadata: {
     source: "chores2026",
     ui_context: {
       page: "/parent/events",
       action: "create_event",
     },
   }
   ```

### Don't Build

- Custom analytics endpoint in FamilyScore
- Separate analytics table (unless external tools insufficient)
- Complex event tracking infrastructure

## Implementation

### Now (30 minutes)
- [ ] Choose analytics tool (Plausible recommended for privacy)
- [ ] Add script tag to `_app.tsx` or layout

### If Needed Later
- Query existing tables for feature usage reports
- Enrich transaction metadata with UI context
- Add JSONB events table only if external analytics insufficient

## Relationship to Other Decisions

| Decision | Approach | Rationale |
|----------|----------|-----------|
| [Feedback Strategy](./20260120_feedback_strategy.md) | Google Form now | Direct outreach at early stage |
| [Tablet/Desktop Styling](../index.md) | Deferred | Wait for device analytics |
| **Analytics Strategy** | External tool | Right tool for the job |

All three decisions follow the same principle: **Ship simple, measure, iterate with data.**

## Data Sources Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Analytics Stack                       │
├─────────────────────────────────────────────────────────┤
│  PAGE ANALYTICS          │  FEATURE ANALYTICS           │
│  ─────────────────────── │  ─────────────────────────── │
│  Plausible/Umami         │  Existing Supabase Tables    │
│  • Page views            │  • chore_transactions        │
│  • Devices               │  • chore_assignments         │
│  • Geography             │  • family_events             │
│  • Referrers             │  • family_profiles           │
├─────────────────────────────────────────────────────────┤
│  USER FEEDBACK           │  REAL-TIME GAMIFICATION      │
│  ─────────────────────── │  ─────────────────────────── │
│  Google Form             │  FamilyScore (unchanged)     │
│  • Feature requests      │  • Points & leaderboards     │
│  • Bug reports           │  • WebSocket broadcasts      │
│  • General feedback      │  • Transaction sync          │
└─────────────────────────────────────────────────────────┘
```

---

**Principle Applied:** Use specialized tools for specialized jobs. FamilyScore excels at gamification; analytics tools excel at analytics. Don't conflate them.

*Decision made: January 20, 2026*
