# Demand Signals Dashboard

**Date**: February 10, 2026
**Status**: ✅ Implemented
**Location**: `/admin/demand-signals`

---

## Overview

Staff-only dashboard for viewing aggregated demand signals to guide product decisions. Consolidates data from multiple tracking sources into a single view.

---

## Access

- **URL**: `https://choregami.app/admin/demand-signals`
- **Access**: Staff-only (email-based validation)
- **Security**: 2-minute idle timeout, session authentication required

---

## Data Sources

### 1. Usage Tracker Metrics (`family_profiles.preferences.notifications.usage`)

Tracked via `incrementUsage(profileId, metric)` function:

| Metric | Description | Tracked When |
|--------|-------------|--------------|
| `ics` | Calendar exports | Event "Add to Calendar" clicked |
| `badges` | Badge interactions | In-app badge taps |
| `digests` | Email digests | Weekly digest emails sent |
| `prep_shop` | Shopping tasks created | Prep task saved with type="shop" |
| `prep_export` | Shopping exports | "Export Shopping" button clicked |

**Storage**: JSONB in `family_profiles.preferences.notifications.usage`

```json
{
  "total_ics_sent": 5,
  "this_month_ics": 2,
  "total_prep_shop_sent": 3,
  "total_prep_export_sent": 1,
  "cycle_start": "2026-02-01T00:00:00.000Z"
}
```

### 2. Demand Signals Table (`public.demand_signals`)

Landing page interactions and assessment quiz completions:

| Feature | Description |
|---------|-------------|
| `assessment_complete` | Quiz completion with persona type |
| `landing_cta_click` | CTA button clicks |
| `theme_toggle` | Theme switcher usage |

### 3. Feature Demand Logs (`choretracker.family_activity`)

In-app clicks on unavailable features:

| Feature | Description |
|---------|-------------|
| `sms_invite` | SMS invite button clicks (disabled due to 10DLC) |
| `referral_share` | Share button clicks |

---

## Files Created

```
routes/
├── admin/
│   └── demand-signals.tsx      # Staff-only page route
└── api/
    └── admin/
        └── demand-signals.ts   # API endpoint

islands/
└── DemandSignalsAdmin.tsx      # Interactive dashboard component
```

---

## API Endpoint

### `GET /api/admin/demand-signals`

**Authentication**: Required (staff email)

**Response**:
```json
{
  "overview": {
    "total_families": 150,
    "total_profiles": 450
  },
  "usage_metrics": [
    {
      "metric": "prep_export",
      "total_users": 12,
      "total_events": 45,
      "last_7_days": 0,
      "last_30_days": 0
    }
  ],
  "demand_signals": [
    {
      "feature": "assessment_complete",
      "total": 89,
      "last7": 15,
      "last30": 42
    }
  ],
  "feature_demand": [
    {
      "feature": "sms_invite",
      "total": 23,
      "last7": 5,
      "last30": 18
    }
  ],
  "last_updated": "2026-02-10T15:30:00.000Z"
}
```

---

## Decision Thresholds

Use these thresholds to guide feature investment:

| Signal | Threshold | Action |
|--------|-----------|--------|
| `prep_export` > 15% | High demand | Build `/parent/shopping` aggregated view |
| `prep_export` < 5% | Low demand | Current clipboard export is sufficient |
| `sms_invite` clicks | Validates SMS | Proceed with 10DLC registration when approved |
| `ics` usage | Calendar integration | Consider calendar sync features |

---

## Adding New Metrics

### 1. Add to Analytics Endpoint

Edit `/routes/api/analytics/event.ts`:

```typescript
const allowedMetrics = ["badges", "ics", "digests", "prep_shop", "prep_export", "new_metric"];
```

### 2. Track in UI

```typescript
// Fire-and-forget tracking
fetch("/api/analytics/event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ metric: "new_metric" }),
}).catch(() => {});
```

### 3. Add Label in Dashboard

Edit `islands/DemandSignalsAdmin.tsx`:

```typescript
const METRIC_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  // ...existing
  new_metric: { label: "New Feature", description: "Description here", icon: "🆕" },
};
```

---

## Related Documentation

- [Analytics & Demand Tracking](./20260130_analytics_tracking.md) - Comprehensive analytics guide
- [Parent Lists Feature Analysis](../research/20260210_parent_lists_feature_analysis.md) - Example of using demand signals
- [Admin Page Access Control](../decisions/20260206_admin_page_access_control.md) - Staff access pattern

---

**Author**: Development Team
**Created**: February 10, 2026
