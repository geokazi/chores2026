# Expanded Activity Feed: Implementation Decision

**Date**: January 20, 2026
**Status**: Implemented
**Decision**: Minimal table + JSONB payload (Option D)

---

## Context

The original activity feed only tracked chore completions by querying the `chore_assignments` table. Users requested tracking additional activity types:
- Chore creation (including linked chores to events)
- Event creation, update, deletion
- Prep task add/completion
- Point adjustments

---

## Options Considered

### Option A: Reuse `family_events.metadata` JSONB
- Store activity in existing column
- **Rejected**: Wrong semantic fit, unclear ownership

### Option B: Reuse `chore_transactions` table
- Add non-point activities to existing table
- **Rejected**: Mixes point transactions with activities, could confuse FamilyScore sync

### Option C: Query multiple tables (no schema change)
- Combine data from multiple sources at query time
- **Rejected**: Complex queries, no audit trail for edits

### Option D: New minimal table with JSONB payload (CHOSEN)
- Create `family_activity` table with JSONB `data` column
- **Selected**: Clean separation, flexible schema, follows existing patterns

---

## Implementation

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS choretracker.family_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  data jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_activity_lookup
ON choretracker.family_activity(family_id, created_at DESC);
```

### JSONB Payload Structure

```typescript
{
  v: 1,                    // Schema version
  type: ActivityType,      // Activity type enum
  actor_id: string,        // Who performed the action
  actor_name: string,      // Display name
  icon: string,            // Emoji icon
  title: string,           // Human-readable description
  target?: {               // What was affected
    type: string,
    id: string,
    name: string
  },
  points?: number,         // Points awarded (if applicable)
  meta?: Record<string, unknown>  // Additional data
}
```

### Activity Types

| Type | Icon | Description |
|------|------|-------------|
| `chore_completed` | ✅ | Kid/parent completed a chore |
| `chore_created` | 📋 | Parent created a chore |
| `event_created` | 📅 | Event added to calendar |
| `event_updated` | ✏️ | Event details modified |
| `event_deleted` | 🗑️ | Event removed |
| `prep_task_added` | 📝 | Prep tasks added to event |
| `prep_task_completed` | ☑️ | Prep task marked done |
| `linked_chore_created` | 🔗 | Chore linked to event |
| `point_adjustment` | ⚙️ | Points manually adjusted |

---

## Files Modified

### Service Layer
- `lib/services/activity-service.ts` - New ActivityService class

### API Endpoints
- `routes/api/chores/[chore_id]/complete.ts` - Log chore completion
- `routes/api/chores/create.ts` - Log chore/linked chore creation
- `routes/api/events.ts` - Log event creation
- `routes/api/events/[id].ts` - Log event update/delete, prep task add
- `routes/api/events/[id]/prep-task.ts` - Log prep task completion

### UI Components
- `islands/LiveActivityFeed.tsx` - Updated to handle new activity format
- `islands/ParentActivityTab.tsx` - Updated to handle new activity format
- `islands/SecureParentDashboard.tsx` - Added LiveActivityFeed to parent board

### Page Routes
- `routes/parent/my-chores.tsx` - Use ActivityService
- `routes/parent/dashboard.tsx` - Use ActivityService
- `routes/parent/activity.tsx` - Use ActivityService
- `routes/kid/dashboard.tsx` - Use ActivityService

### Database Migration
- `sql/20260120_family_activity_table.sql` - Table creation script

---

## Pareto Analysis

| Approach | Complexity | Value | Decision |
|----------|------------|-------|----------|
| No change | 0 | Baseline | |
| Query multiple tables | High | Medium | Rejected |
| Reuse existing table | Low | Low | Rejected |
| **New table + JSONB** | **Medium** | **High** | **Selected** |

**Key Benefits:**
1. Clean separation - activity feed is separate from point transactions
2. Flexible schema - new activity types without ALTER TABLE
3. Single table query - fast, indexed lookups
4. Follows existing patterns - consistent with codebase conventions

---

## Backward Compatibility

- Legacy chore activity still works via fallback rendering
- UI components detect format and render appropriately
- Gradual rollout - activities logged as they occur
- No migration of historical data required

---

## Future Considerations

1. **Retention Policy**: Consider cleanup job for activities older than 90 days
2. **Real-time Updates**: WebSocket broadcast of new activities
3. **Filtering**: UI controls to filter by activity type
4. **Privacy**: Kid-specific activity visibility controls
