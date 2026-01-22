# ChoreGami Events: Multi-day, Repeating & End Time
## Implementation Plan - Pareto-Optimized (20-80 Approach)

**Date**: January 21, 2026
**Status**: ✅ Implemented
**Goal**: 80% functionality with 20% complexity vs MealPlanner

### Quick Summary

| Feature | Implementation |
|---------|---------------|
| **End Time** | Time input next to Start Time |
| **Multi-day** | Checkbox + duration number (e.g., "3 days") |
| **Repeating** | Dropdown presets + "Until" date (default 3 months) |
| **Database** | Pure JSONB - no migration needed |
| **Estimated** | ~80-100 lines, ~2 hours |

---

## 1. Analysis: MealPlanner vs Pareto Approach

### MealPlanner Implementation (Full Complexity)

| Feature | Lines of Code | Complexity |
|---------|--------------|------------|
| End Time | ~30 | Low |
| Multi-day Events | ~150 | High (series editing, metadata tracking) |
| Repeating Events | ~200 | High (custom intervals, preview, end conditions) |
| **Total** | **~380+** | **Significant** |

### MealPlanner Bloat Identified:

1. **Series Editing UX** (~50 lines)
   - Radio buttons: "Edit only this day" vs "Edit entire series"
   - Warning banners, conditional delete messaging
   - *Reality*: Most users just want to change the whole event

2. **Custom Recurrence Intervals** (~80 lines)
   - Number input (1-365) + unit dropdown (days/weeks/months)
   - Smart validation messages ("That's over a year!")
   - *Reality*: 95% use Weekly, Biweekly, or Monthly

3. **Recurrence End Conditions** (~50 lines)
   - "Never", "After X occurrences", "Until specific date"
   - Extra date picker and number input
   - *Reality*: Most family events repeat indefinitely or until manually deleted

4. **Preview Dates Generation** (~40 lines)
   - Shows next 5 occurrences with formatting
   - Recalculates on every change
   - *Reality*: Nice-to-have, not essential

---

## 2. Pareto Implementation Plan

### Phase 1: End Time (Essential - Do First)

**Effort**: ~15 minutes | **Value**: High
**Files**: `islands/AddEventModal.tsx`

Current `schedule_data`:
```typescript
schedule_data: {
  all_day?: boolean;
  start_time?: string;  // Already exists
  // end_time missing!
}
```

**Add**:
```typescript
schedule_data: {
  all_day?: boolean;
  start_time?: string;
  end_time?: string;    // NEW - simple addition
}
```

**UI Change**: Add one `<input type="time">` field next to Start Time.

---

### Phase 2: Multi-day Events (Duration Approach)

**Effort**: ~20 minutes | **Value**: High
**Files**: `islands/AddEventModal.tsx`

**Simplified Approach**:
- Add `isMultiDay` checkbox
- Show `durationDays` number input when checked (not a date picker)
- Store in existing `schedule_data.duration_days` JSONB field
- **NO series editing** - edit/delete affects entire event
- **NO database migration** - uses existing JSONB

**Skip from MealPlanner**:
- ❌ "Edit single day" vs "Edit series" radio buttons
- ❌ Series metadata (`multi_day_index`, `is_first_day`, `is_last_day`)
- ❌ Separate `/api/events/series/` endpoint
- ❌ End date picker (duration is simpler, avoids off-by-one errors)

**Data Structure** (in existing `schedule_data` JSONB):
```typescript
schedule_data: {
  all_day?: boolean;
  start_time?: string;
  end_time?: string;
  duration_days?: number;  // NEW - e.g., 3 for a 3-day event
}
```

**Display Logic**: Show on each day in "Coming Up" with "(Day 1 of 3)" suffix calculated at render time.

---

### Phase 3: Repeating Events (Dropdown + Until Date)

**Effort**: ~30 minutes | **Value**: High
**Files**: `islands/AddEventModal.tsx`

**Simplified Approach**:
- Dropdown with preset options: No repeat | Weekly | Every 2 weeks | Monthly
- "Until" date picker with **3-month default** (prevents infinite generation)
- Store in existing `recurrence_data` JSONB
- Generate occurrences on-the-fly when fetching events

**Skip from MealPlanner**:
- ❌ Custom interval input (repeat every X days/weeks/months)
- ❌ Multiple end conditions (never/after X/until date) - just "until date"
- ❌ Preview dates display
- ❌ Smart validation messages

**Data Structure** (in existing `recurrence_data` JSONB):
```typescript
recurrence_data: {
  is_recurring: boolean;
  pattern: "weekly" | "biweekly" | "monthly";
  until_date: string;  // Default: 3 months from event_date
}
```

**Why "Until" date with default**:
- Prevents infinite occurrence generation (bounded query)
- Simpler than MealPlanner's 3 end conditions
- Sensible default (3 months) reduces user decisions
- User can extend if needed

---

## 3. Implementation Details

### 3.1 AddEventModal.tsx Changes

```diff
// Current form state
const [formData, setFormData] = useState({
  title: "",
  date: "",
  startTime: "",
+ endTime: "",           // NEW - end time for timed events
  allDay: false,
+ isMultiDay: false,     // NEW - checkbox toggle
+ durationDays: 2,       // NEW - number of days (default 2)
+ repeatPattern: "",     // NEW - "" | "weekly" | "biweekly" | "monthly"
+ repeatUntil: "",       // NEW - date string, default 3 months out
  participants: [],
  // ...
});

// Helper to calculate default "until" date (3 months from event date)
const getDefaultUntilDate = (eventDate: string) => {
  const date = new Date(eventDate);
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
};
```

### 3.2 UI Additions (Minimal ~80 lines)

```tsx
{/* End Time - Simple addition next to Start Time */}
{!formData.allDay && (
  <div style={{ display: "flex", gap: "1rem" }}>
    <div className="form-group" style={{ flex: 1 }}>
      <label>Start Time</label>
      <input type="time" value={formData.startTime} ... />
    </div>
    <div className="form-group" style={{ flex: 1 }}>
      <label>End Time</label>
      <input type="time" value={formData.endTime} ... />
    </div>
  </div>
)}

{/* Multi-day toggle - Checkbox + duration number input */}
<div className="form-check">
  <input type="checkbox" checked={formData.isMultiDay} ... />
  <label>Multi-day event</label>
</div>
{formData.isMultiDay && (
  <div className="form-group">
    <label>Duration</label>
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="number"
        min="2"
        max="14"
        value={formData.durationDays}
        style={{ width: "4rem" }}
        ...
      />
      <span>days</span>
    </div>
  </div>
)}

{/* Repeating - Dropdown with presets + Until date */}
<div className="form-group">
  <label>Repeats</label>
  <select
    value={formData.repeatPattern}
    onChange={(e) => {
      const pattern = e.currentTarget.value;
      setFormData({
        ...formData,
        repeatPattern: pattern,
        // Set default "until" date when enabling repeat
        repeatUntil: pattern && !formData.repeatUntil
          ? getDefaultUntilDate(formData.date)
          : formData.repeatUntil
      });
    }}
  >
    <option value="">No repeat</option>
    <option value="weekly">Weekly</option>
    <option value="biweekly">Every 2 weeks</option>
    <option value="monthly">Monthly</option>
  </select>
</div>
{formData.repeatPattern && (
  <div className="form-group">
    <label>Until</label>
    <input
      type="date"
      value={formData.repeatUntil}
      min={formData.date}
      ...
    />
  </div>
)}
```

### 3.3 API Changes (Pure JSONB - No Migration)

**POST /api/events** - Accept new fields in existing JSONB columns:
```typescript
{
  title: string;
  event_date: string;       // Start date (existing column)
  schedule_data: {          // Existing JSONB column
    all_day: boolean;
    start_time?: string;
    end_time?: string;      // NEW
    duration_days?: number; // NEW - for multi-day events
  };
  recurrence_data?: {       // Existing JSONB column
    is_recurring: boolean;
    pattern: "weekly" | "biweekly" | "monthly";
    until_date: string;     // NEW - end date for recurrence
  };
  // ...existing fields
}
```

**No database migration required** - all new fields go into existing JSONB columns.

### 3.4 Event Expansion Logic (Server-side)

When fetching events, expand recurring/multi-day into display instances:

```typescript
function expandEventsForDateRange(events: Event[], queryStart: Date, queryEnd: Date) {
  const expanded = [];

  for (const event of events) {
    const eventStart = new Date(event.event_date);
    const durationDays = event.schedule_data?.duration_days || 1;

    // Multi-day: Generate instance for each day based on duration
    if (durationDays > 1) {
      for (let dayIndex = 1; dayIndex <= durationDays; dayIndex++) {
        const displayDate = new Date(eventStart);
        displayDate.setDate(displayDate.getDate() + dayIndex - 1);

        if (displayDate >= queryStart && displayDate <= queryEnd) {
          expanded.push({
            ...event,
            display_date: displayDate.toISOString().split('T')[0],
            display_suffix: ` (Day ${dayIndex} of ${durationDays})`,
          });
        }
      }
    }
    // Recurring: Generate instances until until_date
    else if (event.recurrence_data?.is_recurring) {
      const untilDate = new Date(event.recurrence_data.until_date);
      const intervalDays = {
        weekly: 7,
        biweekly: 14,
        monthly: 30, // Simplified - use exact date math in production
      }[event.recurrence_data.pattern];

      let current = new Date(eventStart);
      while (current <= untilDate && current <= queryEnd) {
        if (current >= queryStart) {
          expanded.push({
            ...event,
            display_date: current.toISOString().split('T')[0],
          });
        }
        current.setDate(current.getDate() + intervalDays);
      }
    }
    // Single event: Just include if in range
    else if (eventStart >= queryStart && eventStart <= queryEnd) {
      expanded.push({
        ...event,
        display_date: event.event_date,
      });
    }
  }

  return expanded.sort((a, b) => a.display_date.localeCompare(b.display_date));
}
```

### 3.5 EditEventModal Changes

**Files**: `islands/EditEventModal.tsx`

#### MealPlanner Complexity (What We Skip)

MealPlanner's EditEventDialog has ~100 lines dedicated to series editing:
- Radio buttons: "Edit only this day" vs "Edit entire series"
- Conditional warning banners: "⚠️ Changes will apply to all days"
- Separate API endpoint: `/api/events/series/:id`
- Delete confirmation varies by edit mode

#### ChoreGami Simplified Approach

**Principle**: Edit the event = edit the whole thing. No per-day granularity.

```typescript
// EditEventModal form state - same fields as AddEventModal
const [formData, setFormData] = useState({
  title: event.title,
  date: event.event_date,
  endTime: event.schedule_data?.end_time || "",
  isMultiDay: (event.schedule_data?.duration_days || 1) > 1,
  durationDays: event.schedule_data?.duration_days || 2,
  repeatPattern: event.recurrence_data?.pattern || "",
  repeatUntil: event.recurrence_data?.until_date || "",
  // ...existing fields
});
```

#### User Experience Comparison

| Action | MealPlanner | ChoreGami (Pareto) |
|--------|-------------|-------------------|
| Edit multi-day event | Choose: single day OR whole series | Edit whole event |
| Delete multi-day event | Choose: single day OR whole series | Delete whole event |
| Edit recurring event | Choose: this occurrence OR all future | Edit pattern (affects all) |
| Delete recurring event | Choose: this occurrence OR all future | Delete entire series |

#### Trade-offs

**What we lose**:
- Can't have different times on different days of a multi-day event
- Can't skip one occurrence of a recurring event
- Can't edit just "this Tuesday" of a weekly event

**What we gain**:
- ~100 fewer lines of code
- Simpler mental model for users
- No confusing "which days does this affect?" questions
- Faster to implement and maintain

**Workaround for edge cases**: If user needs different times on different days, they create separate single-day events instead of one multi-day event.

#### Implementation

EditEventModal already exists - just add the same form fields as AddEventModal:
1. End Time input (next to Start Time)
2. Multi-day checkbox + Duration number input
3. Repeats dropdown + Until date picker

No new components, no series editing UI, no conditional logic based on event type.

---

## 4. Database Changes

### Decision: Pure JSONB (No Migration Required)

All new fields stored in existing JSONB columns:

| Field | Column | Example |
|-------|--------|---------|
| `end_time` | `schedule_data` | `{"end_time": "17:00"}` |
| `duration_days` | `schedule_data` | `{"duration_days": 3}` |
| `pattern` | `recurrence_data` | `{"pattern": "weekly"}` |
| `until_date` | `recurrence_data` | `{"until_date": "2026-04-21"}` |

**Benefits**:
- Zero database migration
- Flexible schema evolution
- Already supported by existing table structure

**Trade-off**: Slightly harder to query/index than dedicated columns, but acceptable for this use case since events are always filtered by `family_id` first.

---

## 5. Comparison: MealPlanner vs ChoreGami

| Aspect | MealPlanner | ChoreGami (Pareto) |
|--------|-------------|-------------------|
| **End Time** | ✅ Has | ✅ Add (same) |
| **Multi-day** | End date picker + series editing | Duration number input (simpler) |
| **Repeating** | Custom intervals + 3 end conditions | Dropdown presets + single "until" date |
| **Database** | New columns needed | Pure JSONB (no migration) |
| **Lines of Code** | ~380+ | ~80-100 estimated |
| **Complexity** | High | Low |
| **User Coverage** | 100% | ~90% (covers typical family use cases) |

---

## 6. Future Extensibility

This minimal implementation is designed to be extended later **if needed**:

1. **Custom recurrence intervals**: Add number input + unit dropdown (days/weeks/months)
2. **More end conditions**: Add "after X occurrences" option
3. **Series editing**: Add per-day override metadata
4. **Preview dates**: Add occurrence preview display
5. **Day-of-week selection**: For "every Monday and Wednesday" patterns

But per 20-80 principle: **Don't build until users ask for it**.

The JSONB approach makes all these extensions trivial - just add new fields to the existing columns.

---

## 7. Action Items

- [x] **Approve this plan** (Jan 21, 2026)

**Phase 1: End Time (~15 min)** ✅
- [x] Add `endTime` field to AddEventModal form state
- [x] Add End Time input next to Start Time (hidden when all-day)
- [x] Update submit to include `end_time` in `schedule_data` JSONB

**Phase 2: Multi-day Events (~20 min)** ✅
- [x] Add `isMultiDay` checkbox + `durationDays` number input
- [x] Update submit to include `duration_days` in `schedule_data` JSONB
- [x] No database migration needed

**Phase 3: Repeating Events (~30 min)** ✅
- [x] Add `repeatPattern` dropdown (No repeat | Weekly | Every 2 weeks | Monthly)
- [x] Add `repeatUntil` date picker (default 3 months out)
- [x] Update submit to include `pattern` and `until_date` in `recurrence_data` JSONB
- [x] Add event expansion logic to GET /api/events (`?expand=true`)

**Phase 4: Edit Support (~20 min)** ✅
- [x] AddEventModal already handles edit mode via `editingEvent` prop
- [x] Update PATCH /api/events/[id] to handle new JSONB fields
- [x] Form pre-populates with existing values when editing

**Phase 5: Polish (~15 min)** ✅
- [x] Event expansion adds `display_suffix` with "(Day 1 of 3)" for multi-day
- [x] Unit tests added (20 tests, all passing)

---

**Estimated Total Effort**: ~2 hours
**MealPlanner Equivalent Effort**: 8-10 hours
**Code Reduction**: ~75%
**Database Migration**: None required

---

## 8. Implementation Files

| File | Purpose |
|------|---------|
| `lib/utils/event-expansion.ts` | Core expansion logic for multi-day and recurring events |
| `lib/utils/event-expansion_test.ts` | 20 unit tests (all passing) |
| `islands/AddEventModal.tsx` | Form fields for end time, duration, repeat pattern |
| `routes/api/events.ts` | POST stores JSONB, GET supports `?expand=true` |
| `routes/api/events/[id].ts` | PATCH handles new JSONB fields |
| `routes/parent/events.tsx` | Expanded events on parent events page |
| `islands/EventsList.tsx` | Display `display_date`, `display_suffix` |

## 9. Cross-References

- **Events Calendar Implementation**: [Events Prep Tasks](./20260120_events_prep_tasks_implementation.md) - Base events system
- **MealPlanner Analysis**: [Events Calendar Rev2 Plan](./20260119_events_calendar_rev2_plan.md) - Original hybrid approach
- **JSONB Pattern**: [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Schema flexibility pattern

---

*Plan created: January 21, 2026*
*Implementation completed: January 22, 2026*
