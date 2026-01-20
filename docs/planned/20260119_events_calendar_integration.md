# Events/Calendar Integration Plan

**Document Created**: January 19, 2026
**Status**: APPROVED FOR IMPLEMENTATION
**Estimated Effort**: 1-2 hours (~50 new lines)
**Pareto Score**: 95/100

## Executive Summary

Integrate calendar events with chore assignments by reusing the existing `choretracker.family_events` table and API from MealPlanner. This enables families to group chores by events (e.g., "Soccer Practice" with linked chores "Pack soccer bag" and "Wash uniform").

**Key Insight**: Events are grouping tags for existing chores, not a parallel task system.

---

## Existing Infrastructure (From MealPlanner)

### Table: `choretracker.family_events`

```sql
choretracker.family_events (
  id UUID PK DEFAULT gen_random_uuid(),
  family_id UUID FK NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  schedule_data JSONB DEFAULT '{}',    -- {start_time, end_time, all_day}
  participants JSONB DEFAULT '[]',      -- profile IDs array
  location_data JSONB DEFAULT '{}',     -- flexible location info
  recurrence_data JSONB DEFAULT '{}',   -- recurring event patterns
  metadata JSONB DEFAULT '{}',          -- extensible attributes
  created_by_profile_id UUID FK,
  is_deleted BOOLEAN DEFAULT false,     -- soft delete
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
)
```

### Existing API Endpoints

| Endpoint | Method | Description | Lines |
|----------|--------|-------------|-------|
| `/api/events` | GET | List family events | ~50 |
| `/api/events` | POST | Create event (single or multi-day) | ~150 |
| `/api/events/[id]` | PUT | Update event | ~200 |
| `/api/events/[id]` | DELETE | Soft delete event | ~50 |

**Total existing code**: ~450 lines (production-tested)

### API Request/Response Examples

#### GET /api/events
```typescript
// Response
{
  "events": [
    {
      "id": "uuid",
      "family_id": "uuid",
      "title": "Soccer Practice",
      "event_date": "2026-01-21",
      "schedule_data": { "start_time": "17:00", "end_time": "18:30" },
      "participants": ["profile-uuid-1"],
      "location_data": { "name": "Soccer Field" },
      "recurrence_data": {},
      "metadata": { "source_app": "chores2026" },
      "created_by_profile_id": "uuid",
      "is_deleted": false,
      "created_at": "2026-01-19T10:00:00Z"
    }
  ]
}
```

#### POST /api/events
```typescript
// Request
{
  "title": "Soccer Practice",
  "event_date": "2026-01-21",
  "schedule_data": { "start_time": "17:00", "end_time": "18:30" },
  "participants": ["profile-uuid-1"],
  "location_data": { "name": "Soccer Field", "address": "123 Main St" },
  "is_multi_day": false,  // If true, also send end_date
  "end_date": null        // For multi-day events
}

// Response
{
  "event": { ... },       // Created event
  "events": [ ... ]       // Array (for multi-day creates multiple)
}
```

#### PUT /api/events/[id]
```typescript
// Request - same format as POST
// Response - same format as POST
```

#### DELETE /api/events/[id]
```typescript
// Response
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### Features Already Built

| Feature | Status | Implementation |
|---------|--------|----------------|
| Family-scoped access | Done | `eq("family_id", familyId)` |
| Soft delete | Done | `is_deleted` flag |
| Multi-day events | Done | Metadata linking with day index |
| JSONB flexibility | Done | schedule, location, recurrence, metadata |
| Participant tracking | Done | Array of profile IDs |
| Auth middleware | Done | `ctx.state.isAuthenticated` |

---

## Pareto Analysis

### Principles Evaluation

| Principle | Score | Reasoning |
|-----------|-------|-----------|
| 20% effort / 80% value | 95% | 0 new tables, ~50 lines new code |
| No code bloat | 100% | Reuse existing 450 lines |
| Reuse existing code | 100% | Table + full CRUD exists |
| Simplicity | 95% | Events = grouping tags |
| Low cognitive load | 95% | Familiar calendar metaphor |
| <500 lines per module | 100% | Each file ~250-300 lines |
| Future flexibility | 100% | JSONB handles unknowns |

### Effort Comparison

| Approach | New Tables | New Columns | New Code | Time |
|----------|------------|-------------|----------|------|
| Build from scratch | 1 | 1 | ~500 lines | 2 days |
| **Reuse MealPlanner** | **0** | **1** | **~50 lines** | **1-2 hours** |

---

## Implementation Plan

### Phase 1: Database Migration (5 minutes)

```sql
-- Link chore assignments to events
ALTER TABLE choretracker.chore_assignments
  ADD COLUMN family_event_id UUID REFERENCES choretracker.family_events(id);

-- Index for efficient queries
CREATE INDEX idx_assignments_family_event
  ON choretracker.chore_assignments(family_event_id)
  WHERE family_event_id IS NOT NULL;
```

**File**: `sql/20260119_event_assignment_link.sql`

### Phase 2: Copy Events API (10 minutes)

Copy from MealPlanner to chores2026:
- `routes/api/events/index.ts` → GET (list), POST (create)
- `routes/api/events/[id].ts` → PUT (update), DELETE (soft delete)

**Modifications required**:
1. Update import paths for `AppState` middleware
2. Change `source_app: "mealplanner"` → `"chores2026"` in metadata
3. Remove debug console.log statements (lines 11-13 in index.ts)
4. Remove database connection test code (lines 213-228 in index.ts)

### Phase 3: UI Integration (~35 lines)

**Chore Assignment Form Enhancement**:
```typescript
// Add to islands/ChoreAssignmentForm.tsx or similar

// Fetch available events for dropdown
const { data: events } = await fetch("/api/events").then(r => r.json());

// Add event selector to form
<label>Link to Event (optional)</label>
<select
  value={selectedEventId}
  onChange={e => setSelectedEventId(e.target.value)}
>
  <option value="">No event</option>
  {events?.map(event => (
    <option key={event.id} value={event.id}>
      {event.title} - {event.event_date}
    </option>
  ))}
</select>
```

---

## File Structure After Implementation

```
routes/api/events/
├── index.ts              # GET (list), POST (create) - copied from MealPlanner
└── [id].ts               # PUT, DELETE - copied from MealPlanner

sql/
└── 20260119_event_assignment_link.sql  # NEW: FK migration (~5 lines)
```

---

## JSONB Schema Reference

### schedule_data
```jsonc
{
  "start_time": "17:00",
  "end_time": "18:30",
  "all_day": false
}
```

### participants
```jsonc
["profile-uuid-1", "profile-uuid-2"]
```

### location_data
```jsonc
{
  "name": "Soccer Field",
  "address": "123 Main St",
  "notes": "Park in lot B"
}
```

### recurrence_data (future use)
```jsonc
{
  "frequency": "weekly",
  "day_of_week": "tuesday",
  "until": "2026-06-01"
}
```

### metadata
```jsonc
{
  "source_app": "chores2026",
  "form_version": "1.0",
  "multi_day_event": false,
  "created_via": "event_form"
}
```

---

## What We Get For Free

1. **Multi-day events** - Vacation prep, camp week, holiday visits
2. **Participant tracking** - Which kids are involved
3. **Location data** - Address, directions, notes
4. **Recurrence structure** - Ready for weekly events (future)
5. **Soft delete** - Undo support
6. **Family isolation** - Security built-in
7. **Production-tested** - Already running in MealPlanner

---

## Future Enhancements (Not in Scope)

| Feature | Effort | Trigger |
|---------|--------|---------|
| Recurring events | Medium | User demand |
| Auto-create chores | Medium | Paid tier feature |
| Event templates | Low | After recurring events |
| Multi-household events | High | Enterprise tier |
| Calendar sync (Google/Apple) | High | Strong user demand |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema mismatch | Low | Table already in production |
| Auth middleware differences | Low | Same pattern as chores2026 |
| Multi-day complexity | Low | Can disable initially |

---

## Success Criteria

- [ ] FK migration applied successfully
- [ ] Events API copied and working
- [ ] Chores can be linked to events via UI
- [ ] Kid dashboard groups chores by event

---

## References

- MealPlanner source: `routes/api/events/index.ts`, `routes/api/events/[id].ts`
- Table: `choretracker.family_events` (production Supabase)
- Related: [Template Gating Plan](./20260118_template_gating_gift_codes.md)

---

**Status**: Ready for implementation
**Approved by**: Pending
**Implementation branch**: TBD
