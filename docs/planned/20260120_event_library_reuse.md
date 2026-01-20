# Event Library & Reuse Feature

**Status**: 📋 Planned
**Priority**: Low
**Estimated Effort**: 2-4 hours
**Date**: January 20, 2026

## Overview

Allow families to quickly recreate events they've used before, reducing data entry friction for recurring activities like weekly sports practices or music lessons.

## Problem Statement

Currently, parents must type event details from scratch each time they create an event, even for recurring activities like "Basketball practice" that happen weekly. This creates unnecessary friction.

## Proposed Solution: Per-Family Event History

### Option A: Per-Family Event History (Recommended)

Query family's past events (unique titles) and show as suggestions when creating new events.

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ Event Name *                        │
│ [Basketball practi_______________]  │
│                                     │
│ Recent:                             │
│ 🏀 Basketball practice (5x)         │ ← tap to autofill
│ 🎹 Piano lesson (3x)                │
│ 🩰 Dance class (2x)                 │
└─────────────────────────────────────┘
```

**Behavior:**
- Show family's past unique event titles as suggestions
- Display count of times each event was created
- Tap to autofill: title, emoji, and participants
- Works alongside manual entry (not blocking)

### Option B: Global Template Library (Not Recommended)

Pre-populated list of common events: "Soccer practice", "Basketball game", "Piano lesson", etc.

**Rejected because:**
- Maintenance burden (keeping templates relevant)
- Generic - doesn't match family's specific naming
- Over-engineering for this use case

### Option C: Hybrid (Future Consideration)

- Show family's past events first
- If no history, show global suggestions
- Global suggestions fade as family builds history

## Technical Implementation

### Database Query
```sql
SELECT DISTINCT
  title,
  metadata->>'emoji' as emoji,
  participants,
  COUNT(*) as usage_count
FROM choretracker.family_events
WHERE family_id = $1
  AND is_deleted = false
GROUP BY title, metadata->>'emoji', participants
ORDER BY usage_count DESC, MAX(created_at) DESC
LIMIT 10;
```

### API Changes
Add to `GET /api/events`:
- New query param: `?suggestions=true`
- Returns unique past events with usage count

### UI Changes
1. Fetch suggestions when AddEventModal opens
2. Display as clickable list below title input
3. On click: populate title, emoji, participants

### Estimated Code Changes
- `routes/api/events.ts`: ~15 lines (query logic)
- `islands/AddEventModal.tsx`: ~30 lines (suggestions UI)

## Benefits

| Benefit | Impact |
|---------|--------|
| Reduced typing | Parents save 10-20 seconds per event |
| Consistency | Family uses same naming conventions |
| Zero maintenance | Self-populating from real usage |
| Personalized | "Ciku's driving lesson" vs generic |

## Considerations

### Cold Start
New families have no history - they just type manually (current behavior). Not a blocker since it's additive improvement.

### Privacy
Only shows family's own past events - no cross-family data exposure.

### Performance
Query should be fast (<50ms) since it's just aggregating the family's own events.

## Decision

**Recommendation: Option A (Per-Family History)**

**Rationale:**
1. Zero maintenance - self-populating from real usage
2. Pareto efficient - 80% value with simple implementation
3. Personalized to each family's actual events
4. Cold start is acceptable (current behavior for new families)

## Next Steps

1. Implement when user feedback indicates friction with event creation
2. Consider combining with recurrence patterns in future (Phase 2)

## Related Documents

- [Events & Prep Tasks Implementation](../milestones/20260120_events_prep_tasks_implementation.md) - Completed feature
- [Original Planning Doc](../milestones/20260119_events_calendar_original_plan.md) - Design decisions
- [Hybrid Implementation Guide](../milestones/20260119_events_calendar_rev2_plan.md) - Technical approach
- [Business Requirements - Epic 3](../business-requirements.md#epic-3-events-calendar-integration) - Events user stories

---

*Created: January 20, 2026*
*Author: Claude Code AI Assistant*
