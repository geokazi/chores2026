# Parent Lists Feature Analysis

**Date**: February 10, 2026
**Updated**: February 10, 2026 (with codebase review)
**Status**: Research Complete
**Recommendation**: Do Not Build (Generic Lists) / Enhance Existing Prep Tasks

---

## Executive Summary

Analysis of adding personal list management (todo items, grocery lists) for parents in ChoreGami. After researching competitors, native device capabilities, **and reviewing existing ChoreGami features**, generic list features are not recommended - native apps already solve this well.

**Key Finding**: ChoreGami already has a robust prep tasks system tied to events. The opportunity is enhancing this existing feature, not building new list infrastructure.

---

## What ChoreGami Already Has

### Prep Tasks System (Existing)

**Location**: Event cards → "Prep checklist" button

```typescript
// Data model (in event.metadata.prep_tasks)
interface PrepTask {
  id: string;           // UUID
  text: string;         // "Buy cake mix", "Get balloons"
  assignee_id?: string; // Optional - any family member
  done: boolean;        // Completion checkbox
}
```

**Current capabilities**:
- ✅ Create/edit/delete prep tasks per event
- ✅ Assign to any family member (parents OR kids)
- ✅ Check off as complete
- ✅ Activity logging when tasks completed
- ✅ Progress badge on event card (e.g., "3/5")

**What's missing**:
- ❌ No "shopping" vs "task" categorization
- ❌ No export to native Reminders/Keep
- ❌ No filtering by assignee across events

### Event-Linked Chores (Existing)

**Location**: Event cards → "Chore earns pts" button

```typescript
// Links via foreign key
chore_assignments.family_event_id → family_events.id
```

**Current capabilities**:
- ✅ Create point-earning chores tied to events
- ✅ Assign to kids with due date = event date
- ✅ Shows as "missions" on kid dashboard
- ✅ Completion triggers points + confetti

### Calendar Export (Existing)

**Location**: Event cards → "📅 Add to Calendar" button

- ✅ Downloads .ics file for any event
- ✅ Tracks usage in localStorage
- ✅ Shows "✓ In your calendar" after download

---

## Competitive Landscape

| App | Grocery List | Todo Lists | Price | Unique Angle |
|-----|--------------|------------|-------|--------------|
| **Cozi** | Shared, synced | Family-wide | Free / $39/yr Gold | All-in-one hub, AI conflict detection |
| **OurHome** | Meal plan → auto-populates | Chore tasks | Free | Gamification + lists combined |
| **Homey** | Limited | Room-grouped | Free / $4.99/mo | Allowance/bank linking |

### Key Competitor Features

**Cozi Family Organizer**
- Shared grocery lists accessible at supermarket
- Color-coded family calendar
- To-do lists sync across devices
- Meal planning and recipe storage
- AI that anticipates conflicts (2025 update)
- Voice integration with Google Home/Alexa

**OurHome**
- Assign and schedule tasks with due dates
- Points and rewards system
- Meal planner auto-populates shopping list
- Shared grocery list
- Family calendar
- In-app messaging

**Homey**
- Tasks grouped by room
- In-app chat
- Photo verification ("before and after")
- Allowance linked to bank accounts
- AI photo-to-task conversion

---

## Native Device Capabilities

### iOS 17+ Reminders (The Bar to Beat)

Apple Reminders now includes:
- **Smart grocery categorization**: Produce, Breads & Cereals, Frozen Foods, Snacks & Candy, Meat, Dairy, Eggs & Cheese, Bakery, Baking Items, Household Items, Personal Care & Health, Wine/Beer/Spirits
- **Real-time shared lists** with Family Sharing
- **Siri voice capture** ("Add milk to grocery list")
- **Cross-device sync** via iCloud

### Android/Google

- Google Keep shared lists
- Google Tasks with Gmail integration
- Google Assistant voice capture
- Cross-platform availability

### Native Limitations

- No context-aware list generation
- No chore/task integration
- No gamification
- No event-to-shopping workflows
- Limited project management features

---

## Analysis: What NOT to Build

| Feature | Why Skip |
|---------|----------|
| Generic grocery list | Apple Reminders does this better with smart categories |
| Generic todo list | Todoist, Any.do, native apps dominate this space |
| Just "shared lists" | Native Family Sharing already handles this well |
| Standalone meal planner | Cozi, OurHome already own this space |

**Rationale**: Building generic list management would:
1. Compete against entrenched, free solutions
2. Require significant development effort
3. Provide minimal differentiation
4. Not leverage ChoreGami's unique strengths

---

## Analysis: Potential Enhancements (Given Existing Features)

### 1. Prep Task Type Flag (Low Effort, Medium Value)

**What exists**: Prep tasks with `{ text, assignee_id, done }`

**Enhancement**: Add `type: "shop" | "task"` field

```typescript
// Updated data model
interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
  type?: "shop" | "task";  // NEW: enables filtering
}
```

**UI change**: Toggle in AddPrepTasksModal (🛒 Shop / ✓ Task)

**Value**: Filter "things to buy" vs "things to do" for an event
**Effort**: Low (~2 hours)
**Risk**: Low - backward compatible

### 2. Export Prep Tasks to Reminders (Low Effort, High Value)

**What exists**: Calendar export button on events

**Enhancement**: Add "📱 Send to Reminders" button

```
Event: "Birthday Party Feb 15"
Prep tasks:
  🛒 Buy cake mix
  🛒 Get balloons
  ✓ Order pizza (task, not shopping)

Tap "📱 Send to Reminders" → exports shopping items only
```

**Technical approach**:
- Generate text list of `type: "shop"` tasks
- iOS: Use `x-apple-reminderkit://` URL scheme OR clipboard + instructions
- Android: Share intent with text list for Google Keep/Tasks
- Fallback: Copy to clipboard with "Paste into your Reminders app"

**Value**: Bridge to native apps (don't compete, integrate)
**Effort**: Low (~4 hours)
**Validates**: User demand for shopping list integration

### 3. "My Shopping List" View (Medium Effort, Medium Value)

**What exists**: Prep tasks scattered across multiple events

**Enhancement**: Aggregated view of all `type: "shop"` prep tasks

```
📱 My Shopping List (across all upcoming events)

Birthday Party (Feb 15):
  ☐ Buy cake mix
  ☐ Get balloons

Soccer Tournament (Feb 22):
  ☐ Team snacks (24 kids)
  ☐ Water bottles
```

**Value**: One-stop shopping view before going to store
**Effort**: Medium (~1 day)
**Dependency**: Requires type flag (Enhancement #1)

### 4. Points-Gated Kid Wishlist (Medium Effort, Medium Value)

**What exists**: Kids earn points from chores

**Enhancement**: New data model for kid requests

```typescript
// New table or metadata structure
interface WishlistItem {
  id: string;
  profile_id: string;      // Kid who wants it
  text: string;            // "New video game"
  points_required?: number; // Optional minimum balance
  status: "requested" | "approved" | "purchased" | "denied";
  created_at: string;
}
```

**Flow**:
1. Kid adds item to wishlist (from kid dashboard)
2. Parent sees requests, approves/denies
3. Approved items appear on parent's "Shopping List"
4. Parent marks purchased when bought

**Value**: Teaches delayed gratification, reduces store nagging
**Effort**: Medium (~2-3 days) - new data model + UI
**ChoreGami fit**: Extends existing points economy

### 5. ~~"Before You Go" Context Lists~~ (Skip)

**Original idea**: Aggregate equipment lists per event type

**Why skip**:
- Requires new "equipment list" data model
- High effort for unclear demand
- Prep tasks already serve this purpose adequately
- Parents can just add "bring shin guards" as prep task

---

## Recommendation

### Do Not Build

- ❌ Generic grocery lists (Cozi, Apple Reminders own this)
- ❌ Generic todo lists (Todoist, native apps dominate)
- ❌ Standalone meal planning (out of scope)
- ❌ "Before You Go" lists (over-engineered, low demand signal)

### Build in Order (Incremental Approach)

**Phase 1: Type Flag** ✅ COMPLETE
- Added `type: "shop" | "task"` to prep task data model
- Toggle in AddPrepTasksModal UI (🛒 / ✓)
- Backward compatible - existing tasks default to "task"

**Phase 2: Export Button** ✅ COMPLETE
- "🛒 Export Shopping (N)" button on event cards
- Filters to `type: "shop"` tasks only
- Copies to clipboard with toast notification
- Tracks usage via `prep_export` metric

**Phase 3: Evaluate Signal** ⏳ IN PROGRESS (2-4 weeks)
- Monitor `prep_shop` and `prep_export` metrics
- If export usage > 15% of events with prep tasks → proceed to Phase 4
- If export usage < 5% → stop here, clipboard export is sufficient

**Phase 4: Aggregated View** (if validated, ~1 day)
- "/parent/shopping" route
- All `type: "shop"` prep tasks across upcoming events
- Grouped by event, checkable

**Future: Kid Wishlist** (separate initiative)
- Only if parents explicitly request this feature
- Requires new data model, more complex UX

---

## Effort vs Value Matrix (Updated)

| Enhancement | Effort | Value | Status |
|-------------|--------|-------|--------|
| Generic lists | High | Low | ❌ Skip |
| Prep task type flag | Low (2h) | Medium | ✅ **IMPLEMENTED** |
| Export to clipboard | Low (4h) | High | ✅ **IMPLEMENTED** |
| Aggregated shopping view | Medium (1d) | Medium | ⏸️ Wait for signal |
| Kid wishlist | Medium (2-3d) | Medium | ⏸️ Future |
| "Before You Go" lists | High | Low | ❌ Skip |

---

## 80/20 Decision

**Implemented**: Type flag + Export button ✅

This approach:
- Builds on existing prep tasks (no new data model)
- Validates demand before building aggregated view
- Bridges to native apps (don't compete, integrate)
- Minimal code change, maximum learning
- Unlocks Phase 4 only if users actually use export

**Result**: Both features shipped February 10, 2026. Monitoring metrics.

---

## Sources

- [Cozi Feature Overview](https://www.cozi.com/feature-overview/)
- [OurHome App](https://ourhome-chores-rewards-groceries-and-calendar.appheros.com/)
- [Apple Reminders Grocery Lists](https://support.apple.com/en-us/105086)
- [Apple Reminders Sharing](https://support.apple.com/guide/iphone/share-and-collaborate-iph2a8f9121e/ios)
- [Best Chore Apps 2026](https://www.bestapp.com/best-household-chore-apps/)
- [Best Reminder Apps 2025](https://www.igeeksblog.com/best-reminder-apps-for-iphone/)

---

## Implementation Status (February 10, 2026)

### ✅ Phase 1 & 2 Complete

**Prep Task Type Flag**
- Added `type?: "shop" | "task"` to PrepTask interface
- Toggle button in AddPrepTasksModal (🛒 / ✓)
- Backward compatible - existing tasks default to "task"
- Files modified:
  - `islands/AddPrepTasksModal.tsx`
  - `islands/EventCard.tsx`
  - `islands/EventsList.tsx`

**Export Shopping Button**
- "🛒 Export Shopping (N)" button appears when event has shop items
- Copies formatted list to clipboard with toast confirmation
- Tracks usage via `prep_export` metric

**Demand Tracking**
- `prep_shop` metric: tracked when tasks with type="shop" are saved
- `prep_export` metric: tracked when export button clicked
- Both added to `/api/analytics/event.ts` allowed metrics

### ⏸️ Next Steps (After Signal Validation)

1. **Monitor metrics** for 2-4 weeks:
   ```sql
   -- Query prep_shop usage
   SELECT COUNT(*) FROM family_profiles
   WHERE preferences->'notifications'->'usage'->>'total_prep_shop_sent' > '0';

   -- Query prep_export usage
   SELECT COUNT(*) FROM family_profiles
   WHERE preferences->'notifications'->'usage'->>'total_prep_export_sent' > '0';
   ```

2. **If export usage > 15%** of events with prep tasks:
   - Build `/parent/shopping` aggregated view
   - Group by event, show all shop items

3. **If export usage < 5%**:
   - Current implementation sufficient
   - No need for aggregated view

---

## Technical Notes

### Prep Task Data Migration

No migration needed - existing prep tasks without `type` field will default to `"task"`.

```typescript
// In AddPrepTasksModal, handle legacy tasks:
const taskType = task.type || "task";
```

### Export Implementation Options

| Platform | Method | Complexity |
|----------|--------|------------|
| iOS Safari | `x-apple-reminderkit://` URL scheme | Medium (may not work on all iOS versions) |
| iOS/Android | Clipboard + toast "Copied! Paste into Reminders" | Low (works everywhere) |
| Android | Share API with text/plain | Low |
| Web fallback | Download .txt file | Low |

**Recommended**: Start with clipboard (works everywhere), add native deep links later if demanded.

### Usage Tracking

```typescript
// Track export clicks for signal
await incrementUsage("prep_task_export", familyId, {
  event_id: eventId,
  item_count: shoppingItems.length,
  method: "clipboard" | "share" | "deeplink"
});
```

---

**Author**: Development Team
**Created**: February 10, 2026
**Updated**: February 10, 2026 (codebase review, revised recommendations, Phase 1 & 2 implemented)
