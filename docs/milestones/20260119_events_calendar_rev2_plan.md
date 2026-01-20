# Events Calendar: Hybrid Implementation Guide

**Document Created:** January 19, 2026
**Status:** ✅ IMPLEMENTED (Revised Planning Doc)
**Related Documents:**
- [Events Calendar Integration - Technical Implementation](./20260119_events_calendar_original_plan.md)
- [Final Implementation](./20260120_events_prep_tasks_implementation.md)

---

## Table of Contents

1. [Analysis: MealPlanner UI vs Mockups](#what-you-have-production-mealplanner)
2. [The Big Decision: Reuse vs Simplify](#the-big-decision-reuse-vs-simplify)
3. [Recommendation: Hybrid Approach](#my-recommendation-hybrid-approach-)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Task Breakdown (8 Tasks)](#task-breakdown)
6. [Testing Checklist](#testing-checklist)

---

## Analysis: MealPlanner UI vs Mockups

Let me compare what you already have in production against the design principles we established.

## What You Have (Production MealPlanner)

### Strengths
1. **Calendar grid view** - Visual, familiar pattern
2. **Week navigation** - Easy to scan upcoming week
3. **Comprehensive event form** - All fields parents might need
4. **Multi-select participants** - Including "Everyone" and "Kids" shortcuts
5. **Advanced features ready** - Multi-day, repeating events, location, notes

### Concerns for ChoreGami Migration

| Feature | MealPlanner Context | ChoreGami Context | Issue? |
|---------|-------------------|-------------------|---------|
| **Calendar grid** | Good for meal planning (7 days visible) | Overkill for event prep (most events are today/tomorrow) | Medium - More complexity than needed |
| **Location field** | Useful for restaurants/venues | Less relevant for chore prep | Low - Can hide/skip |
| **"Add preparation task" checkbox** | Perfect! This is chore linking | Needs to open chore assignment flow | **HIGH - Key integration point** |
| **Participant points display** | Shows "(109 pts)" next to names | Violates our "hide points for events" principle | **HIGH - Conflicts with design** |
| **Start/End time** | Good for meal windows | Event prep only needs event time, not duration | Low - Can simplify |
| **Multi-day events** | Great for vacation meal planning | Rare for chore prep (maybe camping trip) | Low - Phase 2 feature |

---

## The Big Decision: Reuse vs Simplify

### Option A: Port Existing MealPlanner UI (Fast but Bloated)

**Estimated effort:** 3-4 hours (mostly removing meal-specific fields)

**What you'd get:**
- Calendar grid view (already built)
- Full event form (already built)
- All advanced features (multi-day, repeating, location)
- Participant selection with points display

**What you'd need to change:**
1. Remove/hide meal-specific fields
2. Hide points display in participant selection
3. Connect "Add preparation task" to ChoreGami chore assignment
4. Adjust copy from "meal" to "event" language

**Pros:**
- Already built, tested, deployed
- No mockup-to-code translation errors
- Multi-day and repeating events work day one

**Cons:**
- Violates Pareto principle (80% of features for 20% of users)
- Calendar grid is overkill for "today's soccer practice"
- Points display conflicts with our philosophy
- Heavier cognitive load than list view
- ~400+ lines of UI code (larger than our target)

---

### Option B: Build Simplified List View (Slower but Aligned)

**Estimated effort:** 7-9 hours (as originally estimated)

**What you'd build:**
- Simple list view (today, this week, upcoming)
- Minimal event form (name, emoji, date, time, participants)
- Dropdown integration with chore assignment
- No points display in UI

**Pros:**
- Aligns with Pareto principle
- Lighter cognitive load for parents
- No points leakage into event UI
- Cleaner integration story
- Matches our design philosophy

**Cons:**
- More upfront work
- Multi-day/repeating events deferred to Phase 2
- Have to build from scratch despite existing code

---

## My Recommendation: **Hybrid Approach**

**Reuse the backend, simplify the frontend.**

### What to Reuse from MealPlanner
1. **API endpoints** - Event CRUD already works
2. **Database schema** - `family_events`, `family_event_participants`
3. **Backend logic** - Event validation, participant linking
4. **Event form component structure** - Just strip out complexity

### What to Rebuild for ChoreGami
1. **Calendar grid** → Build simple list view instead
2. **Participant selection with points** → Hide points display
3. **"Add preparation task" checkbox** → Replace with chore assignment integration
4. **Advanced fields** → Hide multi-day, location, notes in MVP

---

## Concrete Implementation Plan

### Step 1: Minimal Event Form

**Start with your MealPlanner form, gut it:**

```tsx
// routes/parent/events/add.tsx
// Based on MealPlanner form but simplified

export default function AddEventForm() {
  return (
    <Modal>
      <h1>Add Event</h1>

      {/* KEEP from MealPlanner */}
      <Input label="Event Title" name="name" required />
      <Input label="Emoji" name="emoji" type="text" maxLength={2} />
      <DateInput label="Date" name="event_date" required />
      <TimeInput label="Time" name="event_time" />
      <Checkbox label="All day event" name="is_all_day" />

      {/* MODIFY from MealPlanner - hide points */}
      <ParticipantSelect
        participants={familyMembers}
        showPoints={false}  // NEW: hide point display
      />

      {/* REMOVE from MealPlanner */}
      {/* - Multi-day event checkbox */}
      {/* - Location field */}
      {/* - Notes textarea */}
      {/* - "Add preparation task" checkbox */}
      {/* - Repeating event */}

      <Button>Save Event</Button>
    </Modal>
  );
}
```

**Lines: ~40** (down from MealPlanner's ~120)

### Step 2: Simple List View

**Do NOT port the calendar grid. Build this instead:**

```tsx
// routes/parent/events/index.tsx

export default function EventsListPage({ events }: PageProps) {
  const thisWeek = events.filter(e => isThisWeek(e.event_date));
  const upcoming = events.filter(e => !isThisWeek(e.event_date));

  return (
    <div>
      <header>
        <h1>📅 Family Events</h1>
        <Button href="/parent/events/add">+ Add Event</Button>
      </header>

      <section>
        <h2>This Week</h2>
        {thisWeek.map(event => (
          <EventCard
            event={event}
            showLinkedChores={true}
          />
        ))}
      </section>

      <section>
        <h2>Upcoming</h2>
        {upcoming.map(event => (
          <EventCard event={event} />
        ))}
      </section>

      <Button variant="ghost">Show Past Events</Button>
    </div>
  );
}
```

**Lines: ~80** (vs MealPlanner calendar grid ~200+)

---

## Estimated Effort Comparison

| Approach | Frontend Lines | Time | Complexity | Alignment with Design |
|----------|----------------|------|------------|---------------------|
| **Port MealPlanner UI** | ~400 lines | 3-4 hrs | High (calendar grid) | Medium (points display issue) |
| **Build from mockups** | ~230 lines | 7-9 hrs | Medium | Perfect |
| **Hybrid (recommended)** | ~140 lines | 5-6 hrs | Low | Perfect |

---

## Final Recommendation

### Reuse These Components
1. Event form structure (strip to essentials)
2. Participant selection (add showPoints prop)
3. Date/time pickers (as-is)
4. API endpoints (no changes)

### Build New
1. Simple list view (not calendar grid)
2. Event dropdown in chore assignment
3. EventCard component for list
4. Kid dashboard grouping

**Total: ~6 hours, ~140 new lines, perfect alignment with design**

**Decision Made:** **Option C - Hybrid Approach** (reuse backend, simplify frontend)

---

## Implementation Status

This document guided the actual implementation completed on January 19-20, 2026. See [Final Implementation](./20260120_events_prep_tasks_implementation.md) for the complete feature documentation including:
- Prep Tasks feature (added during implementation)
- Linked Chores with 0-point defaults
- Event mission grouping on kid dashboard
- All API endpoints and test coverage

---

**END OF DOCUMENT**

Last Updated: January 20, 2026
Version: 1.1 (Implementation Complete)
