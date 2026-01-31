# ChoreGami Analytics & Demand Tracking

**Date**: January 30, 2026
**Status**: Active
**Purpose**: Comprehensive guide to all analytics and demand signal tracking in ChoreGami

---

## Overview

ChoreGami uses lightweight, privacy-respecting analytics to:
1. **Measure feature adoption** - Which features are users actually using?
2. **Track demand signals** - Which unavailable features do users want?
3. **Optimize UX funnels** - Where are users dropping off?
4. **Prioritize development** - Data-driven feature prioritization

All analytics are stored in `choretracker.family_activity` using JSONB for flexibility.

---

## Analytics Endpoints

### 1. Feature Demand Tracking

**Endpoint**: `POST /api/analytics/feature-demand`

**Purpose**: Track user attempts to use features (available or unavailable)

**File**: `routes/api/analytics/feature-demand.ts`

**Allowed Features**:
```typescript
const ALLOWED_FEATURES = [
  // SMS invites (pending A2P 10DLC)
  "sms_invite",
  // Referral tracking
  "referral_card_view",
  "referral_copy",
  "referral_share",
  "referral_share_complete",
  // Redeem/upgrade tracking
  "redeem_click",
  "redeem_attempt",
  "redeem_success",
  "redeem_failure",
];
```

**Usage**:
```typescript
fetch("/api/analytics/feature-demand", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ feature: "referral_copy" }),
});
```

**Storage Format**:
```json
{
  "v": 1,
  "icon": "📊",
  "type": "point_adjustment",
  "title": "Requested: referral_copy",
  "actor_id": "profile-uuid",
  "actor_name": "Mom",
  "meta": {
    "demand_feature": "referral_copy"
  }
}
```

---

### 2. Usage Event Tracking

**Endpoint**: `POST /api/analytics/event`

**Purpose**: Track lightweight usage metrics (badge taps, feature usage)

**File**: `routes/api/analytics/event.ts`

**Allowed Metrics**:
- `badges` - User tapped notification badge
- `ics` - User downloaded calendar ICS file
- `digests` - User interacted with email digest

**Storage**: Increments counters in `family_profiles.preferences.usage`

---

## Tracked Features

### SMS Invite Demand

**Context**: SMS invites are disabled pending A2P 10DLC carrier registration

**Event**: `sms_invite`

**Triggered**: When user selects "Phone" channel for family invite

**Purpose**: Measure demand to justify A2P registration effort

**Query File**: `sql/queries/sms_invite_demand.sql`

**Related Docs**: [SMS Invite Demand Tracking](../decisions/20260128_sms_invite_demand_tracking.md)

---

### Referral Tracking

**Context**: "Share ChoreGami" referral feature

**Route**: `/share` (accessible to all logged-in family members - no PIN required)

**Events**:

| Event | Trigger | Purpose |
|-------|---------|---------|
| `referral_card_view` | Card appears on screen (once per session) | Measure awareness |
| `referral_copy` | User clicks copy button | Intent to share |
| `referral_share` | User clicks share button | Strong intent |
| `referral_share_complete` | Web Share API completes successfully | Actual share |

**Implementation**: `islands/ShareReferralCard.tsx` (rendered in `routes/share.tsx`)

**Funnel Analysis**:
```
View → Copy → Share → Share Complete
100%    ?%     ?%       ?%
```

---

### Redeem/Upgrade Tracking

**Context**: Gift code redemption and upgrade flow

**Events**:

| Event | Trigger | Purpose |
|-------|---------|---------|
| `redeem_click` | User clicks "Redeem gift code" link | Upgrade interest |
| `redeem_attempt` | User submits a code | Conversion attempt |
| `redeem_success` | Valid code redeemed | Conversion |
| `redeem_failure` | Invalid code submitted | UX friction signal |

**Implementation**:
- `islands/TemplateSelector.tsx` - redeem_click
- `islands/RedeemForm.tsx` - attempt/success/failure

**Query File**: `sql/queries/referral_redeem_demand.sql`

---

## SQL Query Files

### 1. SMS Invite Demand
**File**: `sql/queries/sms_invite_demand.sql`

Queries:
- All SMS attempts with user contact info
- Unique users who requested SMS
- Summary stats (total attempts, unique families, unique users)

### 2. Referral & Redeem Demand
**File**: `sql/queries/referral_redeem_demand.sql`

Queries:
- Overview of all referral/redeem events
- Referral funnel analysis (view → copy → share)
- Redeem funnel analysis (click → attempt → success/failure)
- Daily trends
- Top referral sharers
- Redeem success rate

---

## Quick Reference Queries

### All Demand Signals (Overview)
```sql
SELECT
  data->'meta'->>'demand_feature' as feature,
  COUNT(*) as count,
  COUNT(DISTINCT family_id) as unique_families
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' IS NOT NULL
GROUP BY data->'meta'->>'demand_feature'
ORDER BY count DESC;
```

### Last 24 Hours Activity
```sql
SELECT
  data->'meta'->>'demand_feature' as feature,
  COUNT(*) as count
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY data->'meta'->>'demand_feature'
ORDER BY count DESC;
```

### Specific Feature Count
```sql
SELECT COUNT(*) FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' = 'referral_copy';
```

---

## Adding New Analytics

### Step 1: Add to Allowed Features
```typescript
// routes/api/analytics/feature-demand.ts
const ALLOWED_FEATURES = [
  // ... existing
  "new_feature_name",
];
```

### Step 2: Add Tracking Call
```typescript
// In your component
fetch("/api/analytics/feature-demand", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ feature: "new_feature_name" }),
}).catch(() => {}); // Non-blocking
```

### Step 3: Create SQL Query
Add queries to `sql/queries/` for analysis.

### Step 4: Update This Document
Add the new feature to the "Tracked Features" section.

---

## Privacy Considerations

- **No PII in analytics**: Only profile IDs, no emails/phones in tracking data
- **Family-scoped**: All analytics tied to family_id for data isolation
- **Session deduplication**: Some events (like card views) only fire once per session
- **Non-blocking**: All tracking calls use `.catch(() => {})` - failures don't break UX

---

## Related Documents

- [SMS Invite Demand Tracking](../decisions/20260128_sms_invite_demand_tracking.md) - Decision doc
- [Referral Share Feature](../planned/20260130_referral_share_feature.md) - Feature spec
- [Business Requirements](../business-requirements.md) - Product requirements
- [Analytics Strategy](../decisions/20260120_analytics_strategy.md) - Overall analytics approach

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-30 | Added referral tracking (view, copy, share, share_complete) |
| 2026-01-30 | Added redeem tracking (click, attempt, success, failure) |
| 2026-01-28 | Initial SMS invite demand tracking |

---

*Maintained by: Development Team*
*Last Updated: January 30, 2026*
