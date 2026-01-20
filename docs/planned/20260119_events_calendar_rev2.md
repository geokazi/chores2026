# Events Calendar: Hybrid Implementation Guide

**Document Created:** January 19, 2026
**Status:** ✅ APPROVED - HYBRID APPROACH SELECTED
**Estimated Effort:** ~8 hours, ~238 lines
**Related Documents:**
- [Events Calendar Integration - Technical Implementation](./20260119_events_calendar_integration.md)
- [Events UI Mockups & Design Decisions](./20260119_events_ui_mockups.md)

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

### ✅ Strengths
1. **Calendar grid view** - Visual, familiar pattern
2. **Week navigation** - Easy to scan upcoming week
3. **Comprehensive event form** - All fields parents might need
4. **Multi-select participants** - Including "Everyone" and "Kids" shortcuts
5. **Advanced features ready** - Multi-day, repeating events, location, notes

### ⚠️ Concerns for ChoreGami Migration

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

### Option A: Port Existing MealPlanner UI (Fast but Bloated) ⚠️

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
- ✅ Already built, tested, deployed
- ✅ No mockup-to-code translation errors
- ✅ Multi-day and repeating events work day one

**Cons:**
- ❌ Violates Pareto principle (80% of features for 20% of users)
- ❌ Calendar grid is overkill for "today's soccer practice"
- ❌ Points display conflicts with our philosophy
- ❌ Heavier cognitive load than list view
- ❌ ~400+ lines of UI code (larger than our target)

---

### Option B: Build Simplified List View (Slower but Aligned) ⭐

**Estimated effort:** 7-9 hours (as originally estimated)

**What you'd build:**
- Simple list view (today, this week, upcoming)
- Minimal event form (name, emoji, date, time, participants)
- Dropdown integration with chore assignment
- No points display in UI

**Pros:**
- ✅ Aligns with Pareto principle
- ✅ Lighter cognitive load for parents
- ✅ No points leakage into event UI
- ✅ Cleaner integration story
- ✅ Matches our design philosophy

**Cons:**
- ❌ More upfront work
- ❌ Multi-day/repeating events deferred to Phase 2
- ❌ Have to build from scratch despite existing code

---

## My Recommendation: **Hybrid Approach** 🎯

**Reuse the backend, simplify the frontend.**

### What to Reuse from MealPlanner
1. ✅ **API endpoints** - Event CRUD already works
2. ✅ **Database schema** - `family_events`, `family_event_participants`
3. ✅ **Backend logic** - Event validation, participant linking
4. ✅ **Event form component structure** - Just strip out complexity

### What to Rebuild for ChoreGami
1. ❌ **Calendar grid** → Build simple list view instead
2. ❌ **Participant selection with points** → Hide points display
3. ❌ **"Add preparation task" checkbox** → Replace with chore assignment integration
4. ❌ **Advanced fields** → Hide multi-day, location, notes in MVP

---

## Concrete Implementation Plan

### Step 1: Minimal Event Form (2 hours)

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

### Step 2: Simple List View (3 hours)

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

### Step 3: Hide Points in Participant Selection (30 min)

**Modify your existing ParticipantSelect component:**

```tsx
// islands/ParticipantSelect.tsx (from MealPlanner)

interface ParticipantSelectProps {
  participants: FamilyMember[];
  selected: string[];
  onChange: (ids: string[]) => void;
  showPoints?: boolean; // NEW PROP
}

export function ParticipantSelect({ 
  participants, 
  selected, 
  onChange,
  showPoints = true  // Default to true for MealPlanner backward compat
}: ParticipantSelectProps) {
  return (
    <div>
      <label>Who is participating?</label>
      {participants.map(p => (
        <button 
          key={p.id}
          onClick={() => toggle(p.id)}
          className={selected.includes(p.id) ? 'selected' : ''}
        >
          {p.name}
          {showPoints && ` (${p.total_points} pts)`}  // Conditional display
        </button>
      ))}
      <button onClick={() => selectAll()}>Everyone</button>
      <button onClick={() => selectKids()}>Kids</button>
    </div>
  );
}
```

**Lines changed: ~3** (one prop, one conditional)

### Step 4: Chore Assignment Integration (2 hours)

**This is the key piece missing from MealPlanner:**

```tsx
// islands/ChoreAssignmentModal.tsx (modify existing)

export function ChoreAssignmentModal({ /* ... */ }) {
  const events = useEvents(householdId); // NEW: fetch events
  
  return (
    <Modal>
      {/* Existing fields */}
      <ChoreSelect />
      <PointsInput />
      <AssignToSelect />
      
      {/* NEW: Event dropdown */}
      <Select 
        label="📅 Link to Event (optional)"
        name="family_event_id"
        options={[
          { value: null, label: "(none)" },
          ...events.map(e => ({
            value: e.id,
            label: `${e.emoji} ${e.name} (${formatDate(e.event_date)})`
          }))
        ]}
      />
      
      <Button>Save</Button>
    </Modal>
  );
}
```

**Lines added: ~15**

---

## Estimated Effort Comparison

| Approach | Frontend Lines | Time | Complexity | Alignment with Design |
|----------|----------------|------|------------|---------------------|
| **Port MealPlanner UI** | ~400 lines | 3-4 hrs | High (calendar grid) | ⚠️ Medium (points display issue) |
| **Build from mockups** | ~230 lines | 7-9 hrs | Medium | ✅ Perfect |
| **Hybrid (recommended)** | ~140 lines | 5-6 hrs | Low | ✅ Perfect |

---

## My Recommendation: Hybrid Approach

### Reuse These Components (3 hours)
1. Event form structure (strip to essentials)
2. Participant selection (add showPoints prop)
3. Date/time pickers (as-is)
4. API endpoints (no changes)

### Build New (3 hours)
1. Simple list view (not calendar grid)
2. Event dropdown in chore assignment
3. EventCard component for list
4. Kid dashboard grouping

**Total: ~6 hours, ~140 new lines, perfect alignment with design**

---

## Critical Question for You

**Does MealPlanner use the points display in participant selection for any logic?**

If yes (e.g., "assign meal prep to person with most points"), then we need to keep points in the data but hide in ChoreGami UI.

If no (it's just informational), then we can simply pass `showPoints={false}` and call it a day.

**Decision Made:** ✅ **Option C - Hybrid Approach** (reuse backend, simplify frontend)

---

## Implementation Roadmap

Since MealPlanner doesn't use points for logic, this is a clean 3-line change to hide them in ChoreGami.

---

## Implementation Roadmap

### Phase 1: Backend (Already Done ✅)
- API endpoints exist in MealPlanner
- Database schema exists
- Just need to add `family_event_id` to chore_assignments if not already there

### Phase 2: ChoreGami Frontend (~6 hours, ~140 lines)

Let me break this into discrete tasks you can tackle sequentially:

---

## Task Breakdown

### Task 1: Add Event Dropdown to Chore Assignment (1 hour, ~15 lines)

**File:** `islands/ChoreAssignmentModal.tsx` or similar

**What to add:**

```tsx
// At top of component
const { data: events } = useFetch<FamilyEvent[]>(
  `/api/events?household_id=${householdId}`
);

// In the form, after existing fields
<label>
  📅 Link to Event (optional)
  <select name="family_event_id">
    <option value="">(none)</option>
    {events?.map(event => (
      <option key={event.id} value={event.id}>
        {event.emoji} {event.name} ({formatEventDate(event)})
      </option>
    ))}
  </select>
</label>
```

**Helper function:**
```tsx
function formatEventDate(event: FamilyEvent): string {
  const date = new Date(event.event_date);
  const time = event.event_time 
    ? ` ${formatTime(event.event_time)}` 
    : event.is_all_day ? ' (All day)' : '';
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${time}`;
}
// Example output: "Tue Jan 21 5:00 PM"
```

**Test it:**
1. Open chore assignment modal
2. Dropdown shows events from MealPlanner
3. Select event, save chore
4. Verify `family_event_id` saved in database

**Estimated: 1 hour** (mostly testing)

---

### Task 2: Hide Points in Participant Selection (15 min, ~3 lines)

**File:** Your existing `ParticipantSelect` component from MealPlanner

**Change 1 - Add prop:**
```tsx
interface ParticipantSelectProps {
  // ... existing props
  showPoints?: boolean; // NEW
}

export function ParticipantSelect({ 
  participants, 
  selected, 
  onChange,
  showPoints = true  // Default true for MealPlanner backward compat
}: ParticipantSelectProps) {
```

**Change 2 - Conditional render:**
```tsx
// In the render, find where you show points
<button>
  {participant.name}
  {showPoints && ` (${participant.total_points} pts)`} {/* Add conditional */}
</button>
```

**Change 3 - Use in ChoreGami:**
```tsx
// In your ChoreGami event form
<ParticipantSelect 
  participants={familyMembers}
  selected={selectedIds}
  onChange={setSelectedIds}
  showPoints={false}  // Hide for ChoreGami
/>
```

**Test it:**
1. Open "Add Event" in ChoreGami
2. Participant buttons show just names (no points)
3. Open "Add Meal" in MealPlanner (if you want to verify)
4. Participant buttons show names with points (backward compat)

**Estimated: 15 min**

---

### Task 3: Points Mode Detection Utility (30 min, ~15 lines)

**File:** `utils/household.ts` (new file)

```tsx
export function usePointsMode(householdId: string): boolean {
  // Option 1: Check explicit setting (if you add the column)
  // const household = getHousehold(householdId);
  // return household.use_points ?? true;
  
  // Option 2: Infer from usage (simpler, no DB change)
  const chores = getChores(householdId);
  return chores.some(c => c.points > 0);
}

export interface GroupedChores {
  events: Array<{
    event: FamilyEvent;
    chores: Chore[];
  }>;
  unlinked: Chore[];
}

export function groupChoresByEvent(chores: Chore[]): GroupedChores {
  const eventMap = new Map<string, { event: FamilyEvent; chores: Chore[] }>();
  const unlinked: Chore[] = [];
  
  for (const chore of chores) {
    if (chore.family_event_id && chore.family_event) {
      if (!eventMap.has(chore.family_event_id)) {
        eventMap.set(chore.family_event_id, {
          event: chore.family_event,
          chores: []
        });
      }
      eventMap.get(chore.family_event_id)!.chores.push(chore);
    } else {
      unlinked.push(chore);
    }
  }
  
  return {
    events: Array.from(eventMap.values()),
    unlinked
  };
}
```

**Test it:**
```tsx
// In kid dashboard loader
const chores = await getChoresForKid(kidId);
const grouped = groupChoresByEvent(chores);
console.log(grouped); 
// Should show: { events: [{event: {...}, chores: [...]}, ...], unlinked: [...] }
```

**Estimated: 30 min**

---

### Task 4: Kid Dashboard Event Grouping (2 hours, ~40 lines)

**File:** `routes/kid/dashboard.tsx`

**Modify loader to include event data:**
```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ... existing code to get chores
  
  // NEW: Group chores by event
  const grouped = groupChoresByEvent(chores);
  
  return json({
    profile: kid,
    household,
    family_goal: goalData,
    grouped_chores: grouped, // NEW
    show_points: usePointsMode(household.id) // NEW
  });
};
```

**Update component:**
```tsx
export default function KidDashboard() {
  const { profile, grouped_chores, show_points, family_goal } = useLoaderData<typeof loader>();
  
  return (
    <div class="kid-dashboard">
      {/* Header */}
      <header>
        <h1>👋 {profile.name}'s Dashboard</h1>
        {show_points && (
          <div class="points">{profile.total_points} points</div>
        )}
      </header>
      
      {/* Family Goal - only if points enabled */}
      {show_points && <FamilyGoalWidget goal={family_goal} />}
      
      {/* Event mission groups */}
      {grouped_chores.events.map(({ event, chores }) => (
        <EventMissionGroup
          key={event.id}
          event={event}
          chores={chores}
        />
      ))}
      
      {/* Regular chores */}
      {grouped_chores.unlinked.length > 0 && (
        <section>
          <h2 class="section-header">
            {show_points ? "📋 Earn Points Today" : "📋 Other Tasks Today"}
          </h2>
          <ChoreList 
            chores={grouped_chores.unlinked} 
            showPoints={show_points}
          />
        </section>
      )}
    </div>
  );
}
```

**Estimated: 2 hours** (mostly updating existing component structure)

---

### Task 5: EventMissionGroup Component (1 hour, ~40 lines)

**File:** `islands/EventMissionGroup.tsx` (new)

```tsx
import { FamilyEvent, Chore } from "@/types";
import { ChoreCard } from "./ChoreCard.tsx";

interface EventMissionGroupProps {
  event: FamilyEvent;
  chores: Chore[];
}

export function EventMissionGroup({ event, chores }: EventMissionGroupProps) {
  const allComplete = chores.every(c => c.completed);
  const completedCount = chores.filter(c => c.completed).length;
  
  return (
    <section class="event-mission-group">
      {/* Event header */}
      <div class="event-header">
        <h2>
          {event.emoji} Get Ready for {event.name}!
        </h2>
        {event.event_time && !event.is_all_day && (
          <span class="event-time">
            Today at {formatTime(event.event_time)}
          </span>
        )}
        {event.is_all_day && (
          <span class="event-time">All day</span>
        )}
      </div>
      
      {/* Celebration if all complete */}
      {allComplete && (
        <div class="celebration">
          🎉 All set for {event.name}! 🎉<br/>
          You're ready to go!
        </div>
      )}
      
      {/* Mission list */}
      <div class="mission-list">
        {chores.map(chore => (
          <ChoreCard 
            key={chore.id} 
            chore={chore} 
            showPoints={false}  // NEVER show points for event missions
          />
        ))}
      </div>
      
      {/* Progress indicator */}
      {!allComplete && (
        <div class="progress-message">
          Complete all {chores.length} to be ready! ✨
        </div>
      )}
    </section>
  );
}

// Helper
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}
```

**Styling (add to existing CSS):**
```css
.event-mission-group {
  margin-bottom: 2rem;
  border-left: 4px solid #8b5cf6; /* Purple accent */
  padding-left: 1rem;
}

.event-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
}

.event-time {
  font-size: 0.875rem;
  color: #6b7280;
}

.celebration {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  margin: 1rem 0;
  font-weight: 600;
}

.progress-message {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.mission-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

**Estimated: 1 hour**

---

### Task 6: Modify ChoreCard for showPoints (15 min, ~5 lines)

**File:** `islands/ChoreCard.tsx`

**Add prop:**
```tsx
interface ChoreCardProps {
  chore: Chore;
  showPoints?: boolean; // NEW
}

export function ChoreCard({ chore, showPoints = true }: ChoreCardProps) {
  // ... existing code
  
  return (
    <div class="chore-card">
      <Checkbox chore={chore} />
      <ChoreDetails chore={chore} />
      
      {/* Conditionally show points */}
      {showPoints && (
        <div class="points-bubble">
          +{chore.points} pts
        </div>
      )}
    </div>
  );
}
```

**Estimated: 15 min**

---

### Task 7: Parent Events List Page (2 hours, ~80 lines)

**File:** `routes/parent/events.tsx` (new)

```tsx
import { LoaderFunctionArgs, json } from "@deno/fresh";
import { getEvents } from "@/utils/api.ts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household_id");
  
  const events = await getEvents(householdId);
  
  // Group by time
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const thisWeek = events.filter(e => {
    const eventDate = new Date(e.event_date);
    return eventDate >= now && eventDate <= weekFromNow;
  });
  
  const upcoming = events.filter(e => {
    const eventDate = new Date(e.event_date);
    return eventDate > weekFromNow;
  });
  
  return json({ thisWeek, upcoming });
};

export default function EventsPage() {
  const { thisWeek, upcoming } = useLoaderData<typeof loader>();
  
  return (
    <div class="events-page">
      <header class="page-header">
        <h1>📅 Family Events</h1>
        <a href="/parent/events/add" class="btn-primary">
          + Add Event
        </a>
      </header>
      
      {thisWeek.length > 0 && (
        <section>
          <h2 class="section-title">This Week</h2>
          <div class="events-list">
            {thisWeek.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
      
      {upcoming.length > 0 && (
        <section>
          <h2 class="section-title">Upcoming</h2>
          <div class="events-list">
            {upcoming.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
      
      {thisWeek.length === 0 && upcoming.length === 0 && (
        <div class="empty-state">
          <p>No events scheduled yet.</p>
          <a href="/parent/events/add" class="btn-secondary">
            Create your first event
          </a>
        </div>
      )}
    </div>
  );
}
```

**EventCard component:**
```tsx
// islands/EventCard.tsx (reuse from MealPlanner, simplify)
interface EventCardProps {
  event: FamilyEvent & {
    linked_chores?: Array<{ completed: boolean }>;
    participants?: Array<{ name: string }>;
  };
}

export function EventCard({ event }: EventCardProps) {
  const linkedCount = event.linked_chores?.length ?? 0;
  const completedCount = event.linked_chores?.filter(c => c.completed).length ?? 0;
  
  return (
    <div class="event-card">
      <div class="event-card-header">
        <div>
          <div class="event-date">
            {formatDate(event.event_date)}
            {event.event_time && ` at ${formatTime(event.event_time)}`}
            {event.is_all_day && ' (All day)'}
          </div>
          <div class="event-title">
            {event.emoji} {event.name}
          </div>
          <div class="event-meta">
            {event.participants?.map(p => p.name).join(', ')}
            {linkedCount > 0 && (
              <> • {linkedCount} mission{linkedCount !== 1 ? 's' : ''} 
                ({completedCount} done)
              </>
            )}
            {linkedCount === 0 && ' • No missions'}
          </div>
        </div>
      </div>
      
      <div class="event-card-actions">
        <a href={`/parent/events/${event.id}/edit`} class="btn-ghost">
          Edit
        </a>
        <button 
          onClick={() => deleteEvent(event.id)} 
          class="btn-ghost text-red"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

**Estimated: 2 hours** (includes styling)

---

### Task 8: Simplified Event Form (1 hour, ~40 lines)

**File:** `routes/parent/events/add.tsx`

**Start with your MealPlanner form, strip to essentials:**

```tsx
import { ParticipantSelect } from "@/islands/ParticipantSelect.tsx";

export default function AddEventPage() {
  const { familyMembers } = useLoaderData<typeof loader>();
  
  return (
    <div class="modal-overlay">
      <form method="post" class="modal-form">
        <header class="modal-header">
          <h1>📅 Add Event</h1>
          <a href="/parent/events" class="close-btn">✕</a>
        </header>
        
        <div class="form-body">
          <label>
            Event Name *
            <input 
              type="text" 
              name="name" 
              placeholder="e.g., Soccer Practice"
              required 
            />
          </label>
          
          <label>
            Emoji (type or paste)
            <input 
              type="text" 
              name="emoji" 
              placeholder="⚽" 
              maxLength={2}
            />
            <small class="hint">
              💡 Tip: Use your keyboard's emoji picker (Win + . or Ctrl + Cmd + Space)
            </small>
          </label>
          
          <label>
            Date *
            <input 
              type="date" 
              name="event_date" 
              required 
            />
          </label>
          
          <label>
            Time
            <input 
              type="time" 
              name="event_time" 
            />
          </label>
          
          <label class="checkbox-label">
            <input type="checkbox" name="is_all_day" />
            All day event
          </label>
          
          <ParticipantSelect 
            participants={familyMembers}
            selected={[]}
            onChange={() => {}}
            showPoints={false}  // Hide points for ChoreGami
          />
        </div>
        
        <footer class="modal-footer">
          <a href="/parent/events" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary">Save Event</button>
        </footer>
      </form>
    </div>
  );
}
```

**Estimated: 1 hour** (mostly copy-paste from MealPlanner, remove fields)

---

## Complete Timeline

| Task | Time | Lines | Files |
|------|------|-------|-------|
| 1. Event dropdown in chore assignment | 1 hr | ~15 | ChoreAssignmentModal.tsx |
| 2. Hide points in participant select | 15 min | ~3 | ParticipantSelect.tsx |
| 3. Points mode utility | 30 min | ~15 | utils/household.ts |
| 4. Kid dashboard grouping | 2 hr | ~40 | routes/kid/dashboard.tsx |
| 5. EventMissionGroup component | 1 hr | ~40 | islands/EventMissionGroup.tsx |
| 6. ChoreCard showPoints prop | 15 min | ~5 | islands/ChoreCard.tsx |
| 7. Parent events list page | 2 hr | ~80 | routes/parent/events.tsx |
| 8. Simplified event form | 1 hr | ~40 | routes/parent/events/add.tsx |
| **Total** | **~8 hrs** | **~238 lines** | **8 files** |

---

## Testing Checklist

After each task, test:

### Task 1 Complete
- [ ] Chore assignment dropdown shows events from MealPlanner
- [ ] Can select event and save
- [ ] `family_event_id` appears in database

### Task 2 Complete
- [ ] ChoreGami event form shows names only (no points)
- [ ] MealPlanner still shows points (backward compat)

### Task 3 Complete
- [ ] `groupChoresByEvent()` returns correct structure
- [ ] Events with chores grouped together
- [ ] Chores without events in `unlinked` array

### Task 4 Complete
- [ ] Kid dashboard shows event groups
- [ ] Regular chores shown separately
- [ ] Points display conditional on household mode

### Task 5 Complete
- [ ] Event mission groups render correctly
- [ ] Celebration appears when all complete
- [ ] Progress message shows when incomplete

### Task 6 Complete
- [ ] Points hidden for event missions
- [ ] Points shown for regular chores (if points mode)

### Task 7 Complete
- [ ] Events list page shows "This Week" and "Upcoming"
- [ ] Edit/Delete buttons work
- [ ] Empty state appears when no events

### Task 8 Complete
- [ ] Can create new event
- [ ] Emoji input works
- [ ] Participants selected correctly
- [ ] No points displayed in UI

---

## What to Do Next

Start with **Task 1** - it's the smallest, most isolated change. Once you see the event dropdown working in chore assignment, everything else builds on that foundation.

---

**END OF DOCUMENT**

Last Updated: January 19, 2026
Version: 1.0 (Hybrid Implementation Guide)
