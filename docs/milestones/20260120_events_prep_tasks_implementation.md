# Events Calendar & Prep Tasks Implementation

**Status**: ✅ Complete
**Date**: January 19-20, 2026
**Branch**: `claude/review-chores2026-R1g4P`

## Overview

Implemented comprehensive events calendar integration with two types of event-linked items:
1. **Linked Chores** - Full chores with points, stored in `chore_assignments`
2. **Prep Tasks** - Lightweight checklist items without points, stored in event `metadata`

## Features Implemented

### Parent Experience

#### Events Page (`/parent/events`)
- **Event List**: "This Week" and "Upcoming" sections
- **Event Cards**: Show date, time, emoji, prep task count, linked chore count
- **Create Event**: Title, date, time, all-day toggle, participant selection
- **Quick Emoji Picker**: 🏀⚾🩰🏊🎹⚽📅 buttons for common activities
- **Delete Event**: Soft delete with chore unlinking

#### Prep Tasks Modal
- **Batch Creation**: Add multiple prep tasks at once
- **Edit Existing**: Modal loads existing tasks for editing
- **Smart Button**: Shows "Prep (3)" count or "+ Prep Tasks" for empty
- **Auto-Assign**: First participant pre-selected
- **Delete Tasks**: Remove individual tasks with × button

#### Linked Chores
- **"+ Chore" Button**: Opens AddChoreModal with event pre-selected
- **Auto-Select**: First participant and 0 points for event chores
- **Chore Count**: Shows on event card (e.g., "Chores: 1/2")

### Kid Experience

#### Dashboard Integration
- **"Coming Up" Section**: Shows upcoming events kid is participating in
- **Prep Tasks Display**: Tasks shown as "Your missions" under events
- **Task Toggle**: Tap to mark prep tasks done (optimistic UI)
- **Event Missions**: Linked chores grouped by event with hidden points

#### Mission Grouping
- **groupChoresByEvent()**: Utility function groups chores by event
- **usePointsMode()**: Detects if family uses points system
- **Event Header**: Shows emoji, title, date/time for mission groups

## Database Schema

### Existing Table Used
```sql
-- choretracker.family_events (already existed)
CREATE TABLE choretracker.family_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  schedule_data JSONB DEFAULT '{}',    -- {all_day, start_time}
  participants JSONB DEFAULT '[]',     -- [profile_id, ...]
  location_data JSONB DEFAULT '{}',    -- (unused in ChoreGami)
  recurrence_data JSONB DEFAULT '{}',  -- (unused in ChoreGami)
  metadata JSONB DEFAULT '{}',         -- {emoji, source_app, prep_tasks}
  created_by_profile_id UUID REFERENCES family_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);
```

### Prep Tasks Schema (in metadata JSONB)
```json
{
  "emoji": "🏀",
  "source_app": "chores2026",
  "prep_tasks": [
    {
      "id": "uuid",
      "text": "Pack basketball bag",
      "assignee_id": "profile-uuid",
      "done": false
    }
  ]
}
```

### Chore Linking
```sql
-- Added to choretracker.chore_assignments
ALTER TABLE choretracker.chore_assignments
ADD COLUMN family_event_id UUID REFERENCES choretracker.family_events(id);
```

## API Endpoints

### Events API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List family events (today and future) |
| POST | `/api/events` | Create new event |
| GET | `/api/events/[id]` | Get single event |
| PATCH | `/api/events/[id]` | Update event (title, date, metadata) |
| DELETE | `/api/events/[id]` | Soft delete event, unlink chores |
| POST | `/api/events/[id]/prep-task` | Toggle prep task done status |

### Chore API Updates
- `POST /api/chores/create`: Added `familyEventId` parameter

## Files Created/Modified

### New Files
- `islands/AddPrepTasksModal.tsx` - Batch prep task creation/editing
- `islands/EventsList.tsx` - Parent events page component
- `islands/AddEventModal.tsx` - Event creation form
- `islands/EventMissionGroup.tsx` - Kid dashboard mission grouping
- `routes/parent/events.tsx` - Parent events page
- `routes/api/events.ts` - Events list/create API
- `routes/api/events/[id].ts` - Single event API
- `routes/api/events/[id]/prep-task.ts` - Prep task toggle API
- `lib/utils/household.ts` - Event grouping utilities

### Modified Files
- `islands/KidDashboard.tsx` - Added Coming Up section, prep task display
- `islands/SecureKidDashboard.tsx` - Added event/prep task fetching
- `islands/AddChoreModal.tsx` - Added preSelectedEventId/Assignee props
- `islands/AppHeader.tsx` - Added Events nav link
- `routes/api/chores/create.ts` - Added familyEventId support
- `lib/services/chore-service.ts` - Added family_event_id handling

### Test Files
- `routes/api/events_test.ts` - 12 tests for GET/POST events
- `routes/api/events/[id]_test.ts` - 18 tests for GET/PATCH/DELETE
- `routes/api/events/[id]/prep-task_test.ts` - 15 tests for prep task toggle
- `lib/utils/household_test.ts` - 16 tests for utility functions

## UX Decisions

### Language
- **Parents**: "Chores" and "Prep Tasks"
- **Kids**: "Missions" for event-linked items

### Points
- **Linked Chores**: Default 0 points (preparation focus)
- **Prep Tasks**: No points (simple checklist)
- **Regular Chores**: Normal points (gamified)

### Two-Item Model
| Aspect | Prep Tasks | Linked Chores |
|--------|------------|---------------|
| Points | None | Optional (default 0) |
| Storage | Event metadata | chore_assignments table |
| Verification | Kid self-marks | Parent verification flow |
| Batch Create | Yes | No (one at a time) |

## Commits

| Hash | Message |
|------|---------|
| `e8c00c8` | Implement Events Calendar integration with mission grouping |
| `d4aea6f` | Add Upcoming Events section to kid dashboard |
| `594beeb` | Add quick chore linking from event cards |
| `880f2f8` | Auto-select assignee and default 0 points for event chores |
| `335cf14` | Improve event UX: rename to Task, add activity emoji buttons |
| `586e524` | Add prep tasks feature for events |
| `5d01a27` | Enable editing existing prep tasks in modal |
| `4ffce5d` | Add unit tests for events, prep tasks, and utilities |

## Future Enhancements

- [Event Library & Reuse](../planned/20260120_event_library_reuse.md) - Quick recreation of past events
- Event recurrence patterns (weekly practices)
- Calendar view for events
- Integration with external calendars (Google, iCal)

## Related Documents

- [Business Requirements - Epic 3](../business-requirements.md#epic-3-events-calendar-integration)
- [Technical Documentation](../technical-documentation.md#events-api)
- [Architecture](../architecture.md#events-calendar-integration)
- [Original Planning Doc](./20260119_events_calendar_original_plan.md)
- [Revised Planning Doc](./20260119_events_calendar_rev2_plan.md)

---

*Completed: January 20, 2026*
*Author: Claude Code AI Assistant*
