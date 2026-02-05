# Events Progressive Disclosure UI

**Date**: February 5, 2026
**Status**: ✅ Implemented
**Priority**: High
**Estimated Effort**: ~3-4 hours

> **Note**: This plan has been implemented. See [Implementation Milestone](../milestones/20260205_events_progressive_disclosure_implementation.md) for details.

---

## Summary

Redesign event cards with progressive disclosure pattern:
- **Collapsed (default)**: Title, participants, date, overflow menu (⋮)
- **Expanded (on tap)**: Tasks, "+ Add task", "Add to Calendar"
- **67% height reduction** per card (180px → 60px)

---

## Design Principles Applied

| Principle | Application |
|-----------|-------------|
| **Pareto 80/20** | 80% use case (scanning events) gets collapsed view |
| **No code bloat** | Single shared `EventCard` component for all dashboards |
| **Reuse existing** | Leverage existing overflow menu pattern from chore cards |
| **Simplicity** | 2 text elements collapsed vs 7 current |
| **Max 500 lines** | EventCard ~200 lines, fits easily |

---

## Implementation Plan

### Phase 1: Create Shared EventCard Component (~1.5 hours)

**New file: `islands/EventCard.tsx`** (~200 lines)

```tsx
interface EventCardProps {
  event: Event;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddTask?: (type: "prep" | "chore") => void;
  onTaskToggle?: (taskId: string, done: boolean) => void;
  onAddToCalendar?: () => void;
  currentUserId?: string;
  showOverflowMenu?: boolean;  // Parents only
  showAddTask?: boolean;       // Parents only
}
```

**States:**
1. **Collapsed** (default): Left-border card, title + metadata + ⋮
2. **Expanded - No tasks**: Shows "+ Add task" and "Add to Calendar"
3. **Expanded - With tasks**: Shows prep/chores grouped
4. **Expanded - In progress**: Shows completed tasks with assignee

**Overflow menu options:**
- Edit Event
- Delete Event

### Phase 2: Update Parent Events Page (~1 hour)

**File: `islands/EventsList.tsx`**

Changes:
- Replace current event card rendering with `<EventCard />`
- Add `expandedEventIds` state (Set)
- Handle expand/collapse toggle
- Move Edit/Delete to overflow menu
- Add "+ Add task" inline choice (Prep/Chore)

### Phase 3: Update Dashboards (~1 hour)

**Files:**
- `islands/SecureParentDashboard.tsx`
- `islands/KidDashboard.tsx`

Changes:
- Import shared `<EventCard />`
- Simplified props (no overflow menu for kids)
- Consistent collapsed/expanded behavior

### Phase 4: Add to Calendar Feature (~30 min)

**New file: `routes/api/events/[id]/calendar.ts`** (already exists)

Add state tracking:
- Button: "Add to Calendar" → downloads .ics
- After click: Shows "✓ In your calendar" (localStorage flag)

---

## Component Architecture

```
EventCard.tsx (shared)
├── CollapsedView
│   ├── LeftBorder (green)
│   ├── Title (bold)
│   ├── Metadata (participants • date • time)
│   └── OverflowMenu (⋮)
│
└── ExpandedView
    ├── CollapsedView (header)
    ├── TasksSection
    │   ├── PrepTasks (if any)
    │   └── ChoresTasks (if any)
    ├── AddTaskButton (+ inline Prep/Chore choice)
    └── CalendarButton (or status label)
```

---

## UI Specifications

### Collapsed Card
```
┌──────────────────────────────────────────────────────┐
│ ├─ Event Title                                     ⋮ │
│    👥 Everyone • Today at 2:00 PM                    │
└──────────────────────────────────────────────────────┘
```

- Height: ~60px
- Left border: 4px green
- Tap anywhere (except ⋮) to expand
- ⋮ opens overflow menu

### Expanded Card
```
┌──────────────────────────────────────────────────────┐
│ ├─ Event Title                                     ⋮ │
│    👥 Everyone • Today at 2:00 PM                    │
│                                                      │
│    PREP (2)                                         │
│    ☐ Buy cake                     → 5 pts           │
│    ☑ Decorate                     → 3 pts  ✓ Mom    │
│                                                      │
│    CHORES (1)                                       │
│    ☐ Clean up                     → 8 pts           │
│                                                      │
│    [+ Add task]     [📅 Add to Calendar]            │
└──────────────────────────────────────────────────────┘
```

### Overflow Menu
```
┌──────────────────────────┐
│  Edit Event              │
│  ─────────────────       │
│  Delete Event        🗑   │
└──────────────────────────┘
```

### Add Task Inline Choice
After clicking "+ Add task":
```
    [+ Add task]  →  [Prep] [Chore]
```

---

## State Management

```typescript
// Session-based expansion state (resets on page load)
const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

// Calendar added state (persisted in localStorage)
const [calendarAddedIds, setCalendarAddedIds] = useState<Set<string>>(() => {
  const stored = localStorage.getItem("choregami_calendar_events");
  return stored ? new Set(JSON.parse(stored)) : new Set();
});
```

---

## Files to Create/Modify

| File | Action | Lines |
|------|--------|-------|
| `islands/EventCard.tsx` | **Create** | ~200 |
| `islands/EventsList.tsx` | Modify | -50, +30 |
| `islands/SecureParentDashboard.tsx` | Modify | -40, +20 |
| `islands/KidDashboard.tsx` | Modify | -40, +20 |

**Net change**: ~+160 lines (well under budget)

---

## Metrics to Track (Beta)

1. **Expand rate**: % of events that get expanded
2. **Calendar sync rate**: % of events added to calendar
3. **Task creation rate**: How often users add tasks after event creation
4. **Edit/Delete discovery**: Time to find overflow menu actions

---

## Accessibility

- [x] All tap targets ≥44px (Apple HIG)
- [x] Color contrast ≥4.5:1
- [x] VoiceOver: "Expand event, [title], [participants], [date]"
- [x] Overflow menu has keyboard navigation
- [x] Focus indicators on interactive elements

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users can't find Edit/Delete | Overflow menu is standard pattern; add tooltip on first use |
| Expand/collapse confusing | Visual cue (chevron rotation) + subtle animation |
| Calendar feature low usage | Track metrics; can promote to always-visible if needed |

---

## Rollback Plan

If progressive disclosure causes confusion:
1. Keep shared `EventCard` component
2. Default to expanded state
3. Move actions back to always-visible

---

## Approval Checklist

- [ ] Collapsed card design approved
- [ ] Overflow menu placement approved
- [ ] "+ Add task" inline choice approved
- [ ] "Add to Calendar" prominence approved
- [ ] Implementation phases approved

---

## Questions for Review

1. **Kids dashboard**: Should kids see overflow menu, or just view-only cards?
2. **Default state**: All collapsed, or expand "Today" events by default?
3. **Animation**: Smooth expand/collapse, or instant toggle?
4. **Swipe gestures**: Implement for v1, or defer to later?

---

*Plan created: February 5, 2026*
