# Kid Event Creation Feature

**Status**: ✅ Implemented
**Priority**: Medium
**Actual Effort**: ~1 hour
**Date**: January 20, 2026
**Commit**: `d8ebdfe`

## Overview

Allow kids (especially teens) to create their own events with parent visibility. Leverages existing PIN system for access control - no new authentication mechanisms required.

## Problem Statement

Currently, only parents can create events. In families with responsible teens on shared devices:
- Teens can't add their basketball practice, study group, etc.
- Parents become a bottleneck for schedule coordination
- Missed opportunity for teaching scheduling/planning skills

## Proposed Solution

### Family Setting Toggle

Add a new setting in `/parent/settings`:

```
+----------------------------------------+
| Event Creation                     |
|                                        |
| Kids can create events          [OFF]  |
| Kids add their own activities;     |
| parents see everything                 |
+----------------------------------------+
```

### Kid Dashboard UI

When enabled, show "+ Add Event" in the "What's Next" section:

```
+----------------------------------------+
| What's Next                    [+ Add]  |
|----------------------------------------|
| Basketball practice                    |
| Tomorrow at 4:00 PM                    |
|   Your missions:                   |
|     [ ] Pack basketball bag            |
+----------------------------------------+
```

### Access Control Matrix

| Family Setting | Kid PIN Setting | Behavior |
|----------------|-----------------|----------|
| OFF (default) | Any | Kids cannot create events |
| ON | PIN Disabled | Kids create events freely |
| ON | PIN Enabled | PIN required before creating |

## Technical Implementation

### 1. Database Schema

Add to `families.settings` JSONB:

```json
{
  "apps": {
    "choregami": {
      "kids_can_create_events": false
    }
  }
}
```

### 2. API Changes

**File**: `routes/api/events.ts`

```typescript
// In POST handler, add kid session check
async POST(req) {
  const cookies = getCookies(req.headers);
  const accessToken = cookies["sb-access-token"];

  // Check if request is from kid session
  const kidSessionId = cookies["active-kid-id"];

  if (kidSessionId) {
    // Verify family allows kid event creation
    const { data: family } = await client
      .from("families")
      .select("settings")
      .eq("id", familyId)
      .single();

    const kidsCanCreate = family?.settings?.apps?.choregami?.kids_can_create_events;

    if (!kidsCanCreate) {
      return new Response(JSON.stringify({ error: "Kids cannot create events" }), {
        status: 403
      });
    }

    // Use kid profile as creator
    creatorProfileId = kidSessionId;
  }

  // ... rest of event creation logic
}
```

### 3. Settings UI

**File**: `islands/FamilySettings.tsx`

Add toggle in settings card:

```tsx
<div class="card">
  <h3>Event Creation</h3>
  <label>
    <input
      type="checkbox"
      checked={settings.kids_can_create_events}
      onChange={() => updateSetting('kids_can_create_events', !settings.kids_can_create_events)}
    />
    Kids can create events
  </label>
  <p class="hint">Kids add their own activities; parents see everything</p>
</div>
```

### 4. Kid Dashboard Button

**File**: `islands/KidDashboard.tsx`

Add conditional button to "What's Next" section:

```tsx
{kidsCanCreateEvents && (
  <button
    onClick={() => setShowAddEventModal(true)}
    class="btn btn-secondary btn-sm"
  >
    + Add
  </button>
)}

{showAddEventModal && (
  <AddEventModal
    isOpen={showAddEventModal}
    onClose={() => setShowAddEventModal(false)}
    familyMembers={familyMembers}
    onSuccess={handleEventCreated}
    creatorId={kid.id}  // Pass kid as creator
  />
)}
```

### 5. Event Creator Badge

**File**: `islands/EventsList.tsx` (parent events page)

Show who created each event:

```tsx
{event.created_by_profile_id !== currentParentId && (
  <span class="badge badge-info">
    Added by {getCreatorName(event.created_by_profile_id)}
  </span>
)}
```

### 6. Props Propagation

**File**: `islands/SecureKidDashboard.tsx`

Fetch and pass the setting:

```typescript
// Fetch family settings
const { data: familySettings } = await supabase
  .from("families")
  .select("settings")
  .eq("id", familyId)
  .single();

const kidsCanCreateEvents = familySettings?.settings?.apps?.choregami?.kids_can_create_events;

// Pass to KidDashboard
<KidDashboard
  ...
  kidsCanCreateEvents={kidsCanCreateEvents}
/>
```

## File Changes Summary

| File | Change Type | Lines (Actual) |
|------|-------------|-------|
| `routes/api/events.ts` | Modify | +127 |
| `routes/api/settings/kids-events.ts` | **Create** | +83 |
| `islands/FamilySettings.tsx` | Modify | +113 |
| `islands/KidDashboard.tsx` | Modify | +86 |
| `islands/SecureKidDashboard.tsx` | Modify | +13 |
| `islands/EventsList.tsx` | Modify | +32 |
| `islands/AddEventModal.tsx` | Modify | +3 |

**Total**: ~458 lines added (actual)

## Testing Plan

### Manual Tests

1. **Setting OFF (default)**
   - [ ] Kids do not see "+ Add" button
   - [ ] API rejects kid event creation with 403

2. **Setting ON, PIN disabled**
   - [ ] Kids see "+ Add" button
   - [ ] Kids can create events without PIN
   - [ ] Events appear in parent events page

3. **Setting ON, PIN enabled**
   - [ ] PIN prompt appears before creating event
   - [ ] After PIN, AddEventModal opens
   - [ ] Event created with kid as creator

4. **Creator badge**
   - [ ] Events created by kids show "Added by [name]"
   - [ ] Events created by parents show no badge

### Edge Cases

- [ ] Kid creates event, then setting turned OFF → existing events remain
- [ ] Multiple kids create events → proper attribution
- [ ] Kid session expires mid-creation → graceful error

## Benefits

| Benefit | Impact |
|---------|--------|
| Teen autonomy | Teaches scheduling/planning |
| Reduced parent friction | No bottleneck for simple additions |
| Family coordination | Shared visibility |
| Differentiator | Unique in market |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Kids create inappropriate events | Parents have full visibility + edit/delete |
| Spam events | PIN requirement adds friction |
| Confusion about who created what | Clear "Added by" attribution |

## Future Enhancements

1. **Per-kid permissions**: Allow specific kids to create events (not all)
2. **Event approval workflow**: Parents approve kid-created events before visible
3. **Notification**: Alert parents when kid creates event

These are Phase 2 - only implement if demand signals indicate need.

## Related Documents

- [Decision Document](../decisions/20260120_kid_event_creation.md) - Why we chose this approach
- [Events & Prep Tasks](./20260120_events_prep_tasks_implementation.md) - Base events feature
- [Business Requirements](../business-requirements.md) - Product specifications
- [Architecture](../architecture.md) - Technical design

---

*Created: January 20, 2026*
*Author: Claude Code AI Assistant*
