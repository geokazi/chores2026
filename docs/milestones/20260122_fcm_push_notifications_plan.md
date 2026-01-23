# FCM Push Notifications for ChoreGami
## Implementation Plan - DEFERRED

**Date**: January 22, 2026
**Status**: ⏸️ Deferred
**Reason**: Over-engineered for current stage. Calendar export + email digest provides 80% of value at 20% of effort.
**Revisit When**: >50% users request push AND organically install PWA
**Replaced By**: [Notifications: Calendar + Email + Badges](./20260122_notifications_calendar_email_badges.md)

> **Decision (Jan 22, 2026)**: FCM push violates the 20/80 principle for a family chore app.
> Hidden costs (Firebase lock-in, PWA adoption friction, token cleanup, iOS brittleness,
> notification permission UX, support burden) outweigh benefits when users already have
> calendar apps for event reminders and kids don't have their own devices.

---

**Original Goal**: Free push notifications for event reminders, chore alerts, and streak warnings
**Original Cost**: $0/month (FCM is unlimited and free)

---

## Quick Summary

| Aspect | Detail |
|--------|--------|
| **Technology** | Firebase Cloud Messaging (FCM) via Web Push |
| **Delivery** | PWA service worker (background + foreground) |
| **Cost** | $0 (vs ~$10-30/mo for Twilio/Resend) |
| **Effort** | ~250 lines new code + Firebase config |
| **Database** | JSONB in existing `family_profiles` (no migration) |
| **Reuse** | Pattern from MealPlanner's FCM strategy doc |

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  ChoreGami PWA  │────▶│  FCM API (Free)  │────▶│  User Device│
│  (Deno Fresh)   │     │  (Google hosted)  │     │  (Push msg) │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                                                │
        ▼                                                ▼
┌─────────────────┐                              ┌─────────────┐
│  Supabase       │                              │  Service     │
│  (push_tokens)  │                              │  Worker (SW) │
└─────────────────┘                              └─────────────┘
```

### Flow:
1. User visits ChoreGami → "Add to Home Screen" prompt
2. PWA requests notification permission → stores FCM token in DB
3. Server schedules notifications (event reminder, chore assigned, etc.)
4. Cron route checks `scheduled_notifications` every 15 min
5. FCM delivers push → service worker shows notification
6. User taps → deep links back to relevant page

---

## 2. Notification Types (Priority Order)

### Phase 1: Event Reminders (Highest Value)

| Trigger | Message | Timing |
|---------|---------|--------|
| Event approaching | "🏀 Soccer practice in 1 hour" | 1h before |
| Multi-day event start | "🏕️ Camp starts tomorrow" | Day before |
| Prep tasks incomplete | "📋 2 prep tasks still need doing" | 2h before |

### Phase 2: Chore Alerts

| Trigger | Message | Timing |
|---------|---------|--------|
| New chore assigned | "📝 Dad assigned: Clean room (5 pts)" | Immediate |
| Chore completed (parent) | "✅ Ciku completed Take out trash!" | Immediate |
| Daily chores pending | "🌅 3 chores waiting for today" | 8am daily |

### Phase 3: Gamification Hooks

| Trigger | Message | Timing |
|---------|---------|--------|
| Streak at risk | "🔥 7-day streak expires tonight!" | 6pm |
| Weekly goal progress | "🎯 Family goal: 18/20 chores done" | Day before reset |
| Leaderboard change | "📊 Julia passed you! Complete a chore to catch up" | Immediate |

---

## 3. Implementation Plan

### 3.1 Firebase Project Setup

```bash
# One-time setup (manual):
# 1. Create Firebase project at https://console.firebase.google.com
# 2. Enable Cloud Messaging
# 3. Generate Web Push certificate (VAPID key)
# 4. Download service account JSON for server-side sending
```

**New env vars:**
```bash
FIREBASE_PROJECT_ID=choregami-2026
FIREBASE_VAPID_KEY=BLxxxxxxx...  # Web Push certificate
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'  # Server-side auth (JSON)
```

### 3.2 Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `static/manifest.json` | PWA manifest (name, icons, theme) | ~25 |
| `static/sw.js` | Service worker for background push | ~50 |
| `routes/api/push/register.ts` | Store FCM token | ~40 |
| `routes/api/push/send.ts` | Send notification (internal) | ~50 |
| `routes/api/cron/reminders.ts` | Check scheduled reminders | ~60 |
| `lib/services/push-service.ts` | FCM send logic | ~80 |
| **Total** | | **~305** |

### 3.3 Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `routes/_app.tsx` | Add `<link rel="manifest">` + SW registration | ~5 |
| `islands/AddEventModal.tsx` | "Remind me" checkbox | ~10 |
| `routes/api/events.ts` | Schedule reminder on event create | ~10 |
| `islands/FamilySettings.tsx` | Notification toggle | ~15 |

---

## 4. Database: JSONB Approach (No Migration)

### Push Token Storage

Store in existing `family_profiles.settings` JSONB:

```typescript
// family_profiles.settings (existing JSONB column)
{
  push_tokens: [
    {
      token: "fcm_token_string...",
      device: "Chrome/Mac",
      created_at: "2026-01-22T..."
    }
  ],
  notifications: {
    enabled: true,
    event_reminders: true,     // 1h before events
    chore_assigned: true,      // New chore notification
    streak_alerts: true,       // Streak at risk
    quiet_hours: { start: "22:00", end: "07:00" }
  }
}
```

### Scheduled Notifications

Use Deno KV (already configured) for the scheduling queue:

```typescript
// Key: ["scheduled_push", timestamp, eventId]
// Value: { profileId, title, body, deepLink }
```

**Why Deno KV over Supabase table**:
- Already configured (DENO_KV_PATH in .env)
- Built-in TTL expiry (auto-cleanup)
- No schema migration needed
- Perfect for ephemeral scheduled jobs

---

## 5. Key Implementation Details

### 5.1 PWA Manifest (`static/manifest.json`)

```json
{
  "name": "ChoreGami",
  "short_name": "ChoreGami",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f0fdf4",
  "theme_color": "#10b981",
  "icons": [
    { "src": "/logo-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 5.2 Service Worker (`static/sw.js`)

```javascript
// Register for push events
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ChoreGami', {
      body: data.body,
      icon: '/logo-192.png',
      badge: '/badge-72.png',
      data: { url: data.deepLink || '/' },
      tag: data.tag,  // Group similar notifications
    })
  );
});

// Handle notification click → deep link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### 5.3 Push Service (`lib/services/push-service.ts`)

```typescript
// Server-side FCM send using google-auth-library
export async function sendPush(profileId: string, notification: {
  title: string;
  body: string;
  deepLink?: string;
  tag?: string;
}) {
  // 1. Get tokens from family_profiles.settings.push_tokens
  // 2. Check notification preferences + quiet hours
  // 3. Send via FCM HTTP v1 API
  // 4. Clean up invalid tokens
}

// Convenience functions
export async function sendEventReminder(profileId: string, event: FamilyEvent) { ... }
export async function sendChoreAssigned(profileId: string, chore: ChoreAssignment) { ... }
export async function sendStreakAlert(profileId: string, streakDays: number) { ... }
```

### 5.4 Cron Route (`routes/api/cron/reminders.ts`)

```typescript
// Called every 15 min by Deno Deploy cron or external scheduler
// 1. Query Deno KV for reminders due in next 15 min
// 2. For each: send push, mark as sent
// 3. Clean up expired entries
```

### 5.5 Event Form Addition

```tsx
// In AddEventModal.tsx - simple checkbox
<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
  <input type="checkbox" id="remind" checked={formData.remind} ... />
  <label htmlFor="remind">Remind me 1 hour before</label>
</div>
```

---

## 6. iOS Considerations

| iOS Version | Web Push Support |
|-------------|-----------------|
| < 16.4 | No web push |
| 16.4+ | Yes, but only when installed as PWA (Home Screen) |

**Strategy**: Show "Add to Home Screen" prompt for iOS users. Once installed, push works like native apps.

**Fallback for non-PWA users**: No notification (acceptable - they can use phone calendar for reminders). The app still works perfectly without push.

---

## 7. Comparison: FCM vs Twilio/Resend for Reminders

| | FCM Push | Twilio SMS | Resend Email |
|---|---|---|---|
| **Cost** | $0 | ~$0.008/msg | $0-20/mo |
| **Latency** | <1s | 1-5s | 5-30s |
| **Works for kids** | Yes (shared device) | No | No |
| **Rich content** | Actions, icons, deep links | Text only | HTML |
| **Requires setup** | Add to Home Screen | Phone number | Email address |
| **Quiet hours** | Built-in | Custom | Custom |
| **Offline queue** | Yes (FCM handles) | N/A | N/A |

---

## 8. Action Items

### Phase 1: PWA + Event Reminders (~2 hours)
- [ ] Create Firebase project + get VAPID key
- [ ] Create `static/manifest.json` + icons
- [ ] Create `static/sw.js` (push handler)
- [ ] Add manifest link + SW registration in `_app.tsx`
- [ ] Create `routes/api/push/register.ts`
- [ ] Create `lib/services/push-service.ts`
- [ ] Add "Remind me" checkbox to AddEventModal
- [ ] Schedule reminder in Deno KV on event create
- [ ] Create `routes/api/cron/reminders.ts`

### Phase 2: Chore Alerts (~1 hour)
- [ ] Send push on chore assignment (POST /api/chores)
- [ ] Send push on chore completion (to parent)
- [ ] Daily pending chores push (morning cron)

### Phase 3: Gamification (~1 hour)
- [ ] Streak at risk alert (evening cron)
- [ ] Weekly goal progress (day before reset)
- [ ] Notification preferences in FamilySettings

---

## 9. Cross-References

- **MealPlanner FCM Strategy**: `/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/docs/implementation/20251229_fcm-web-push-strategy.md`
- **Deno KV Config**: Already in `.env` (DENO_KV_PATH, DENO_KV_ACCESS_TOKEN)
- **Events System**: [Multi-day & Repeating Events](./20260121_events-multiday-repeating-endtime.md)
- **Activity Feed**: [Expanded Activity Feed](../decisions/20260120_expanded_activity_feed.md)

---

**Estimated Total Effort**: ~4 hours (3 phases)
**Monthly Cost**: $0
**Database Migration**: None (JSONB + Deno KV)
**Dependencies**: Firebase project (free tier)

---

*Plan created: January 22, 2026*
