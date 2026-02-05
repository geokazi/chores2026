# Events Progressive Disclosure UI Implementation

**Date**: February 5, 2026
**Status**: ✅ Complete
**Related**: [Events UX Improvements](./20260204_events_ux_improvements.md), [Events Prep Tasks](./20260120_events_prep_tasks_implementation.md)

---

## Summary

Implemented progressive disclosure UI for event cards across all dashboards:
- **Shared EventCard component** used by EventsList, ParentDashboard, KidDashboard
- **Collapsed by default** (~60px) showing title, participants, date, overflow menu
- **Expanded on tap** showing tasks, "+ Add task", "Add to Calendar"
- **Swipe gestures** for mobile quick actions
- **CSS transitions** for smooth expand/collapse
- **Item-level overflow menus** for prep task edit/delete and chore unlink

---

## Features Implemented

### 1. Shared EventCard Component

**File**: `islands/EventCard.tsx` (~800 lines)

Props interface:
```typescript
interface EventCardProps {
  event: EventData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddTask?: (type: "prep" | "chore") => void;
  onTaskToggle?: (taskId: string, done: boolean) => void;
  onPrepTaskEdit?: (taskId: string) => void;
  onPrepTaskDelete?: (taskId: string) => void;
  onChoreComplete?: (choreId: string) => void;
  onChoreDelete?: (choreId: string) => void;
  onAddToCalendar?: () => void;
  currentUserId?: string;
  familyMembers?: Array<{ id: string; name: string }>;
  showOverflowMenu?: boolean;
  showAddTask?: boolean;
  calendarAdded?: boolean;
  togglingTaskId?: string;
  completingChoreId?: string;
}
```

### 2. Progressive Disclosure States

**Collapsed View:**
```
┌──────────────────────────────────────────────────────┐
│ ▶ Event Title                           2/3   ⋮     │
│    👥 Everyone • Today at 2:00 PM                   │
└──────────────────────────────────────────────────────┘
```
- Chevron (▶) rotates 90° when expanded
- Task progress badge (2/3) shows completion
- Overflow menu (⋮) for Edit/Delete

**Expanded View:**
```
┌──────────────────────────────────────────────────────┐
│ ▼ Event Title                           2/3   ⋮     │
│    👥 Everyone • Today at 2:00 PM                   │
│ ─────────────────────────────────────────────────── │
│    PREP (2)                                         │
│    ┌─────────────────────────────────────────────┐  │
│    │ ☐  Buy cake                               ⋮ │  │
│    └─────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────┐  │
│    │ ☑  Decorate                               ⋮ │  │
│    └─────────────────────────────────────────────┘  │
│                                                      │
│    CHORES (1)                                       │
│    ┌─────────────────────────────────────────────┐  │
│    │ ☐ 🧹 Clean up            → 8 pts          ⋮ │  │
│    └─────────────────────────────────────────────┘  │
│                                                      │
│    [+ Add task]     [📅 Add to Calendar]            │
└──────────────────────────────────────────────────────┘
```

### 3. Swipe Gestures

Mobile users can swipe left on event cards to reveal quick action buttons:
- Edit button (✏️) - blue
- Delete button (🗑️) - red

Implementation:
```typescript
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
  setSwiping(true);
};

const handleTouchMove = (e: TouchEvent) => {
  const diff = touchStartX.current - e.touches[0].clientX;
  if (diff > 0 && diff <= 80) {
    setSwipeOffset(diff);
  }
};

const handleTouchEnd = () => {
  // Snap to open (80px) or closed (0px)
  setSwipeOffset(swipeOffset > 40 ? 80 : 0);
};
```

### 4. Item-Level Overflow Menus

Each prep task and chore has its own mini overflow menu (⋮):

**Prep Task Menu:**
- Edit (opens Add Prep Tasks modal)
- Delete (with confirmation)

**Chore Menu:**
- Remove (unlinks from event)

### 5. Auto-Expand Today's Events

Events scheduled for today are automatically expanded on page load:
```typescript
const [expandedEvents, setExpandedEvents] = useState<Set<string>>(() => {
  const todayEvents = [...thisWeek, ...upcoming].filter((e) =>
    (e.display_date || e.event_date) === todayStr
  );
  return new Set(todayEvents.map((e) => e.id));
});
```

### 6. CSS Transitions

Smooth animations for expand/collapse:
```typescript
style={{
  maxHeight: isExpanded ? "500px" : "0px",
  overflow: "hidden",
  transition: "max-height 0.3s ease-out, opacity 0.2s ease-out",
  opacity: isExpanded ? 1 : 0,
}}
```

---

## API Endpoints Added/Modified

### DELETE /api/events/[id]/prep-task

**File**: `routes/api/events/[id]/prep-task.ts`

Deletes a prep task from an event's metadata:
```typescript
// Request
{ taskId: string }

// Response
{ success: true }
```

### POST /api/chores/[chore_id]/unlink-event

**File**: `routes/api/chores/[chore_id]/unlink-event.ts` (new)

Removes the `family_event_id` link from a chore assignment:
```typescript
// Response
{ success: true, message: "Chore unlinked from event" }
```

---

## Files Modified

| File | Changes |
|------|---------|
| `islands/EventCard.tsx` | Added item-level overflow menus, swipe gestures, CSS transitions |
| `islands/EventsList.tsx` | Added handlers for prep task edit/delete and chore unlink |
| `routes/api/events/[id]/prep-task.ts` | Added DELETE handler |
| `routes/api/chores/[chore_id]/unlink-event.ts` | **New file** - unlink chore API |

---

## Bug Fixes Included

### 1. Prep Tasks Not Showing After Save

**Problem**: Prep tasks weren't visible in EventCard after being added.

**Root Cause**: EventCard filtered tasks by `currentUserId`, but EventsList passed `undefined`.

**Fix**: When `currentUserId` is undefined, show all tasks:
```typescript
const myPrepTasks = currentUserId
  ? prepTasks.filter((task) => !task.assignee_id || task.assignee_id === currentUserId)
  : prepTasks; // Show all when no user context
```

### 2. Event Chores Not Showing After Creation

**Problem**: Linked chores weren't visible in EventCard after being created.

**Root Cause**: `routes/parent/events.tsx` only loaded chore counts, not actual chore data.

**Fix**: Updated query to load full chore data with template join:
```typescript
const { data: chores } = await client
  .schema("choretracker")
  .from("chore_assignments")
  .select(`
    id,
    family_event_id,
    status,
    point_value,
    assigned_to_profile_id,
    chore_template:chore_template_id (
      id,
      name,
      icon,
      description
    )
  `)
  .in("family_event_id", eventIds)
  .eq("is_deleted", false);
```

---

## Kid Dashboard Behavior

Kids have limited access:
- **View-only** for events they didn't create
- **Overflow menu** (⋮) only appears if `event.created_by_profile_id === kid.id`
- Can tap to expand and see tasks
- Can toggle their own prep tasks

```typescript
const kidCreatedEvent = event.created_by_profile_id === kid.id;

<EventCard
  showOverflowMenu={kidCreatedEvent}
  onEdit={kidCreatedEvent ? () => {...} : undefined}
  onDelete={kidCreatedEvent ? () => {...} : undefined}
/>
```

---

## Design Decisions

### Why Progressive Disclosure?

| Before | After |
|--------|-------|
| ~180px per event card | ~60px collapsed |
| All details visible | Essential info only |
| Scroll to see 3 events | See 6+ events at once |
| Cluttered UI | Clean, scannable |

### Why Item-Level Overflow Menus?

Users asked "how do I edit/delete prep tasks and chores?" The overflow menu pattern:
- Works on both desktop (click) and mobile (tap)
- Consistent with card-level overflow menu
- Progressive disclosure (actions hidden until needed)
- Familiar pattern from iOS/Android apps

---

## Testing Checklist

- [x] Collapsed cards show title, participants, date, progress badge
- [x] Tap to expand reveals tasks section
- [x] Today's events auto-expand on page load
- [x] Overflow menu (⋮) shows Edit/Delete options
- [x] Swipe left reveals quick action buttons (mobile)
- [x] Prep task mini menu: Edit opens modal, Delete removes task
- [x] Chore mini menu: Remove unlinks from event
- [x] CSS transitions smooth (no jarring)
- [x] Kids see overflow menu only for their created events
- [x] All TypeScript checks pass

---

## Cross-References

- [Events UX Improvements](./20260204_events_ux_improvements.md) - Timezone fix, edit from dashboard
- [Events Prep Tasks](./20260120_events_prep_tasks_implementation.md) - Prep tasks feature
- [Multi-day Events](./20260121_events-multiday-repeating-endtime.md) - Event expansion logic
- [Kid Event Creation](./20260120_kid_event_creation.md) - Kid-created events

---

*Created: February 5, 2026*
