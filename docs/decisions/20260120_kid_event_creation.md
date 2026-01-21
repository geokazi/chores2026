# Kid Event Creation Decision

**Date**: January 20, 2026
**Status**: Decided
**Decision**: Allow kids to create events with parent visibility, gated by existing PIN system

## Context

ChoreGami currently restricts event creation to parents only (`/parent/events`). However, the family device scenario raises a question:

> "What about age-appropriate kids (teens) who want to add their own activities?"

### Current State
- Parents create events at `/parent/events`
- Kids see events they're participating in via "Coming Up" section
- Kids can mark prep tasks done but cannot create/edit events
- Existing PIN system gates dashboard access (optional family setting)

### Use Case
1. Parent logs into family device
2. Teen takes over to add their basketball practice, study group, etc.
3. Parent maintains full visibility of all events
4. Both parent and kid benefit from reduced coordination friction

## Market Analysis

| App | Kid Event Creation | PIN/Auth | Parent Visibility |
|-----|-------------------|----------|-------------------|
| Cozi | Yes (anyone) | No | Yes (shared calendar) |
| OurHome | Parents only | N/A | N/A |
| Google Family | Yes (anyone) | No | Yes |
| FamCal | Yes (anyone) | No | Yes |
| **ChoreGami (proposed)** | Yes (PIN-gated) | Yes | Yes |

**Gap in market**: No app offers **PIN-gated kid event creation with parent oversight**.

## Options Considered

### Option A: Keep Parent-Only (Current State)
- **Effort**: 0
- **Pros**: Simple, no abuse potential
- **Cons**: Teens can't add their own activities
- **Pareto Score**: 100/0 (no work, no new value)

### Option B: Open to Everyone (No PIN)
- **Effort**: 1 hour
- **Pros**: Maximum flexibility
- **Cons**: Younger kids could create spam/inappropriate events
- **Pareto Score**: 60/40

### Option C: Simple Toggle + Existing PIN (Recommended) :white_check_mark:
- **Effort**: 2 hours
- **Pros**: Leverages existing PIN system, parent control, teen autonomy
- **Cons**: Slight complexity increase
- **Pareto Score**: 85/15

### Option D: Separate "Events PIN" System
- **Effort**: 4-6 hours
- **Pros**: Fine-grained control
- **Cons**: Over-engineering, confusing UX (multiple PINs)
- **Pareto Score**: 40/60

## Decision

**Option C: Simple Toggle + Existing PIN**

### How It Works

1. **New setting in `/parent/settings`:**
   ```
   +----------------------------------------+
   | Event Creation                     |
   |                                        |
   | Kids can create events          [OFF]  |
   | Kids add their own activities;     |
   | parents see everything                 |
   +----------------------------------------+
   ```

2. **When setting is ON:**
   - Kids see "+ Add Event" button in "Coming Up" section
   - Uses existing `AddEventModal` component (reuse)
   - If Kid PIN is enabled for family, PIN required before creating
   - Events tagged with `created_by_profile_id`

3. **Parent visibility:**
   - All events visible in `/parent/events` regardless of creator
   - Events show "Added by Emma" badge when created by kids
   - Parents can edit/delete any event

### Implementation Summary

| Component | Change |
|-----------|--------|
| `families.settings` | Add `apps.choregami.kids_can_create_events` boolean |
| `islands/KidDashboard.tsx` | Add "+ Add Event" button (conditional) |
| `routes/api/events.ts` | Accept kid session when setting enabled |
| `/parent/settings` | Add toggle UI |

### Security Model

- **Toggle OFF (default)**: Current behavior - parents only
- **Toggle ON + Kid PIN disabled**: Kids create events freely
- **Toggle ON + Kid PIN enabled**: PIN required before creating
- **All events visible to parents**: No hiding, full transparency

## Why This Is a Differentiator

Most chore/family apps fall into two camps:
1. **Parent-controlled**: Kids are passive task-completers
2. **Fully open**: No accountability for who adds what

**ChoreGami's approach:**
- Teens get autonomy to manage their schedules
- Parents maintain oversight without micromanaging
- Trust is earned through PIN responsibility
- Teaches kids scheduling/planning skills

This positions ChoreGami for the "responsible teen" market segment that's currently underserved.

## Action Items

- [x] Implement family setting: `kids_can_create_events`
- [x] Add toggle to `/parent/settings`
- [x] Add "+ Add Event" to kid "Coming Up" section (conditional)
- [x] Update API to accept kid sessions (when enabled)
- [x] Add "Added by [name]" badge to events
- [x] Update documentation
- [x] Add unit tests

**Implementation Complete**: January 20, 2026 (commit `d8ebdfe`)

## Related Documents

- [Implementation Details](../milestones/20260120_kid_event_creation.md) - Detailed implementation guide
- [Events & Prep Tasks](../milestones/20260120_events_prep_tasks_implementation.md) - Base events feature
- [Business Requirements](../business-requirements.md) - Product specifications
- [Architecture](../architecture.md) - Technical design

---

**Principle Applied**: Trust teens with responsibility while maintaining parent oversight. Same philosophy as the existing PIN system - graduated autonomy.

*Decision made: January 20, 2026*
