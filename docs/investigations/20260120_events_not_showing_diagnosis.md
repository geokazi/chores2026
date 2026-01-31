# Investigation: Events/Chores Not Showing on Dashboards

**Date**: January 20, 2026
**Status**: ✅ Fixes Implemented
**Reported Issue**: Events, prep tasks, and event-linked chores not appearing on `/kid/dashboard` and `/parent/my-chores` despite being assigned

## Data Architecture Summary

### Three Types of Event-Related Items

| Item Type | Storage Location | Display Location |
|-----------|------------------|------------------|
| **Events** | `choretracker.family_events` | "What's Next" section on dashboards |
| **Prep Tasks** | `family_events.metadata.prep_tasks` (JSONB) | Within event cards, as checkboxes |
| **Event-Linked Chores** | `choretracker.chore_assignments` with `family_event_id` FK | "Event Missions" grouped section |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Events ("What's Next" Section)                                         │
├─────────────────────────────────────────────────────────────────────┤
│ 1. SecureKidDashboard calls /api/events                              │
│ 2. API fetches from family_events WHERE is_deleted=false             │
│    AND event_date >= TODAY (UTC)                              ← BUG 1│
│ 3. Client filters: participants.includes(kidId) OR empty      ← BUG 2│
│ 4. Prep tasks extracted from event.metadata.prep_tasks               │
│ 5. Tasks filtered: assignee_id === kidId OR no assignee             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Event-Linked Chores (Missions)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ 1. SecureKidDashboard calls /api/kids/chores                         │
│ 2. API calls getTodaysChores() with join:                            │
│    family_event:family_events(id, title, event_date, ...)     ← BUG 3│
│ 3. Join relies on Supabase auto-detecting FK                         │
│ 4. groupChoresByEvent() requires BOTH:                               │
│    - chore.family_event_id (non-null)                                │
│    - chore.family_event (non-null object)                      ← BUG 3│
│ 5. If join fails, chore goes to "unlinked" list instead              │
└─────────────────────────────────────────────────────────────────────┘
```

## Root Cause Analysis

### BUG 0: Event-Linked Chores Default to TODAY's Due Date (PRIMARY CAUSE)

**Location**: `islands/AddChoreModal.tsx:56`

```typescript
dueDate: getLocalDateString(), // Today's date - PROBLEM
```

**Problem**: When creating a chore from an event card (via "+ Chore" button), the due date defaults to TODAY, not the event's date. This creates a fundamental mismatch:

**Example**:
- Event "Basketball practice" is on Jan 25
- Parent clicks "+ Chore" on event card (Jan 20)
- Chore "Pack basketball bag" created with `due_date = Jan 20` (today)
- User expects chore to appear "for" the Jan 25 event, but it's due today

**Impact**: This is the PRIMARY root cause. Chores appear as regular "today's chores" instead of being associated with their future event.

### BUG 0b: getTodaysChores Only Returns Today/Overdue Chores

**Location**: `lib/services/chore-service.ts:175-190`

```typescript
// One-time chores: show if due today or overdue
return dueDate <= todayEnd;
```

**Problem**: Even if user manually corrects the due date to match the event date (future), the chore won't appear until that day. This is technically correct behavior, but creates a UX gap for "event prep" scenarios where users want to see upcoming prep tasks.

**Example**:
- User creates chore for Jan 25 event, sets due_date to Jan 25
- On Jan 20, user checks dashboard - chore doesn't appear
- User thinks chore wasn't saved or is "missing"

### BUG 1: Timezone Mismatch in Events API

**Location**: `routes/api/events.ts:53`

```typescript
.gte("event_date", new Date().toISOString().split("T")[0]) // Today and future
```

**Problem**: `new Date().toISOString()` converts to UTC. If the server runs in UTC but the user is in UTC-8, events for "today" in the user's timezone may be filtered out as "yesterday" in UTC.

**Example**:
- User in PST creates event for "Jan 20, 2026"
- Server time is Jan 21, 2026 00:30 UTC
- API filters `event_date >= "2026-01-21"`, misses the Jan 20 event

### BUG 2: Participant Comparison May Fail Silently

**Location**: `islands/SecureKidDashboard.tsx:149-156`

```typescript
const kidEvents = events.filter((event: any) => {
  if (!event.participants || event.participants.length === 0) {
    return true;
  }
  return event.participants.includes(kidId);
});
```

**Problem**: If `participants` is stored as a non-array (e.g., `{0: "uuid"}` from JSONB object), `includes()` would fail. Also no logging to diagnose.

### BUG 3: Supabase Join May Not Return Event Data

**Location**: `lib/services/chore-service.ts:156-159`

```typescript
.select(`
  *,
  chore_template:chore_templates!inner(*),
  family_event:family_events(id, title, event_date, schedule_data, metadata)
`)
```

**Problem**: The join syntax `family_event:family_events(...)` relies on Supabase detecting the FK relationship via `family_event_id`. If:
- The FK constraint doesn't exist in database
- The column name doesn't match Supabase's inference pattern
- The event is soft-deleted (`is_deleted = true`)

...the join returns `null`, and `groupChoresByEvent()` puts the chore in "unlinked".

### BUG 4: No is_deleted Filter on Event Join

**Location**: `lib/services/chore-service.ts:156-159`

The join doesn't filter out soft-deleted events. A chore linked to a deleted event would still have `family_event_id` set, but the join behavior is undefined.

## Recommended Fix Plan

### Fix 0: Default Due Date to Event Date When Creating Event-Linked Chores (P0, 15 min)

**File**: `islands/AddChoreModal.tsx`

**Problem**: Currently defaults to `getLocalDateString()` (today) regardless of event.

**Solution**: When `preSelectedEventId` is provided, use the event's date.

**Edge Case - Manual Event Selection**: When user opens AddChoreModal directly (not from event card) and manually selects an event from the dropdown, the `dueDate` should also update to match the selected event's date. This provides consistent behavior whether the modal was opened from an event card or the event was selected manually.

**Related Forms Analysis**:
| Form | Mode | Fix Needed? |
|------|------|-------------|
| AddChoreModal | Create only | **YES** |
| AddEventModal | Create + Edit | No (events have `event_date`, not `dueDate`) |
| AddPrepTasksModal | Create + Edit | No (prep tasks have no due dates) |
| Edit Chore | Doesn't exist | N/A |

```typescript
// When opened from event card, default due date to event date
useEffect(() => {
  if (isOpen && preSelectedEventId) {
    // Need to pass events list to modal OR fetch event date
    const selectedEvent = events.find(e => e.id === preSelectedEventId);
    if (selectedEvent) {
      setFormData(prev => ({
        ...prev,
        familyEventId: preSelectedEventId,
        assignedTo: preSelectedAssignee || prev.assignedTo,
        points: 0,
        dueDate: selectedEvent.event_date, // Use event date, not today
      }));
    }
  }
}, [isOpen, preSelectedEventId, events]);
```

**Implementation Notes**:
- AddChoreModal needs access to events list (pass as prop from EventsList)
- OR: Fetch event date via API when modal opens with preSelectedEventId
- This fixes the root cause - chores will be due on the event day

### Fix 0b: Show Event-Linked Chores in "What's Next" Section (P1, 1-2 hr)

**Files**: `islands/SecureKidDashboard.tsx`, `islands/KidDashboard.tsx`

**Problem**: Event-linked chores with future due dates don't appear until that day.

**Solution**: Load event-linked chores alongside events and display them in the "What's Next" section:

```
📅 What's Next
┌─────────────────────────────┐
│ 🏀 Basketball practice      │
│ Tomorrow at 4:00 PM         │
│ ─────────────────────────── │
│ ✅ Your missions:           │
│   ⬜ Pack basketball bag    │ ← prep task (metadata)
│   ⬜ Bring water bottle     │ ← linked chore (DB)
└─────────────────────────────┘
```

**Implementation**:
1. Create new API endpoint `/api/chores/by-events` that fetches chores by event IDs
2. In `loadKidEvents()`, also fetch chores for those events
3. Merge prep tasks and linked chores in the event display

### Fix 1: Use Local Date for Event Filtering (5 min)

**File**: `routes/api/events.ts`

```typescript
// BEFORE:
.gte("event_date", new Date().toISOString().split("T")[0])

// AFTER:
// Use local date from query param or construct properly
const url = new URL(req.url);
const localDate = url.searchParams.get("localDate") ||
  new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
.gte("event_date", localDate)
```

And update callers to pass `localDate`:
- `SecureKidDashboard.tsx:loadKidEvents()`
- `SecureParentDashboard.tsx:loadParentEvents()`

### Fix 2: Add Explicit Join Filter for Soft-Delete (10 min)

**File**: `lib/services/chore-service.ts`

```typescript
// BEFORE:
family_event:family_events(id, title, event_date, schedule_data, metadata)

// AFTER - use !inner to allow null, filter in post-processing:
family_event:family_events!family_event_id(id, title, event_date, schedule_data, metadata, is_deleted)

// Then filter in code:
const filteredChores = (data || []).filter((chore: any) => {
  // ... existing date filters ...
  // Also exclude chores linked to deleted events
  if (chore.family_event?.is_deleted) {
    chore.family_event = null;
    chore.family_event_id = null;
  }
});
```

### Fix 3: Add Debug Logging for Event/Participant Issues (5 min)

**File**: `islands/SecureKidDashboard.tsx`

```typescript
const kidEvents = events.filter((event: any) => {
  if (!event.participants || event.participants.length === 0) {
    return true;
  }
  const isParticipant = event.participants.includes(kidId);
  if (!isParticipant) {
    console.log("📅 Event filtered out (not participant):", {
      event: event.title,
      participants: event.participants,
      kidId,
    });
  }
  return isParticipant;
});

console.log("📅 Events after filtering:", {
  total: events.length,
  afterFilter: kidEvents.length,
  kidId,
});
```

### Fix 4: Explicit FK Join Syntax (5 min)

**File**: `lib/services/chore-service.ts`

Use explicit FK column reference:
```typescript
// BEFORE:
family_event:family_events(...)

// AFTER (explicit FK):
family_event:family_events!chore_assignments_family_event_id_fkey(...)
```

Or verify the FK exists in database:
```sql
-- Check if FK constraint exists
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname LIKE '%family_event%';
```

## Implementation Priority

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| **P0** | **Fix 0: Default due_date to event date** | **HIGH - Fixes primary root cause** | 15 min |
| P0 | Fix 3: Add logging | Enables diagnosis of remaining issues | 5 min |
| P1 | Fix 0b: Show event chores in What's Next | Better UX - see prep tasks before event day | 1-2 hr |
| P1 | Fix 1: Timezone | Events not showing for users in different TZ | 5 min |
| P1 | Fix 2: Soft-delete filter | Prevents stale data from deleted events | 10 min |
| P2 | Fix 4: Explicit FK | Ensures reliable join behavior | 5 min |

## Testing Checklist

After fixes:

**Fix 0 - Due Date Defaulting**:
- [ ] Click "+ Chore" on future event card (e.g., Jan 25)
- [ ] Verify due date field defaults to event date (Jan 25), not today
- [ ] Save chore, verify it appears on the event's date dashboard

**Fix 0b - What's Next Display**:
- [ ] Create event for tomorrow with prep task and linked chore
- [ ] On today's dashboard, verify both appear in "What's Next" section
- [ ] Verify prep tasks show as checkboxes
- [ ] Verify linked chores show as mission items

**Existing Fixes**:
- [ ] Create event assigned to specific kid, verify it shows on their dashboard
- [ ] Create prep task for kid, verify checkbox appears
- [ ] Create chore linked to event, verify it shows in "Event Missions" section
- [ ] Soft-delete event, verify linked chore moves to regular chores list
- [ ] Test across timezones (UTC+0, UTC-8, UTC+5:30)

## Implementation Summary

**Implemented on**: January 20, 2026

| Fix | File(s) Modified | Status |
|-----|------------------|--------|
| **Fix 0** | `islands/AddChoreModal.tsx` | ✅ Done |
| **Fix 0b** | `routes/api/chores/by-events.ts`, `islands/SecureKidDashboard.tsx`, `islands/SecureParentDashboard.tsx`, `islands/KidDashboard.tsx` | ✅ Done |
| **Fix 1** | `routes/api/events.ts`, `islands/SecureKidDashboard.tsx`, `islands/SecureParentDashboard.tsx` | ✅ Done |
| Fix 2 | `lib/services/chore-service.ts` (combined with Fix 4) | ✅ Done |
| **Fix 3** | `islands/SecureKidDashboard.tsx`, `islands/SecureParentDashboard.tsx`, `lib/services/chore-service.ts` | ✅ Done |
| **Fix 4** | `lib/services/chore-service.ts` | ✅ Done |
| **Fix 5** | Smart Event Grouping (see below) | ✅ Done |

### Fix 5: Smart Event Grouping (Removes 7-Day Limit)

**Problem**: Events more than 7 days in the future weren't appearing in the "What's Next" section. This was discovered when a kid-created event 11 days out didn't show on the dashboard.

**Root Cause**: Hard-coded 7-day filter in multiple locations:
- `SecureKidDashboard.tsx`: `eventDate <= weekFromNow`
- `SecureParentDashboard.tsx`: `eventDate <= weekFromNow`

**Solution**: Remove the upper time limit and implement smart grouping:

| Location | Before | After |
|----------|--------|-------|
| SecureKidDashboard | 7-day filter | No limit (shows all future) |
| SecureParentDashboard | 7-day filter | No limit (shows all future) |
| KidDashboard UI | Flat list | Grouped: Today / This Week / Later |
| Parent Dashboard UI | Flat list | Grouped: Today / This Week / Later |

**New Utility Function**: `lib/utils/household.ts`

```typescript
export function groupEventsByTimePeriod<T extends { event_date: string }>(events: T[]): {
  today: T[];
  thisWeek: T[];
  later: T[];
}
```

**UX Design**:
- **Today**: Always expanded, primary color header
- **This Week**: Always expanded, muted header
- **Later**: Collapsed by default (click to expand), prevents dashboard clutter

**Commit**: `039984c` - "✨ Smart event grouping: Today, This Week, Later (removes 7-day limit)"

### Changes Made

1. **AddChoreModal.tsx** (Fix 0): When opened from event card or when event selected from dropdown, `dueDate` now defaults to event's date instead of today. Also sets points to 0 for event-linked chores.

2. **routes/api/chores/by-events.ts** (Fix 0b - NEW): New API endpoint to fetch chores linked to specific events by their IDs. Returns chores with template data for display in "What's Next" section.

3. **SecureKidDashboard.tsx & SecureParentDashboard.tsx** (Fix 0b, Fix 1, Fix 3):
   - Pass `localDate` to `/api/events` (Fix 1)
   - Added debug logging for participant filtering (Fix 3)
   - Fetch event-linked chores via new `/api/chores/by-events` endpoint (Fix 0b)
   - Merge linked chores into event objects as `linked_chores` array (Fix 0b)

4. **KidDashboard.tsx** (Fix 0b): Updated "What's Next" section to display linked chores alongside prep tasks. Added `LinkedChore` interface and render logic to show chores with completion status.

5. **SecureParentDashboard.tsx** (Fix 0b): Updated "What's Next" section display to show linked chores count alongside prep tasks count.

6. **routes/api/events.ts** (Fix 1): Now accepts `?localDate=YYYY-MM-DD` query param to avoid timezone issues.

7. **chore-service.ts** (Fix 2, 3, 4):
   - Explicit FK reference: `family_events!family_event_id`
   - Include `is_deleted` in event join
   - Clear event reference for soft-deleted events
   - Debug logging for join diagnostics
