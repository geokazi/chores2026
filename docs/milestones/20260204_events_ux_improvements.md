# Events UX Improvements

**Date**: February 4, 2026
**Status**: ✅ Complete
**Commit**: `c39ab16`
**Related**: [Events Calendar](./20260120_events_prep_tasks_implementation.md), [Multi-day Events](./20260121_events-multiday-repeating-endtime.md)

---

## Summary

Comprehensive improvements to events functionality across the application:
1. **Timezone fix**: Events now use browser's local date instead of UTC
2. **Event editing**: Parents can edit events from my-chores dashboard
3. **Event deletion**: Delete option in edit modal
4. **Consistent UI**: Left-border card style across all dashboards
5. **Empty state**: Clickable "+ Add Event" when no events

---

## Problem Statement

### Issue 1: Timezone Bug
Events created at 8 PM Pacific time (4 AM UTC next day) weren't showing as "today's" events because:
- Server (Fly.io) runs in UTC
- `new Date()` on server returns UTC time
- Events for "today" in Pacific time were filtered out

### Issue 2: No Event Editing
Parents couldn't edit existing events from their my-chores dashboard—had to navigate to `/parent/events`.

### Issue 3: Inconsistent UI
- Kid dashboard: Large emoji cards
- Parent dashboard: Left-border compact style
- Different empty states and action buttons

---

## Solution

### Fix 1: Browser LocalDate Parameter

**Files Modified:**
- `routes/parent/events.tsx`
- `routes/api/events.ts`

**Pattern:**
```typescript
// Client-side script auto-detects browser's local date
const timezoneScript = `
  (function() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('localDate')) {
      const now = new Date();
      const localDate = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
      url.searchParams.set('localDate', localDate);
      window.location.replace(url.toString());
    }
  })();
`;

// Server uses localDate param instead of UTC
const todayStr = url.searchParams.get("localDate") || (() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
})();
```

**Flow:**
1. User visits `/parent/events`
2. Client script detects browser's local date (e.g., `2026-02-04` in Pacific)
3. Script adds `?localDate=2026-02-04` and reloads
4. Server uses that date for "today" calculations
5. Events display correctly regardless of server timezone

### Fix 2: Event Editing from Dashboard

**File Modified:** `islands/SecureParentDashboard.tsx`

Added:
- Import `AddEventModal` component
- State: `showEditEventModal`, `editingEvent`
- "Edit" link on each event card
- Modal with `editingEvent` prop for pre-filled data

```tsx
<button onClick={() => {
  setEditingEvent(event);
  setShowEditEventModal(true);
}}>
  Edit
</button>

<AddEventModal
  isOpen={showEditEventModal}
  editingEvent={editingEvent}
  onSuccess={() => {
    setShowEditEventModal(false);
    loadParentEvents(activeParent.id);
  }}
/>
```

### Fix 3: Delete in Edit Modal

**File Modified:** `islands/AddEventModal.tsx`

Added delete functionality (Pareto approach—one location):
```tsx
const handleDelete = async () => {
  if (!editingEvent || !confirm("Delete this event?")) return;

  setIsDeleting(true);
  const response = await fetch(`/api/events/${editingEvent.id}`, {
    method: "DELETE",
  });

  if (response.ok) {
    onSuccess?.();
    onClose();
  }
};

// UI: Red "Delete Event" link at bottom (edit mode only)
{isEditing && (
  <button onClick={handleDelete} style={{ color: "var(--color-warning)" }}>
    {isDeleting ? "Deleting..." : "Delete Event"}
  </button>
)}
```

### Fix 4: Consistent Left-Border Style

**Files Modified:**
- `islands/KidDashboard.tsx`
- `islands/SecureParentDashboard.tsx`

**Unified Event Card Style:**
```tsx
<div style={{
  padding: "0.75rem",
  backgroundColor: "var(--color-bg)",
  borderRadius: "0.5rem",
  borderLeft: "3px solid var(--color-primary)",
}}>
  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{event.title}</div>
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
      {dateLabel}{timeStr}
    </span>
    <button>Action</button>
  </div>
</div>
```

**Benefits of left-border style:**
- Information-dense (more events visible)
- Used by Linear, Notion, Slack (2024-2026 trend)
- Highly scannable (eyes follow vertical border)
- Color-coded status via border
- Works on mobile and desktop

### Fix 5: Card Container & Empty State

**Kid Dashboard** (`islands/KidDashboard.tsx`):
- Added `class="card"` wrapper around "What's Next" section
- Empty state with clickable "+ Add Event" button

```tsx
{upcomingEvents.length === 0 && (
  <div style={{ textAlign: "center", padding: "1.5rem" }}>
    <div style={{ fontSize: "1.5rem" }}>📅</div>
    <p>No upcoming events</p>
    <button onClick={() => setShowAddEventModal(true)}>
      + Add Event
    </button>
  </div>
)}
```

**Parent Dashboard** (`islands/SecureParentDashboard.tsx`):
- Empty state with link to `/parent/events`

---

## Files Modified

| File | Changes |
|------|---------|
| `routes/parent/events.tsx` | Added localDate param support + timezone script |
| `routes/api/events.ts` | Improved localDate fallback handling |
| `islands/SecureParentDashboard.tsx` | Added edit modal, consistent card style, empty state |
| `islands/KidDashboard.tsx` | Card container, left-border style, clickable empty state |
| `islands/AddEventModal.tsx` | Added delete functionality |

---

## UI Consistency Matrix

| Element | Kid Dashboard | Parent Dashboard |
|---------|--------------|------------------|
| Container | White `.card` | White `.card` |
| Event style | Left-border | Left-border |
| Title | Bold, top | Bold, top |
| Date | Today/Tomorrow/formatted | Today/Tomorrow/formatted |
| Action | "+ Prep" link | "Edit" link |
| Empty state | "📅 No upcoming events" + button | "📅 No upcoming events" + link |

---

## Design Decision: Left-Border vs Emoji Cards

**Evaluated Options:**
1. **Emoji card style**: Large emoji, white card, playful
2. **Left-border style**: Compact, color-coded, professional

**Decision:** Left-border style

**Rationale:**
- More information-dense (5+ events without scrolling)
- Aligns with 2024-2026 productivity UI trends (Linear, Notion)
- Works for both kids and parents
- Color indicates status (green = complete)
- Less visual clutter on same page as chore cards

---

## Testing Checklist

- [x] Create event at 8 PM Pacific → shows as "Today"
- [x] Edit event from parent my-chores dashboard
- [x] Delete event from edit modal
- [x] Kid dashboard events in card container
- [x] Parent dashboard events match kid styling
- [x] Empty state clickable in both dashboards
- [x] Event cards consistent across dashboards

---

## Cross-References

- [Events Calendar Implementation](./20260120_events_prep_tasks_implementation.md)
- [Multi-day & Repeating Events](./20260121_events-multiday-repeating-endtime.md)
- [OAuth Landing Page Fix](./20260203_oauth_landing_page_fix.md) — Same timezone pattern
- [Points Consistency](../troubleshooting/20260131_points_consistency_single_source_of_truth.md) — Similar timezone handling

---

*Created: February 4, 2026*
