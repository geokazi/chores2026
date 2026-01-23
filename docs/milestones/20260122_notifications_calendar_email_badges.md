# Notifications: Calendar Export + Email Digest + In-App Badges
## Implementation Plan - Pareto-Optimized

**Date**: January 22, 2026
**Status**: 📋 Planned
**Goal**: Event awareness and engagement without push notification infrastructure
**Cost**: $0/month (Resend free tier: 100 emails/day)
**Effort**: ~3.5 hours total

---

## Quick Summary

| Feature | Effort | Value | Infrastructure |
|---------|--------|-------|----------------|
| Calendar .ics export | ~1h | High | Zero (browser download) |
| Weekly email digest | ~2h | High | Resend (already configured) |
| In-app event badge | ~30min | Medium | Zero (client-side) |

---

## Why This Over FCM Push

| Concern | FCM Push | This Approach |
|---------|----------|---------------|
| **Vendor lock-in** | Firebase ecosystem | Zero dependencies |
| **PWA adoption** | Requires "Add to Home Screen" | Works in any browser |
| **iOS support** | Fragile (Apple changes rules) | Universal |
| **User permission** | Notification permission prompt | No permission needed |
| **Maintenance** | Token cleanup, invalid token handling | None |
| **Testing** | Push doesn't work in dev | Standard HTTP |
| **Support burden** | "Why didn't I get notified?" | Self-explanatory UX |
| **Kids** | Need their own device | Works on shared devices |

---

## 1. Calendar .ics Export

### What
"Add to Calendar" button on each event card → downloads `.ics` file → user's phone calendar handles reminders natively.

### Why
- Parents already trust their calendar app for reminders
- Phone calendars have snooze, multiple reminder times, recurring support
- Zero infrastructure, zero ongoing cost
- Works with Google Calendar, Apple Calendar, Outlook

### Implementation

**New file**: `routes/api/events/[id]/calendar.ts` (~40 lines)

```typescript
// GET /api/events/:id/calendar → returns .ics file
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Fetch event from DB
    // 2. Generate ICS content
    // 3. Return with Content-Type: text/calendar
  }
};
```

**ICS format**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ChoreGami//Events//EN
BEGIN:VEVENT
DTSTART:20260127T183000
DTEND:20260127T193000
SUMMARY:🏀 Basketball Practice
DESCRIPTION:Participants: Julia, Ciku
LOCATION:Community Center
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:Event reminder
END:VALARM
END:VEVENT
END:VCALENDAR
```

**UI**: Add "📅 Add to Calendar" link on event cards in EventsList.tsx (~5 lines)

```tsx
<a
  href={`/api/events/${event.id}/calendar`}
  download={`${event.title}.ics`}
  style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}
>
  📅 Add to Calendar
</a>
```

### Features
- Includes 1-hour reminder (VALARM) by default
- Sets event time, end time, location, participants
- Multi-day events use correct DTSTART/DTEND
- Recurring events use RRULE (weekly/biweekly/monthly)

---

## 2. Weekly Email Digest

### What
Sunday evening email: "Your Week Ahead" with upcoming events + chore stats + streak info.

### Why
- Low frequency = no fatigue (1 email/week)
- Summarizes value of the app (engagement reminder)
- Differentiating - no calendar app sends "Julia completed 8 chores this week"
- Free via Resend (already configured, 100/day free tier)

### Implementation

**New files**:
- `lib/services/email-digest.ts` (~80 lines) - Build digest content
- `routes/api/cron/weekly-digest.ts` (~50 lines) - Sunday 6pm trigger

**Email content**:
```
Subject: 📅 Week Ahead for the [Family Name] Family

Hey [Parent Name],

📅 THIS WEEK'S EVENTS
━━━━━━━━━━━━━━━━━━━━
Mon Jan 27 • 🏀 Basketball Practice (6:30 PM)
Wed Jan 29 • 🎹 Piano Lesson (4:00 PM)
Sat Feb 01 • 🎂 Julia's Birthday Party (2:00 PM)

📊 LAST WEEK'S STATS
━━━━━━━━━━━━━━━━━━━━
✅ Chores completed: 18/22
🔥 Longest streak: Ciku (7 days!)
⭐ Top earner: Julia (45 pts)
🎯 Family goal: Reached! (+5 bonus pts each)

—
ChoreGami • Manage notifications in Settings
```

**Opt-out**: Toggle in `/parent/settings` → stored in `families.settings` JSONB:
```json
{ "apps": { "choregami": { "weekly_digest": true, "digest_email": "parent@email.com" } } }
```

### Sending
- Use existing `RESEND_API_KEY` from .env
- Resend npm package or HTTP API (simple POST)
- Cron: Deno Deploy scheduled function or external (e.g., cron-job.org)

---

## 3. In-App Event Badge

### What
Red dot indicator on the "Events" nav link when there's an event today or tomorrow.

### Why
- Zero infrastructure, pure client-side
- Draws attention when user opens app
- No permissions, no opt-in needed
- 30 minutes to implement

### Implementation

**Modify**: `islands/AppHeader.tsx` (~15 lines)

```tsx
// Check if any event is today or tomorrow
const hasUpcoming = events.some(e => {
  const eventDate = new Date(e.display_date || e.event_date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return eventDate >= today && eventDate <= tomorrow;
});

// In nav link:
<a href="/parent/events">
  Events {hasUpcoming && <span class="badge-dot" />}
</a>
```

**CSS**: Small red dot (8px circle, absolute positioned)

---

## 4. Future: SMS Streak Alert (Validate First)

If user feedback indicates demand:

| Feature | Trigger | Volume | Cost |
|---------|---------|--------|------|
| Streak at risk | 6pm, streak expires at midnight | ~20 msgs/week for 100 families | ~$0.65/week |

**Implementation**: ~1 hour using existing Twilio config. Only build if >30% of users request it via in-app survey.

---

## 5. Settings UI

Add to `/parent/settings` (FamilySettings island):

```
📧 Notifications
────────────────────────
☑ Weekly email digest (Sundays at 6pm)
  Email: parent@email.com [Edit]

━━━━━━━━━━━━━━━━━━━━━━━
```

Store in `families.settings` JSONB (no migration):
```json
{
  "apps": {
    "choregami": {
      "weekly_digest": true,
      "digest_email": "parent@email.com"
    }
  }
}
```

---

## 6. UX Mockups

### 6.1 Calendar Export — Event Card

```
┌─────────────────────────────────────────────────┐
│  🏀 Basketball Practice                        │
│  Mon, Jan 27 • 6:30 PM - 7:30 PM              │
│  📍 Community Center                           │
│  👥 Julia, Ciku                                │
│                                                 │
│  📅 Add to Calendar                            │
│     ↑ (tappable link, downloads .ics file)     │
└─────────────────────────────────────────────────┘
```

### 6.2 Calendar Export — Phone Prompt After Tap

```
┌─────────────────────────────────────────────────┐
│            Add to Calendar?                      │
│                                                  │
│  🏀 Basketball Practice                         │
│  Mon, Jan 27, 2026                              │
│  6:30 PM - 7:30 PM                             │
│  📍 Community Center                            │
│                                                  │
│  🔔 Reminder: 1 hour before                    │
│                                                  │
│  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Cancel    │  │   Add to Calendar ✓     │  │
│  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 6.3 Calendar Export — Native Reminder Result

```
┌─────────────────────────────────────────────────┐
│  ◀  January 27, 2026  ▶                        │
│─────────────────────────────────────────────────│
│  5:30 PM  │  🔔 Basketball Practice in 1 hour  │
│  6:00 PM  │                                     │
│  6:30 PM  │ ┌─────────────────────────────┐    │
│           │ │ 🏀 Basketball Practice      │    │
│  7:00 PM  │ │    Community Center         │    │
│  7:30 PM  │ └─────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### 6.4 Weekly Email Digest (Sunday 6pm)

```
┌─────────────────────────────────────────────────────────┐
│  From: ChoreGami <noreply@choregami.app>                │
│  To: parent@email.com                                    │
│  Subject: 📅 Week Ahead for the Kariuki Family          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hi Dad! Here's your family's week at a glance.         │
│                                                          │
│                                                          │
│  📅 THIS WEEK'S EVENTS                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                          │
│  Mon Jan 27  🏀 Basketball Practice      6:30 PM        │
│              👥 Julia, Ciku                              │
│                                                          │
│  Wed Jan 29  🎹 Piano Lesson             4:00 PM        │
│              👥 Julia                                    │
│                                                          │
│  Sat Feb 01  🎂 Julia's Birthday Party   2:00 PM        │
│              👥 Everyone                                 │
│              📋 3 prep tasks remaining                   │
│                                                          │
│                                                          │
│  📊 LAST WEEK'S HIGHLIGHTS                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                          │
│  ✅ Chores completed     18 / 22  (82%)                 │
│  🔥 Longest streak       Ciku — 7 days!                 │
│  ⭐ Top earner           Julia — 45 pts                 │
│  🎯 Family goal          Reached! (+5 bonus each)       │
│                                                          │
│                                                          │
│  👏 SHOUTOUTS                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                          │
│  🌟 Ciku completed every chore on time this week        │
│  🌟 Tonie Tones started a new 3-day streak!             │
│                                                          │
│                                                          │
│  ┌───────────────────────────────────────────┐          │
│  │         Open ChoreGami →                  │          │
│  └───────────────────────────────────────────┘          │
│                                                          │
│  ─────────────────────────────────────────────          │
│  You're receiving this because weekly digests            │
│  are enabled. Manage in Settings → Notifications.       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Email Digest — Settings Configuration

```
┌─────────────────────────────────────────────────┐
│  Family Settings                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ...existing settings...                         │
│                                                  │
│  📧 Notifications                               │
│  ─────────────────────────────────────────────  │
│                                                  │
│  ☑ Weekly email digest (Sundays at 6pm)         │
│                                                  │
│  Email address:                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ parent@email.com                        │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Includes: upcoming events, chore stats,         │
│  streaks, and family highlights.                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.6 In-App Badge — Normal State (no events soon)

```
┌─────────────────────────────────────────────────┐
│  ☰        Family Dashboard                 👤   │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Dashboard]   [Events]   [Activity]   [Board]  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.7 In-App Badge — Active State (event today/tomorrow)

```
┌─────────────────────────────────────────────────┐
│  ☰        Family Dashboard                 👤   │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Dashboard]   [Events 🔴]  [Activity]  [Board] │
│                    ↑                             │
│              red dot badge                       │
│         (event today or tomorrow)                │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.8 In-App Badge — Events Page After Tap

```
┌─────────────────────────────────────────────────┐
│  ☰        Family Events                    👤   │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Dashboard]   [Events 🔴]  [Activity]  [Board] │
│                                                  │
│  TODAY                                           │
│  ┌─────────────────────────────────────────┐    │
│  │  🏀 Basketball Practice                 │    │
│  │  6:30 PM - 7:30 PM                     │    │
│  │  👥 Julia, Ciku                         │    │
│  │  📅 Add to Calendar                    │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  THIS WEEK                                       │
│  ┌─────────────────────────────────────────┐    │
│  │  🎹 Piano Lesson                        │    │
│  │  Wed, Jan 29 • 4:00 PM                 │    │
│  │  👥 Julia                               │    │
│  │  📅 Add to Calendar                    │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  UPCOMING                                        │
│  ┌─────────────────────────────────────────┐    │
│  │  🎂 Julia's Birthday Party              │    │
│  │  Sat, Feb 1 • 2:00 PM                  │    │
│  │  👥 Everyone                            │    │
│  │  📋 3 prep tasks  •  📅 Add to Calendar│    │
│  └─────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.9 User Journey — All Three Working Together

```
SUNDAY 6PM
──────────────────────────────────────────────
📧 Email arrives: "Week Ahead for the Kariuki Family"
   → Parent sees 3 events this week
   → Notes prep tasks for birthday party

MONDAY MORNING
──────────────────────────────────────────────
📱 Parent opens ChoreGami to check kids' chores
   → Sees 🔴 badge on Events tab
   → "Oh right, basketball today"
   → Taps event → "Add to Calendar"
   → Phone calendar now has native 1h reminder

MONDAY 5:30 PM
──────────────────────────────────────────────
🔔 Phone calendar reminder: "Basketball Practice in 1 hour"
   → Native notification from their calendar app
   → No ChoreGami infrastructure needed!
```

---

## 7. Action Items

### Phase 1: Calendar Export (~1 hour)
- [ ] Create `routes/api/events/[id]/calendar.ts` (ICS generator)
- [ ] Add "Add to Calendar" link in EventsList.tsx event cards
- [ ] Handle recurring events with RRULE
- [ ] Handle multi-day events with proper DTSTART/DTEND

### Phase 2: Email Digest (~2 hours)
- [ ] Create `lib/services/email-digest.ts` (build digest content)
- [ ] Create `routes/api/cron/weekly-digest.ts` (send emails)
- [ ] Add digest toggle + email field in FamilySettings
- [ ] Store preference in families.settings JSONB
- [ ] Test with Resend API

### Phase 3: In-App Badge (~30 min)
- [ ] Add upcoming event check to AppHeader
- [ ] Add red dot badge CSS
- [ ] Pass events data to header (or fetch client-side)

---

## 8. Cross-References

- **FCM Plan (Deferred)**: [FCM Push Notifications](./20260122_fcm_push_notifications_plan.md) - archived, revisit when demand validated
- **MealPlanner FCM Strategy**: Referenced for analysis but approach rejected for ChoreGami
- **Events System**: [Multi-day & Repeating Events](./20260121_events-multiday-repeating-endtime.md)
- **Resend Config**: `.env` line 36 (`RESEND_API_KEY`)
- **Twilio Config**: `.env` lines 68-72 (reserved for future SMS if validated)

---

**Estimated Total Effort**: ~3.5 hours
**Monthly Cost**: $0 (Resend free tier)
**Database Migration**: None (JSONB settings)
**Vendor Lock-in**: None

---

*Plan created: January 22, 2026*
