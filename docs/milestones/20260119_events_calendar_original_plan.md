# Events Calendar Integration - Technical Implementation
**Document Created:** January 19, 2026
**Status:** ✅ IMPLEMENTED (Original Planning Doc)
**Related Documents:**
- [Events UI Mockups & Design Decisions](./20260119_events_ui_mockups.md)
- [Critical Analysis: MealPlanner vs Mockups (Hybrid Approach)](./20260119_events_calendar_rev2_plan.md)
- [Final Implementation](./20260120_events_prep_tasks_implementation.md)

## Core Philosophy

**Events are universal organizational containers that work regardless of gamification philosophy.**

Events serve as a coordination layer for families to organize tasks around real-world activities (soccer practice, dentist appointments, camping trips). This feature works for:

- **Gamification-focused families** - Current ChoreGami users who use points/rewards
- **Organization-only families** - New user segment who want coordination without gamification
- **Hybrid families** - Use points for some things, not others

**Key principle:** The same event feature works perfectly whether your household uses 0 points or 1000 points.

---

## Design Decisions

### 1. No Event Points (Revised)

| Decision | Reasoning |
|----------|-----------|
| Events do NOT have points | Events are organizational containers, not gamification layers |
| Event missions don't display points to kids | Natural motivation (being ready for the event) is the primary driver |
| Chores inside events CAN have points | Points stored in DB for parent tracking, but hidden from kid UI |
| Works for points-enabled AND points-disabled families | System detects household "points mode" and adjusts UI accordingly |

**Why no event points:**
- Avoids double-counting confusion
- Simpler mental model: events organize, chores motivate
- Supports two user segments with one codebase
- Aligns with intrinsic motivation research (overjustification effect)
- Events = organization, not tasks

**Future option:** Optional "completion bonus" if users request it (Phase 2)

### 2. Dedicated /parent/events Page

| Decision | Reasoning |
|----------|-----------|
| Events get own page | Settings = configuration, Events = content management |
| Matches /reports pattern | Consistent navigation mental model |
| Not in settings tab | Events are dynamic content, not configuration |

### 3. Kid-Facing Language: "Missions"

| Audience | Word | Reasoning |
|----------|------|-----------|
| Kids | "Missions" | Adventure framing, not drudgery |
| Parents | "Chores" | Familiar, practical terminology |
| Database/API | `chores` | No refactor needed |
| Event context (all families) | "Missions" | Event framing makes tasks exciting regardless of points |

**Research-backed:** Identity-based language ("be a helper") works better than action language ("help") with children.

---

## Points Mode Detection

### Household-Level Setting

The system determines whether to show points UI based on household usage:

```tsx
// utils/household.ts
export function usePointsMode(householdId: string): boolean {
  // Option 1: Check explicit household setting
  const household = getHousehold(householdId);
  if (household.use_points !== undefined) {
    return household.use_points;
  }

  // Option 2: Infer from usage (fallback)
  const chores = getChores(householdId);
  return chores.some(c => c.points > 0); // If ANY chore has points, show point system
}
```

**Database schema (if explicit setting needed):**
```sql
ALTER TABLE households
ADD COLUMN use_points BOOLEAN DEFAULT TRUE;
```

### UI Behavior by Points Mode

| UI Element | Points Mode ON | Points Mode OFF |
|------------|----------------|-----------------|
| Kid dashboard header | Shows point total | Hidden |
| Family Goal widget | Visible | Hidden |
| Regular chore cards | Shows "+X pts" | No point display |
| Event mission cards | **No point display** | **No point display** |
| Parent chore assignment | Points field visible | Points field visible (optional) |
| Reports page | Shows points/savings | Shows completion only |

**Key insight:** Event missions NEVER show points to kids, regardless of household mode. Natural motivation is the driver.

---

## Database Schema

### Existing Tables (No Changes Required)

```sql
-- family_events table (already exists from MealPlanner integration)
CREATE TABLE family_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- family_event_participants table (already exists)
CREATE TABLE family_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES family_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, profile_id)
);

-- chore_assignments table (add foreign key)
ALTER TABLE chore_assignments
ADD COLUMN family_event_id UUID REFERENCES family_events(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_chores_by_event ON chore_assignments(family_event_id)
WHERE family_event_id IS NOT NULL;
```

### Optional: Household Points Mode
```sql
-- Only if explicit setting needed (can also infer from usage)
ALTER TABLE households
ADD COLUMN use_points BOOLEAN DEFAULT TRUE;
```

### Data Migration

No breaking changes. All existing data works as-is:
- Existing chores have `family_event_id = NULL` (regular chores)
- Existing households default to points mode (backward compatible)

---

## API Endpoints

### Event Management

```typescript
// GET /api/events?household_id={id}
// Returns all events for household, ordered by date
{
  events: [
    {
      id: "uuid",
      name: "Soccer Practice",
      emoji: "⚽",
      event_date: "2026-01-21",
      event_time: "17:00:00",
      is_all_day: false,
      participants: ["Alex", "Jamie"],
      linked_chores: [
        {
          id: "uuid",
          name: "Pack soccer bag",
          points: 3, // May be 0, parent decides
          assigned_to: "Alex",
          completed: false
        }
      ],
      completion_status: {
        total: 3,
        completed: 2
      }
    }
  ]
}

// POST /api/events
// Create new event
{
  name: "Soccer Practice",
  emoji: "⚽",
  event_date: "2026-01-21",
  event_time: "17:00:00",
  is_all_day: false,
  participant_ids: ["uuid1", "uuid2"]
}

// PATCH /api/events/{id}
// Update event (same payload as POST)

// DELETE /api/events/{id}
// Soft delete: sets family_event_id to NULL on linked chores
// Chores remain assigned, just unlinked from event
```

### Chore Assignment Integration

```typescript
// PATCH /api/chores/{id}
// Add family_event_id to existing assignment endpoint
{
  chore_id: "uuid",
  assigned_to: "uuid",
  points: 3, // Optional, can be 0
  family_event_id: "uuid" // NEW: optional event link
}
```

### Kid Dashboard Data

```typescript
// GET /api/kid/dashboard?profile_id={id}
// Add event grouping to existing response
{
  profile: { name: "Alex", total_points: 142 },
  household: {
    id: "uuid",
    use_points: true // NEW: points mode detection
  },
  family_goal: { /* existing */ },
  chores: [
    {
      id: "uuid",
      name: "Pack soccer bag",
      points: 3,
      completed: false,
      family_event_id: "uuid", // NEW: for grouping
      family_event: { // NEW: denormalized for efficiency
        name: "Soccer Practice",
        emoji: "⚽",
        event_date: "2026-01-21",
        event_time: "17:00:00"
      }
    },
    {
      id: "uuid",
      name: "Make bed",
      points: 3,
      completed: false,
      family_event_id: null // Regular chore
    }
  ]
}
```

---

## Component Architecture

### New Components (~85 lines)

```
components/
  EventMissionGroup.tsx       (~40 lines)
    - Event header (emoji, name, time)
    - Grouped chore list
    - Celebration message when complete
    - No points display (regardless of mode)

utils/
  household.ts                (~15 lines)
    - usePointsMode()
    - groupChoresByEvent()

islands/
  EventsList.tsx              (~30 lines)
    - Parent-facing event list
    - Edit/delete actions
    - Completion status
```

### Modified Components (~30 lines)

```
routes/
  kid/dashboard.tsx           (~20 lines modified)
    - Detect points mode
    - Group chores by event
    - Conditional rendering of points UI

islands/
  ChoreCard.tsx               (~5 lines modified)
    - Accept showPoints prop
    - Hide points for event missions

  ChoreList.tsx               (~3 lines modified)
    - Accept showPoints prop
    - Pass to ChoreCard

  ChoreAssignmentModal.tsx    (~15 lines modified)
    - Add event dropdown
    - Fetch events for household
```

### Reused Components (No Changes)

- Modal patterns (for add/edit event)
- Form inputs (text, date, time, checkbox)
- Navigation tiles
- Page layouts

---

## Success Metrics

### Phase 1 (First 30 Days)

- 20% of active households create at least one event
- Average 2-4 chores linked per event
- Event mission completion rate > regular chore completion rate
- Zero decrease in overall engagement (points mode change doesn't break existing users)

### Phase 2 (60 Days)

- 5% of new signups are organization-only families (points mode off)
- Event feature mentioned in 10+ user testimonials/reviews
- Average 3+ events per active household
- Parent-reported reduction in "nagging" for event prep

---

## What We DON'T Build (Pareto Principle)

| Feature | Status | Reasoning |
|---------|--------|-----------|
| Calendar grid view | Skip | List view sufficient for MVP, familiar pattern |
| Drag-drop scheduling | Skip | Dropdown is simpler, less code |
| Event templates | Phase 2 | Manual creation sufficient initially |
| Recurring events UI | Phase 2 | DB structure ready, UI deferred for simplicity |
| Multi-day event wizard | Phase 2 | API supports it, hide complexity in MVP |
| Event completion bonuses | Skip (maybe Phase 2) | Violates "no event points", adds complexity |
| Health badges (warning 2/3) | Skip | Checkbox state is sufficient indicator |
| Custom emoji picker | Skip | OS-native emoji keyboard is simpler |
| Event notifications | Phase 2 | Focus on organization first |
| Event sharing/sync | Phase 2 | Single household only in MVP |

**Philosophy:** 20% of features deliver 80% of value. Ship the core loop fast.

---

## Compliance with ChoreGami Principles

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| 20% effort / 80% value | ✅ | ~250 lines for universal org layer |
| No code bloat | ✅ | Reuse existing components, conditional rendering |
| Reuse existing code | ✅ | Modals, forms, ChoreCard, layouts unchanged |
| Simplicity | ✅ | List view > calendar, dropdown > drag-drop, text input > emoji picker |
| Low cognitive load | ✅ | Natural grouping, familiar patterns, clear labels |
| <500 lines per module | ✅ | Largest component ~90 lines (events list page) |
| Future flexibility | ✅ | DB supports recurring/multi-day (UI deferred) |
| Single responsibility | ✅ | Events organize, chores motivate (clear separation) |

---

**END OF DOCUMENT**

Last Updated: January 19, 2026
Version: 2.0 (Universal Design)
