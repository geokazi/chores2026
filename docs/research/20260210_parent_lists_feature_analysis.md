# Parent Lists Feature Analysis

**Date**: February 10, 2026
**Status**: Research Complete
**Recommendation**: Do Not Build (Generic Lists) / Test Demand First

---

## Executive Summary

Analysis of adding personal list management (todo items, grocery lists) for parents in ChoreGami. After researching competitors and native device capabilities, **generic list features are not recommended** - native apps already solve this well. However, **event-integrated lists** may have unique value worth validating.

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

## Analysis: Potential Unique Value Propositions

### 1. Event-Linked Shopping Lists (High Value)

```
User creates: "Soccer Tournament Saturday"
System auto-generates: "Tournament Supplies" list
  - Snacks for team (from prep tasks)
  - Water bottles
  - Folding chairs
```

**Value**: Context-aware, saves mental load
**Native can't do**: Auto-generation from events
**Effort**: Medium
**ChoreGami fit**: Extends existing Events feature

### 2. Chore-Reward Wishlist (Medium Value)

```
Kids earn points → Add "wants" to family shopping list
Parent approves/rejects during shopping
```

**Value**: Teaches delayed gratification, reduces "can I have" nagging
**Native can't do**: Points-gated requests
**Effort**: Medium
**ChoreGami fit**: Extends existing Points economy

### 3. Prep Task → Shopping Pipeline (High Value)

```
Event: "Birthday Party Feb 15"
Prep tasks:
  ☐ Buy cake mix
  ☐ Get balloons
  ☐ Order pizza

One tap: "Add all to shopping list"
```

**Value**: Prep tasks become actionable shopping items
**Native can't do**: Event → task → shopping workflow
**Effort**: Low-Medium
**ChoreGami fit**: Natural extension of Events + Prep Tasks

### 4. "Before You Go" Context Lists (Medium Value)

```
Leaving for soccer? Here's what you need:
  ☐ Shin guards (from equipment list)
  ☐ Water bottle
  ☐ Snacks (from grocery list)
```

**Value**: Departure checklists linked to calendar events
**Native can't do**: Cross-list aggregation by event
**Effort**: High
**ChoreGami fit**: Requires new data model

---

## Recommendation

### Do Not Build

- Generic grocery lists
- Generic todo lists
- Standalone meal planning

### Test Demand First (MVP Approach)

**Phase 1: Native Integration**
- Add "Export prep tasks to Apple Reminders" button on events
- Track usage metrics
- Collect user feedback

**Phase 2: Evaluate Signal**
- If export usage > 20% of event creators → consider native lists
- If export usage < 5% → native integration is sufficient

**Phase 3: Build If Validated**
- Event-linked shopping lists
- Prep task → shopping pipeline
- Kid wishlist from points (future)

---

## Effort vs Value Matrix

| Approach | Effort | Value | Recommendation |
|----------|--------|-------|----------------|
| Generic lists | High | Low | ❌ Skip |
| Native export (Apple Reminders) | Low | Medium | ✅ Test demand |
| Event-linked shopping | Medium | High | ⏸️ Wait for signal |
| Kid wishlist from points | Medium | Medium | ⏸️ Future consideration |

---

## 80/20 Decision

**Start with**: "Export to Reminders" button on event prep tasks

This approach:
- Low development effort (~1 day)
- Validates real user demand
- Doesn't compete with native apps
- Leverages existing Events feature
- Provides data for future decisions

---

## Sources

- [Cozi Feature Overview](https://www.cozi.com/feature-overview/)
- [OurHome App](https://ourhome-chores-rewards-groceries-and-calendar.appheros.com/)
- [Apple Reminders Grocery Lists](https://support.apple.com/en-us/105086)
- [Apple Reminders Sharing](https://support.apple.com/guide/iphone/share-and-collaborate-iph2a8f9121e/ios)
- [Best Chore Apps 2026](https://www.bestapp.com/best-household-chore-apps/)
- [Best Reminder Apps 2025](https://www.igeeksblog.com/best-reminder-apps-for-iphone/)

---

**Author**: Development Team
**Created**: February 10, 2026
