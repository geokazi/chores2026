# Expanded Activity Feed: Implementation Plan

**Date**: January 20, 2026
**Status**: Awaiting Approval
**Requested By**: User
**Scope**: Track all family activities + add to parent board

---

## Current State

### What's Tracked Now
- **Chore completion only** - queried from `chore_assignments` where status="completed"

### Where It's Displayed
- `/kid/dashboard` - via KidDashboard → LiveActivityFeed
- `/parent/dashboard` - via ParentDashboard → LiveActivityFeed
- `/parent/activity` - via ParentActivityTab (detailed view)
- **NOT on `/parent/my-chores`** (parent board)

### Current Data Source
```
ChoreService.getRecentActivity(familyId)
  → Query chore_assignments (status=completed)
  → Join chore_templates
  → Join family_profiles
  → Return last 10-50 activities
```

---

## Requested Additions

### New Activity Types to Track
| Activity | Example Display |
|----------|-----------------|
| **Chore created** | "Dad created chore 'Take out trash'" |
| **Event created** | "Mom created event 'Basketball practice'" |
| **Event edited** | "Dad updated 'Basketball practice'" |
| **Linked chore created** | "Mom added chore 'Pack bag' to 'Basketball practice'" |
| **Prep task added** | "Dad added 3 prep tasks to 'Slalom lunch'" |
| **Prep task completed** | "Julia completed 'Send invites'" |

### New Location
- Add Recent Activity to `/parent/my-chores` (parent board)

---

## Architecture Options

### Option A: New `family_activity` Table (Recommended)

**Create dedicated activity log table:**

```sql
CREATE TABLE choretracker.family_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id),
  actor_profile_id uuid REFERENCES public.family_profiles(id),
  activity_type text NOT NULL,
  -- Polymorphic references
  target_type text,  -- 'chore', 'event', 'prep_task', 'chore_assignment'
  target_id uuid,
  -- Display data (denormalized for fast reads)
  title text NOT NULL,
  subtitle text,
  icon text,
  points integer,
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_family_activity_family_id ON choretracker.family_activity(family_id);
CREATE INDEX idx_family_activity_created_at ON choretracker.family_activity(created_at DESC);
```

**Activity Types:**
```typescript
type ActivityType =
  | "chore_completed"      // Existing
  | "chore_created"        // New
  | "chore_assigned"       // New
  | "event_created"        // New
  | "event_updated"        // New
  | "event_deleted"        // New
  | "prep_task_added"      // New
  | "prep_task_completed"  // New
  | "linked_chore_created" // New
  | "point_adjustment"     // Existing (from chore_transactions)
```

**Pros:**
- Clean separation from point transactions
- Fast queries (single table)
- Flexible metadata for any activity type
- No changes to existing tables

**Cons:**
- New table requires migration
- Need to write to this table from multiple places

---

### Option B: Extend `chore_transactions` Table

**Add non-point activities to existing table:**

```sql
-- Add new column
ALTER TABLE choretracker.chore_transactions
ADD COLUMN activity_category text DEFAULT 'points';
-- Values: 'points', 'event', 'management'
```

**Pros:**
- Uses existing infrastructure
- No new table

**Cons:**
- Mixes point transactions with non-point activities
- `chore_transactions` semantically tied to points
- Could confuse FamilyScore sync

---

### Option C: Query Multiple Tables (No Schema Change)

**Combine data from multiple sources:**
```typescript
async getRecentActivity(familyId: string) {
  const [chores, events, prepTasks] = await Promise.all([
    this.getCompletedChores(familyId),
    this.getRecentEvents(familyId),
    this.getRecentPrepTaskChanges(familyId),
  ]);
  return mergeAndSort([...chores, ...events, ...prepTasks]);
}
```

**Pros:**
- No schema changes
- Works immediately

**Cons:**
- Complex multi-table queries
- Hard to track "who did what" for edits
- No audit trail for events/prep tasks (they don't track changes)

---

## Recommendation: Option A (New Table)

**Why:**
1. Clean architecture - activity feed is separate concern from point transactions
2. Audit trail - every action gets logged
3. Performance - single indexed table query
4. Flexibility - can add new activity types without schema changes
5. Pareto-friendly - ~100 lines of code, clear separation

---

## Implementation Plan

### Phase 1: Database + Activity Service (30 min)

1. **Create `family_activity` table** via Supabase SQL
2. **Create `ActivityService`** with methods:
   - `logActivity(activity: ActivityInput): Promise<void>`
   - `getRecentActivity(familyId: string, limit?: number): Promise<Activity[]>`

### Phase 2: Write Activity on Actions (45 min)

Add `activityService.logActivity()` calls to:

| Location | Activity Type |
|----------|---------------|
| `/api/chores/[id]/complete.ts` | `chore_completed` |
| `/api/chores/index.ts` (POST) | `chore_created` |
| `/api/events/index.ts` (POST) | `event_created` |
| `/api/events/[id].ts` (PATCH) | `event_updated` |
| `/api/events/[id].ts` (DELETE) | `event_deleted` |
| `/api/events/[id]/prep-task.ts` | `prep_task_completed` |
| `AddPrepTasksModal` save | `prep_task_added` |
| `AddChoreModal` with event | `linked_chore_created` |

### Phase 3: Update Activity Feed UI (20 min)

1. **Update `LiveActivityFeed`** to handle new activity types:
   - Different icons per activity type
   - Different text templates
   - Hide points for non-point activities

2. **Update `ChoreService.getRecentActivity()`** to query new table

### Phase 4: Add to Parent Board (10 min)

1. **Update `SecureParentDashboard.tsx`**:
   - Import `LiveActivityFeed`
   - Fetch `recentActivity` in page route
   - Pass to component

---

## Estimated Effort

| Phase | Task | Time |
|-------|------|------|
| 1 | Database + ActivityService | 30 min |
| 2 | Write activity on actions | 45 min |
| 3 | Update UI components | 20 min |
| 4 | Add to parent board | 10 min |
| **Total** | | **~2 hours** |

---

## Activity Display Examples

```
Recent Activity

📅 Dad created "Basketball practice"
   Today

✅ Cikũ completed "Clear dish-washer"
   +1 pts • 1h ago

📋 Mom added chore "Pack bag" to "Basketball"
   2h ago

☑️ Julia completed prep "Send invites"
   3h ago

📝 Dad added 3 prep tasks to "Slalom lunch"
   Yesterday
```

---

## Migration Safety

- **No changes to existing tables** - `chore_transactions` untouched
- **Backward compatible** - Old activity still works via existing query
- **Gradual rollout** - Can enable per activity type
- **Fallback** - If new table has issues, old query still works

---

## Questions for Approval

1. **Scope**: Should prep task completion by kids also show? (Currently only tracks toggle, not "who")

2. **Retention**: How long to keep activity? (Suggest: 90 days, or last 1000 per family)

3. **Real-time**: Should new activities push via WebSocket? (Current: no, refresh needed)

4. **Privacy**: Should kids see all family activity, or just their own?

---

## Approval Checklist

- [ ] Option A (new table) approved?
- [ ] Activity types list approved?
- [ ] Add to parent board approved?
- [ ] ~2 hour estimate acceptable?

---

**Ready to implement on approval.**
