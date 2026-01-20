# Events Calendar Integration - Technical Implementation
**Document Created:** January 19, 2026
**Status:** APPROVED FOR IMPLEMENTATION
**Related Documents:**
- [Events UI Mockups & Design Decisions](./20260119_events_ui_mockups.md)
- [Critical Analysis: MealPlanner vs Mockups (Hybrid Approach)](./20260119_events_calendar_rev2.md)

## Core Philosophy

**Events are universal organizational containers that work regardless of gamification philosophy.**

Events serve as a coordination layer for families to organize tasks around real-world activities (soccer practice, dentist appointments, camping trips). This feature works for:

- ✅ **Gamification-focused families** - Current ChoreGami users who use points/rewards
- ✅ **Organization-only families** - New user segment who want coordination without gamification
- ✅ **Hybrid families** - Use points for some things, not others

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

## Implementation Estimate

### Phase 1: Core Event Management (4 hours)

```
Task                              Lines    Time
─────────────────────────────────────────────────
1. Add usePointsMode utility        15     30min
2. Modify ChoreCard for showPoints   5     30min
3. Build EventMissionGroup          40     1hr
4. Update kid dashboard grouping    25     1hr
5. Build parent events list page    90     2hr
─────────────────────────────────────────────────
TOTAL                              175     5hr
```

### Phase 2: Event Creation (3 hours)

```
Task                              Lines    Time
─────────────────────────────────────────────────
6. Add event dropdown to chore form 15     1hr
7. Build add/edit event modal       40     2hr
8. Add nav tile to parent dash       5    30min
─────────────────────────────────────────────────
TOTAL                               60    3.5hr
```

### Phase 3: Polish (1 hour)

```
Task                              Lines    Time
─────────────────────────────────────────────────
9. Celebration animations            5    30min
10. Loading states                   5    15min
11. Error handling                   5    15min
─────────────────────────────────────────────────
TOTAL                               15     1hr
```

**Grand Total: ~250 lines, ~9.5 hours**

---

## Site Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAVIGATION STRUCTURE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /parent/dashboard                                          │
│       │                                                     │
│       ├── /parent/settings      (configuration)             │
│       │                                                     │
│       ├── /parent/reports       (analytics)                 │
│       │                                                     │
│       └── /parent/events        (event management) ◄── NEW  │
│                                                             │
│  /kid/dashboard                 (missions grouped by event) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## User Flows

### Parent: Create Event and Link Chores

1. **Parent Dashboard** → Click "Events" tile
2. **Events page** → Click [+ Add Event]
3. **Add Event Modal:**
   - Enter: Name, Emoji, Date, Time
   - Select: Participants (family members)
   - Click [Save Event]
4. **Back to Events page** → Event appears in list
5. **Navigate to chore assignment** (existing flow)
6. **Assign Chore Modal:**
   - Select chore from template
   - Assign to kid
   - Set points (0 or more, optional)
   - **NEW:** Select event from dropdown (optional)
   - Click [Save]
7. **Chore is now linked to event**

**Time: ~2 minutes** (familiar flow with one new dropdown)

### Kid: Complete Event Missions

1. **Kid Dashboard** loads
2. **See grouped missions:**
   - "⚽ Get Ready for Soccer Practice! (5:00 PM)"
   - 3 tasks listed (no points shown)
3. **Tap checkboxes** to complete tasks
4. **Progress updates:** "Complete all 3 to be ready!"
5. **All complete:** "🎉 All set for Soccer! You're ready to go!"
6. **Regular chores** shown separately below (with or without points depending on household mode)

**Time: ~30 seconds** (faster than scattered chore list)

---

## UI Variations by Household Type

### Gamification Family (Points Mode ON)

**Kid Dashboard:**
```
┌─────────────────────────────────────────┐
│  👋 Alex                                │
│  142 points                             │
├─────────────────────────────────────────┤
│  🎯 Family Goal This Week               │
│  $4 of $20                         20%  │
├─────────────────────────────────────────┤
│  ⚽ Get Ready for Soccer Practice!      │
│  Today at 5:00 PM                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ☐  🎒 Pack soccer bag                  │  ← No points shown
│  ☐  💧 Fill water bottle                │
│  ☐  👕 Wash uniform                     │
│                                         │
│  📋 Earn Points Today                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ☐  🛏️ Make bed             +3 pts     │  ← Points shown
│  ☐  🦷 Brush teeth          +2 pts     │
└─────────────────────────────────────────┘
```

### Organization Family (Points Mode OFF)

**Kid Dashboard:**
```
┌─────────────────────────────────────────┐
│  👋 Alex                                │
├─────────────────────────────────────────┤
│  ⚽ Get Ready for Soccer Practice!      │
│  Today at 5:00 PM                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ☐  🎒 Pack soccer bag                  │
│  ☐  💧 Fill water bottle                │
│  ☐  👕 Wash uniform                     │
│                                         │
│  📋 Other Tasks Today                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ☐  🛏️ Make bed                         │
│  ☐  🦷 Brush teeth                      │
│  ☐  🐕 Feed dog                         │
└─────────────────────────────────────────┘
```

**Key differences:**
- No point counter in header
- No Family Goal widget
- No "+X pts" anywhere
- Identical layout otherwise
- **Same codebase** - just conditional rendering

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
| Health badges (⚠️ 2/3) | Skip | Checkbox state is sufficient indicator |
| Custom emoji picker | Skip | OS-native emoji keyboard is simpler |
| Event notifications | Phase 2 | Focus on organization first |
| Event sharing/sync | Phase 2 | Single household only in MVP |

**Philosophy:** 20% of features deliver 80% of value. Ship the core loop fast.

---

## Marketing Implications

### Two User Segments, One Feature

**Segment 1: Current Users (Gamification-focused)**
- **Pain:** Event prep tasks at 0 points are demotivating
- **Solution:** Event framing provides natural motivation without points
- **Pitch:** "Organize event prep without disrupting your points economy"

**Segment 2: New Users (Organization-only)**
- **Pain:** Existing chore apps are too gamified for their parenting philosophy
- **Solution:** ChoreGami works perfectly without any gamification
- **Pitch:** "Simple family task coordination - use points or don't, up to you"

**Positioning shift:**
- **Before:** "ChoreGami is a gamified chore tracker"
- **After:** "ChoreGami is a family coordination tool (with optional gamification)"

---

## Success Metrics

### Phase 1 (First 30 Days)

- ✅ 20% of active households create at least one event
- ✅ Average 2-4 chores linked per event
- ✅ Event mission completion rate > regular chore completion rate
- ✅ Zero decrease in overall engagement (points mode change doesn't break existing users)

### Phase 2 (60 Days)

- ✅ 5% of new signups are organization-only families (points mode off)
- ✅ Event feature mentioned in 10+ user testimonials/reviews
- ✅ Average 3+ events per active household
- ✅ Parent-reported reduction in "nagging" for event prep

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Confusion about missing points | Medium | Medium | Clear UI labels: "Get Ready for..." framing |
| Organization-only families don't find ChoreGami | Low | High | Add "no points mode" to marketing, onboarding question |
| Event feature adds too much complexity | Low | High | Strict Pareto discipline: skip calendar grid, drag-drop, etc. |
| Parents don't link chores to events | Medium | Low | Make dropdown prominent, add tooltip: "Link to help kids prepare" |
| Kids complete event missions but forget event | Low | Low | Natural consequence teaches responsibility better than app |

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
- Recurring events UI (weekly soccer practice)
- Event templates (school morning routine, sports prep, travel packing)
- Event completion bonuses (if users request)
- Calendar grid view (if list view proves insufficient)
- Event notifications (1 hour before, 1 day before)

### Phase 3 Features
- Multi-household event sharing (carpool coordination)
- Location-based event reminders (geofencing)
- Integration with external calendars (Google Cal, Apple Cal)
- AI-suggested chores based on event type
- Event history and insights ("You've been to 24 soccer practices this season!")

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

## References

- **Events UI Mockups & Design Decisions** - Visual design and user flows
- **MealPlanner Events API** - Reused database schema and endpoints
- **choretracker.family_events table** - Existing schema documentation
- **Overjustification Effect Research** - Why hiding points for intrinsically motivated tasks works
- **Identity-based motivation** - Why "missions" language is effective with children

---

## Appendix: Code Samples

### Points Mode Detection

```typescript
// utils/household.ts
export function usePointsMode(householdId: string): boolean {
  const household = getHousehold(householdId);
  
  // Explicit setting (if added to schema)
  if (household.use_points !== undefined) {
    return household.use_points;
  }
  
  // Infer from usage (backward compatible)
  const chores = getChores(householdId);
  return chores.some(c => c.points > 0);
}

export function groupChoresByEvent(chores: Chore[]): GroupedChores {
  const events = new Map<string, EventGroup>();
  const unlinked: Chore[] = [];
  
  for (const chore of chores) {
    if (chore.family_event_id) {
      if (!events.has(chore.family_event_id)) {
        events.set(chore.family_event_id, {
          event: chore.family_event,
          chores: []
        });
      }
      events.get(chore.family_event_id)!.chores.push(chore);
    } else {
      unlinked.push(chore);
    }
  }
  
  return { events: Array.from(events.values()), unlinked };
}
```

### Modified ChoreCard

```typescript
// islands/ChoreCard.tsx
interface ChoreCardProps {
  chore: Chore;
  showPoints?: boolean; // NEW: defaults to true for backward compat
}

export function ChoreCard({ chore, showPoints = true }: ChoreCardProps) {
  const isEventMission = chore.family_event_id !== null;
  
  // Hide points if:
  // 1. Household has points mode OFF, OR
  // 2. Chore is linked to event (natural motivation)
  const displayPoints = showPoints && !isEventMission;
  
  return (
    <div class="chore-card">
      <Checkbox chore={chore} />
      <ChoreDetails chore={chore} />
      
      {displayPoints && (
        <PointsBubble points={chore.points} />
      )}
    </div>
  );
}
```

### Kid Dashboard Integration

```typescript
// routes/kid/dashboard.tsx
export default function KidDashboard({ data }: PageProps<DashboardData>) {
  const showPoints = usePointsMode(data.household.id);
  const grouped = groupChoresByEvent(data.chores);
  
  return (
    <div class="kid-dashboard">
      {/* Header - conditional points display */}
      <header>
        <h1>👋 {data.profile.name}'s Dashboard</h1>
        {showPoints && <div class="points">{data.profile.total_points} points</div>}
      </header>
      
      {/* Family Goal - only if points enabled */}
      {showPoints && <FamilyGoalWidget goal={data.family_goal} />}
      
      {/* Event mission groups - NEVER show points */}
      {grouped.events.map(eventGroup => (
        <EventMissionGroup
          key={eventGroup.event.id}
          event={eventGroup.event}
          chores={eventGroup.chores}
          showPoints={false} // Always false for events
        />
      ))}
      
      {/* Regular chores - respect points mode */}
      {grouped.unlinked.length > 0 && (
        <section>
          <h2>{showPoints ? "📋 Earn Points Today" : "📋 Other Tasks Today"}</h2>
          <ChoreList chores={grouped.unlinked} showPoints={showPoints} />
        </section>
      )}
    </div>
  );
}
```

### Event Mission Group Component

```typescript
// islands/EventMissionGroup.tsx
interface EventMissionGroupProps {
  event: FamilyEvent;
  chores: Chore[];
  showPoints: boolean; // Will always be false, but keeping consistent API
}

export function EventMissionGroup({ event, chores, showPoints }: EventMissionGroupProps) {
  const allComplete = chores.every(c => c.completed);
  const completedCount = chores.filter(c => c.completed).length;
  
  return (
    <section class="event-mission-group">
      {/* Event header */}
      <h2 class="event-header">
        {event.emoji} Get Ready for {event.name}!
        {event.event_time && (
          <span class="event-time">
            {event.is_all_day ? "All day" : formatTime(event.event_time)}
          </span>
        )}
      </h2>
      
      {/* Celebration message if all complete */}
      {allComplete && (
        <div class="celebration">
          🎉 All set for {event.name}! 🎉<br/>
          You're ready to go!
        </div>
      )}
      
      {/* Chore list - no points displayed */}
      <div class="mission-list">
        {chores.map(chore => (
          <ChoreCard 
            key={chore.id} 
            chore={chore} 
            showPoints={false} // Never show points for event missions
          />
        ))}
      </div>
      
      {/* Progress indicator (only if not complete) */}
      {!allComplete && (
        <div class="progress-message">
          Complete all {chores.length} to be ready! ✨
        </div>
      )}
    </section>
  );
}
```

---

**END OF DOCUMENT**

Last Updated: January 19, 2026
Version: 2.0 (Universal Design)