# Notifications: Calendar Export + Email Digest + In-App Badges
## Implementation Plan - Pareto-Optimized

**Date**: January 22, 2026
**Status**: ✅ Implemented (January 22, 2026)
**Goal**: Event awareness and engagement without push notification infrastructure
**Cost**: $0/month (Resend free tier: 100 emails/day)
**Effort**: ~7 hours total (includes localStorage fix, unit tests, usage tracking)

---

## Quick Summary

| Feature | Effort | Value | Infrastructure |
|---------|--------|-------|----------------|
| Calendar .ics export | ~1.5h | High | Zero (browser download) |
| Weekly email digest | ~2.5h | High | Resend (already configured) |
| In-app event badge | ~45min | Medium | Zero (client-side) |
| Usage tracking + cost control | ~1.5h | High (cost control) | JSONB counters + config file |

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

**New file**: `routes/api/events/[id]/calendar.ts` (~50 lines)

```typescript
// GET /api/events/:id/calendar → returns .ics file (authenticated)
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Verify session (same pattern as other API routes)
    const session = await getSessionFromRequest(req);
    if (!session) return new Response("Unauthorized", { status: 401 });
    // 2. Fetch event from DB (verify family access)
    // 3. Generate ICS content
    // 4. Return with Content-Type: text/calendar
  }
};
```

**ICS format** (with timezone — avoids misinterpretation by calendar apps):
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ChoreGami//Events//EN
BEGIN:VEVENT
DTSTART;TZID=Africa/Nairobi:20260127T183000
DTEND;TZID=Africa/Nairobi:20260127T193000
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
Sunday morning email: "Your Week Ahead" with upcoming events + chore stats + streak info.

### Why
- Low frequency = no fatigue (1 email/week)
- Summarizes value of the app (engagement reminder)
- Differentiating - no calendar app sends "Julia completed 8 chores this week"
- Free via Resend (already configured, 100/day free tier)

### Implementation

**New files**:
- `lib/services/email-digest.ts` (~80 lines) - Build digest content
- `routes/api/cron/weekly-digest.ts` (~50 lines) - Sunday 9am trigger

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

**Opt-in**: Checkbox in `/parent/settings` → stored per-user in `family_profiles.preferences.notifications` JSONB:
```json
{ "weekly_summary": true, "digest_channel": "email" }
```
Uses existing JSONB architecture (see [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md)).
Uses contact info already on file in `auth.users` (no manual entry needed).
Channel auto-detected: email for email/social signups, SMS for phone signups.

### Sending
- Use existing `RESEND_API_KEY` from .env
- Resend npm package or HTTP API (simple POST)
- **Cron: `Deno.cron`** (native, zero-dependency, supported on Deno Deploy)

```typescript
// In main.ts — Sunday 9am EAT (6am UTC)
Deno.cron("weekly-digest", "0 6 * * 0", async () => {
  await sendWeeklyDigests();
});
```

Requires `--unstable-cron` flag in deno.json tasks (alongside `--unstable-kv`).
Deno Deploy handles retries automatically on failure.

### Cron Fallback Strategy

**Primary**: `Deno.cron` (native, zero-dependency)
**Fallback**: HTTP endpoint with shared secret (triggerable externally)
**Safety**: Idempotent sends via `last_sent_at` timestamp

```typescript
// routes/api/cron/weekly-digest.ts — HTTP fallback trigger
export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (secret !== Deno.env.get("CRON_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await sendWeeklyDigests();
    return Response.json({ success: true, sent: result.count });
  }
};
```

**Idempotency** — `sendWeeklyDigests()` checks `last_sent_at` before sending:
```typescript
// In sendWeeklyDigests() — skip if already sent this week
const lastSent = profile.preferences?.notifications?.last_sent_at;
const lastSunday = getLastSunday(); // most recent Sunday 9am EAT (6am UTC)
if (lastSent && new Date(lastSent) >= lastSunday) {
  continue; // already sent this cycle
}

// After successful send — record timestamp
await supabase.from("family_profiles").update({
  preferences: {
    ...profile.preferences,
    notifications: {
      ...profile.preferences?.notifications,
      last_sent_at: new Date().toISOString(),
    }
  }
}).eq("id", profile.id);
```

**External trigger options** (all free, only needed if `Deno.cron` proves unreliable):
- cron-job.org — free plan, 1 request/week
- GitHub Actions — `schedule: cron: "0 6 * * 0"`
- UptimeRobot — monitor the endpoint on a schedule

**Env var**: Add `CRON_SECRET` to `.env` (random string, used to authenticate HTTP fallback).

### POC Verification (January 22, 2026) — All Passed

All three fallback mechanisms verified against production infrastructure:

| POC | Script | Result | Evidence |
|-----|--------|--------|----------|
| Deno.cron | `scripts/PoCs/poc1_deno_cron.ts` | **PASS** | 3 fires at :48, :49, :50 (every-minute schedule) |
| HTTP Secret | `scripts/PoCs/poc2_http_secret.ts` | **PASS** | 401 (no secret), 401 (wrong), 200 (correct) |
| Idempotency | `scripts/PoCs/poc3_idempotent_send.ts` | **PASS** | SENT → SKIPPED → SENT (real DB read/write) |

**POC 1** — `Deno.cron` fires reliably with `--unstable-cron` flag. Confirmed timer precision (~9ms jitter).

**POC 2** — Secret-authenticated endpoint correctly rejects unauthorized requests.
Missing secret and wrong secret both return 401. Only `CRON_SECRET` match returns 200.

**POC 3** — JSONB `last_sent_at` in `preferences.notifications` prevents double-sends.
Tested against real Supabase (`family_profiles` table, parent profile "Mom").
Cleanup restores original state after test.

**Run POCs**: `bash scripts/PoCs/run_all.sh [1|2|3]`

### Delivery Guarantee: Dual-Trigger Architecture

Based on verified POCs, the digest uses a **belt-and-suspenders** approach:

```
                    ┌─────────────────┐
                    │  Sunday 9am     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                              ▼
     ┌────────────────┐           ┌──────────────────┐
     │  Deno.cron     │           │  HTTP Fallback   │
     │  (primary)     │           │  (external cron) │
     │  main.ts       │           │  /api/cron/...   │
     └───────┬────────┘           └────────┬─────────┘
             │                              │
             └──────────────┬───────────────┘
                            ▼
              ┌──────────────────────────┐
              │  sendWeeklyDigests()     │
              │  (idempotent)            │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │  Check last_sent_at      │
              │  per profile             │
              ├──────────────────────────┤
              │  If sent this cycle:     │
              │    → SKIP (no-op)        │
              │  If not sent:            │
              │    → SEND + record       │
              └──────────────────────────┘
```

**Why this guarantees delivery**:
- If `Deno.cron` fires → digest sent, `last_sent_at` recorded
- If `Deno.cron` misses → external fallback fires, same function runs
- If both fire → second call sees `last_sent_at`, skips (no duplicate)
- If both miss → next login catch-up can be added later (not needed yet)

### Per-User Digest (Multi-Parent Support)
- Digest preference stored **per profile** (not per family)
- Each parent configures independently in `/parent/settings`
- **No email/phone input needed** — uses contact info from `auth.users` (registration data)
- Stored in `family_profiles.preferences.notifications` JSONB:
```json
{
  "weekly_summary": true,
  "digest_channel": "email",
  "last_sent_at": "2026-01-19T06:00:00Z",
  "sms_limit_hit": false,
  "usage": {
    "total_digests_sent": 12, "total_ics_sent": 23, "total_badges_sent": 87,
    "this_month_digests": 3, "this_month_ics": 5, "this_month_badges": 12,
    "cycle_start": "2026-01-01T00:00:00Z"
  }
}
```
- `last_sent_at` ensures idempotent sends (prevents double-send if both cron + fallback fire)
- `usage.total_*` — all-time counters (never reset, lifetime engagement analytics)
- `usage.this_month_*` — current-cycle counters (reset monthly, used for gate enforcement)
- `sms_limit_hit` flags when SMS gate triggered (shows upgrade prompt in settings)
- Aligns with existing `preferences.notifications` schema (see [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md))

### Contact Info Resolution (Send-Time Lookup)
At cron execution, fetch from `auth.users` via admin API:
```typescript
const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
const hasRealEmail = user.email && !user.email.endsWith("@phone.choregami.local");
const hasPhone = !!user.phone;
```
- Email-registered users → digest via email (`user.email`)
- Phone-registered users → digest via SMS (`user.phone`)
- Social (Google/Facebook) → digest via email (`user.email` from OAuth)
- `+number@phone.choregami.local` emails are phone-signup placeholders, not real emails

### Settings UI: Server-Side Pass-Through (Option 3)

The settings route handler already calls `supabase.auth.getUser(accessToken)` for auth.
Pass contact channel info as props to the island — zero client-side API calls:

```typescript
// In routes/parent/settings.tsx handler
const { data: { user } } = await supabase.auth.getUser(accessToken);
const hasRealEmail = user.email && !user.email.endsWith("@phone.choregami.local");
const hasPhone = !!user.phone;

// Pass to island
return ctx.render({
  ...existingProps,
  digestChannel: hasRealEmail ? "email" : hasPhone ? "sms" : null,
});
```

The island receives `digestChannel` and renders the correct checkbox label.

### Fix: Write `chores2026_user_data` on All Login Methods

**Problem**: Currently only OAuth (social) login writes to localStorage.
Email/password and phone/OTP logins skip it — `UserDataManager.storeUserSession()` is dead code.

**Solution**: Follow MealPlanner pattern — change `createSessionResponse()` in
`routes/login.tsx` and `routes/register.tsx` to return an intermediate HTML page
that writes localStorage before redirecting:

```typescript
function createSessionResponse(req: Request, session: any, userData: any, redirectTo = "/") {
  const isLocalhost = req.url.includes("localhost");
  const isSecure = !isLocalhost;

  const cookies = [
    `sb-access-token=${session.access_token}; Path=/; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  ];

  // Return HTML page that writes localStorage then redirects
  return new Response(`<!DOCTYPE html><html><head><title>Logging in...</title></head>
    <body>
      <script>
        localStorage.setItem('chores2026_user_data', ${JSON.stringify(JSON.stringify(userData))});
        window.dispatchEvent(new CustomEvent('chores2026_user_data_updated'));
        window.location.href = '${redirectTo}';
      </script>
    </body></html>`, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Set-Cookie": cookies.join(", "),
    },
  });
}
```

**Build userData before calling createSessionResponse:**
```typescript
// After successful auth (email, phone, or social)
const userData = {
  id: user.id,
  email: user.email,
  phone: user.phone || null,
  user_metadata: user.user_metadata || {},
  signup_method: mode,  // "email" | "phone" | "oauth"
  auth_flow: "login",   // or "signup"
  stored_at: new Date().toISOString(),
};
```

**Logout**: Already clears `chores2026_user_data` in `routes/logout.ts:69`.

### Files to Update

| File | Change |
|------|--------|
| `routes/login.tsx` | `createSessionResponse()` → HTML with localStorage write |
| `routes/register.tsx` | Same pattern for signup flow |
| `routes/parent/settings.tsx` | Pass `digestChannel` prop from `auth.users` |

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

Add to `/parent/settings` (per-user section, not family-wide):

```
📧 Notifications
────────────────────────
☑ Weekly digest via email       ← (or "via SMS" for phone users)
  Sends to your registered email/phone

━━━━━━━━━━━━━━━━━━━━━━━
```

Store per-user in `family_profiles.preferences.notifications` JSONB (no migration — columns already exist):
```json
{ "weekly_summary": true, "digest_channel": "email" }
```

**Notes**:
- Each parent configures independently (multi-parent support)
- No email/phone input field — uses `auth.users` contact info on file
- Channel auto-detected from registration method (email/social → email, phone → SMS)
- Users with both email+phone see radio selector for preferred channel

---

## 5b. Usage Tracking & Cost Control

### Why Track

| Feature | Cost/use | Free tier risk | Action needed |
|---------|----------|----------------|---------------|
| Email digest | $0 | None (Resend: 100/day free) | Track only |
| SMS digest | ~$0.01/msg | $4/mo @ 100 families | **Gate at 4/month** |
| ICS export | $0 | None (file download) | Track only |
| Badge tap | $0 | None (client-side) | Track only |

**Email is free up to ~750 families/month.** SMS is the only cost driver.

### Feature Limits Config

Centralized tier limits — easy to adjust without code changes:

**New file**: `config/feature-limits.ts` (~15 lines)

```typescript
export const FEATURE_LIMITS = {
  free: {
    digests_per_month: 4,         // 1/week
    sms_per_month: 4,             // Same as digests (SMS costs money)
    calendar_exports: Infinity,   // Zero cost — keep unlimited
    badge_taps: Infinity,         // Zero cost — keep unlimited
  },
  premium: {
    digests_per_month: Infinity,
    sms_per_month: Infinity,
    calendar_exports: Infinity,
    badge_taps: Infinity,
  },
};

export const GLOBAL_EMAIL_BUDGET = 1000; // Hard cap: max emails/month across ALL users
```

### Storage: JSONB Usage Counters

Extend `family_profiles.preferences.notifications` (no migration):

```json
{
  "weekly_summary": true,
  "digest_channel": "email",
  "last_sent_at": "2026-01-19T06:00:00Z",
  "usage": {
    "total_digests_sent": 12,
    "total_ics_sent": 23,
    "total_badges_sent": 87,
    "this_month_digests": 3,
    "this_month_ics": 5,
    "this_month_badges": 12,
    "cycle_start": "2026-01-01T00:00:00Z"
  }
}
```

**Dual counters**: `total_*` (all-time, never reset) + `this_month_*` (reset monthly).
- All-time totals → lifetime engagement analytics ("how valuable is this user?")
- Monthly counters → gate enforcement ("have they hit the free cap?")

### Implementation: Usage Tracker Service

**New file**: `lib/services/usage-tracker.ts` (~50 lines)

```typescript
import { FEATURE_LIMITS, GLOBAL_EMAIL_BUDGET } from "../../config/feature-limits.ts";

const METRIC_TO_MONTH_KEY: Record<string, string> = {
  digests: "this_month_digests",
  ics: "this_month_ics",
  badges: "this_month_badges",
};

export async function incrementUsage(profileId: string, metric: string) {
  const { data } = await supabase
    .from("family_profiles")
    .select("preferences")
    .eq("id", profileId)
    .single();

  const prefs = data?.preferences || {};
  const notifications = prefs.notifications || {};
  const usage = notifications.usage || { cycle_start: new Date().toISOString() };

  // Reset monthly counters if new month
  const cycleStart = new Date(usage.cycle_start || 0);
  const now = new Date();
  if (now.getMonth() !== cycleStart.getMonth() || now.getFullYear() !== cycleStart.getFullYear()) {
    Object.keys(usage).forEach(k => {
      if (k.startsWith("this_month_")) usage[k] = 0;
    });
    usage.cycle_start = now.toISOString();
  }

  // Increment all-time total (never resets)
  const totalKey = `total_${metric}_sent`;
  usage[totalKey] = (usage[totalKey] || 0) + 1;

  // Increment monthly counter (resets each cycle)
  const monthKey = METRIC_TO_MONTH_KEY[metric];
  if (monthKey) {
    usage[monthKey] = (usage[monthKey] || 0) + 1;
  }

  await supabase.from("family_profiles").update({
    preferences: { ...prefs, notifications: { ...notifications, usage } }
  }).eq("id", profileId);

  return usage;
}

export function getMonthlyUsage(profile: any, metric: string): number {
  const usage = profile?.preferences?.notifications?.usage || {};
  const monthKey = METRIC_TO_MONTH_KEY[metric] || `this_month_${metric}`;
  return usage[monthKey] || 0;
}

export function getTotalUsage(profile: any, metric: string): number {
  const usage = profile?.preferences?.notifications?.usage || {};
  return usage[`total_${metric}_sent`] || 0;
}
```

### Tracking Points (Where to Call `incrementUsage`)

| Action | Where | Metric key | Counters updated |
|--------|-------|-----------|-----------------|
| Digest sent | `sendWeeklyDigests()` after Resend/Twilio call | `digests` | `total_digests_sent` + `this_month_digests` |
| ICS exported | `routes/api/events/[id]/calendar.ts` after serving file | `ics` | `total_ics_sent` + `this_month_ics` |
| Badge tapped | `routes/api/analytics/event.ts` (lightweight POST from island) | `badges` | `total_badges_sent` + `this_month_badges` |

### Global Email Budget Cap

Hard stop that prevents catastrophic runaway (bug, loop, abuse):

```typescript
// At top of sendWeeklyDigests() — before iterating profiles
const { count } = await supabase
  .from("family_profiles")
  .select("preferences", { count: "exact", head: true })
  .not("preferences->notifications->usage->this_month_digests", "is", null);

// Approximate: sum this_month_digests across all profiles
const { data: allProfiles } = await supabase
  .from("family_profiles")
  .select("preferences")
  .eq("role", "parent")
  .not("preferences->notifications->weekly_summary", "is", null);

const totalSentThisMonth = allProfiles?.reduce((sum, p) => {
  return sum + (p.preferences?.notifications?.usage?.this_month_digests || 0);
}, 0) || 0;

if (totalSentThisMonth >= GLOBAL_EMAIL_BUDGET) {
  console.error("🚨 GLOBAL EMAIL BUDGET REACHED:", totalSentThisMonth);
  // Alert admin (existing alerting infrastructure)
  return { count: 0, error: "budget_exceeded" };
}
```

Even if per-user logic has a bug, this prevents sending more than 1,000 emails/month globally.

### SMS Gate: Prevent Runaway Costs

Uses `FEATURE_LIMITS` config (no hardcoded values):

```typescript
import { FEATURE_LIMITS } from "../../config/feature-limits.ts";

// In sendWeeklyDigests(), before Twilio send:
if (channel === "sms") {
  const tier = profile.subscription?.tier || "free";
  const limit = FEATURE_LIMITS[tier].sms_per_month;
  const monthlyUsage = getMonthlyUsage(profile, "digests");

  if (monthlyUsage >= limit) {
    console.log(`[${profile.name}] SMS limit reached (${monthlyUsage}/${limit}). Falling back to email.`);
    // Auto-fallback: send via email instead of skipping entirely
    await sendEmailDigest(profile, digestContent);
    await supabase.from("family_profiles").update({
      preferences: {
        ...profile.preferences,
        notifications: {
          ...profile.preferences?.notifications,
          sms_limit_hit: true,
        }
      }
    }).eq("id", profile.id);
    continue;
  }
}
```

### Upgrade Trigger Points

| Signal | Condition | Prompt |
|--------|-----------|--------|
| SMS limit hit | `usage.digests_sent >= 4` (SMS only) | "Switched to email. Upgrade for unlimited SMS" |
| High engagement | `ics_exports > 10 AND badge_taps > 20` | Subtle upgrade nudge in settings |
| Family size | `>3 kids` in family | "Growing family? Upgrade for premium features" |

**Upgrade prompt UX** (shown in settings when `sms_limit_hit: true`):

```
┌───────────────────────────────────────────────┐
│  ℹ️ Switched to Email Digest                  │
│                                               │
│  You've used 4/4 SMS digests this month.      │
│  We're sending via email instead — you        │
│  won't miss anything!                         │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Keep using email (free & unlimited) →  │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Upgrade for unlimited SMS  →           │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

### Cost Projections

| Families | Email cost | SMS cost (if all SMS) | SMS cost (with gate) |
|----------|-----------|----------------------|---------------------|
| 50 | $0 | $2/mo | $2/mo (under limit) |
| 200 | $0 | $8/mo | $8/mo (under limit) |
| 750 | $0 | $30/mo | $30/mo (under limit) |
| 1000 | $0 (upgrade Resend: $20/mo) | $40/mo | **$0** (gate forces email switch) |

**Break-even**: At 750+ families, SMS gate saves $30+/month. Email stays free until 3,000 sends/day.

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

### 6.4 Weekly Email Digest (Sunday 9am)

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

### 6.5 Email Digest — Settings (In Context)

Position: between "Event Creation" and "Kid PIN Security" sections.
No email/phone input — uses contact info from `auth.users` registration.

```
┌─────────────────────────────────────────────────┐
│  ≡        Family Settings                  👤   │
├─────────────────────────────────────────────────┤
│                                                  │
│  🎨 App Theme                                   │
│  ┌───────────────────────────────────────────┐  │
│  │  🟢  Fresh Meadow                        │  │
│  │  🟡  Sunset Citrus                       │  │
│  │  🔵  Ocean Depth                      ✓  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  📅 Event Creation                              │
│  ┌───────────────────────────────────────────┐  │
│  │  Kids can create events            [═══●] │  │
│  │  ...                                      │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  📧 Notifications                        │  │
│  │                                           │  │
│  │  ☑ Weekly digest via email                │  │
│  │    Sends to your registered email         │  │
│  │                                           │  │
│  │  Includes upcoming events, chore stats,   │  │
│  │  streaks, and family highlights.          │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  🔒 Kid PIN Security                            │
│  ┌───────────────────────────────────────────┐  │
│  │  Kid PIN Entry                            │  │
│  │  🔓 Kids can access dashboard  [●═══]    │  │
│  │     directly                              │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  🔒 Parent PIN Security                         │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

### 6.5b Digest — Phone-Registered Parent

```
┌───────────────────────────────────────────────┐
│  📧 Notifications                            │
│                                               │
│  ☑ Weekly digest via SMS                     │
│    Sends to your registered phone            │
│                                               │
│  Includes upcoming events, chore stats,      │
│  streaks, and family highlights.             │
└───────────────────────────────────────────────┘
```

### 6.5c Digest — Parent with Both Email + Phone

```
┌───────────────────────────────────────────────┐
│  📧 Notifications                            │
│                                               │
│  ☑ Weekly digest                             │
│    Send via:  (●) Email  ( ) SMS             │
│                                               │
│  Includes upcoming events, chore stats,      │
│  streaks, and family highlights.             │
└───────────────────────────────────────────────┘
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
SUNDAY 9AM
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

### 6.10 Data Flow — Registration → Settings → Dual-Trigger → Send

```
Registration              Settings Toggle              Sunday 9am
    │                          │                            │
    ▼                          ▼                    ┌───────┴───────┐
auth.users             preferences.notifications    │               │
(email/phone)          { weekly_summary: true,      ▼               ▼
    │                    digest_channel: "email",  Deno.cron    HTTP fallback
    │                    last_sent_at: "..." }      │          (CRON_SECRET)
    │                          │                    │               │
    │                          │                    └───────┬───────┘
    │                          │                            │
    └──────────────────────────┴────────────────────────────┘
                                   │
                                   ▼
                     sendWeeklyDigests() [idempotent]
                            │
                            ├── Check last_sent_at → SKIP if sent this cycle
                            │
                            ├── supabaseAdmin.auth.admin.getUserById()
                            │   → hasRealEmail? → Resend email
                            │   → hasPhone?     → Twilio SMS
                            │
                            └── Record last_sent_at (prevent re-send)
```

**Key points**:
- Contact info lives in `auth.users` (single source of truth, always current)
- Preference lives in `family_profiles.preferences.notifications` (per-user toggle)
- At send time, cron joins both: "who opted in?" + "what's their contact?"
- No contact info stored in JSONB (avoids sync problems if user changes email/phone)
- Dual-trigger (Deno.cron + HTTP fallback) guarantees delivery — idempotency prevents duplicates
- All three mechanisms verified via POCs (Jan 22, 2026)

### 6.11 Configuration Summary

| Feature | User config needed? | Where configured? | Behavior |
|---------|--------------------|--------------------|----------|
| ICS Export | None | — | Link always visible on event cards |
| Weekly Digest | Toggle only | `/parent/settings` (per-user) | Off by default, channel auto-detected |
| In-App Badge | None | — | Automatic when event today/tomorrow |

---

## 7. Action Items

### Phase 0: Fix localStorage Gap (~30 min) ✅
**Pre-requisite**: Ensures `chores2026_user_data` exists for all login methods.
- [x] Update `createSessionResponse()` in `routes/login.tsx` — return HTML page with localStorage write + redirect (MealPlanner pattern)
- [x] Update `createSessionResponse()` in `routes/register.tsx` — same pattern
- [x] Build `userData` object (`{ id, email, phone, user_metadata, signup_method, auth_flow, stored_at }`) before calling createSessionResponse
- [x] Verify `routes/logout.ts` already clears `chores2026_user_data` (confirmed: line 69)
- [ ] Tests: localStorage populated after email login, phone login, OAuth login; cleared on logout

### Phase 1: Calendar Export (~1.5 hours) ✅
- [x] Create `routes/api/events/[id]/calendar.ts` (ICS generator, **authenticated**)
- [x] Add session check (reject unauthenticated requests)
- [x] Add "Add to Calendar" link in EventsList.tsx event cards
- [x] Handle timezone in DTSTART/DTEND (TZID parameter)
- [x] Handle recurring events with RRULE
- [x] Handle multi-day events with proper DTSTART/DTEND
- [x] Usage tracking: `incrementUsage(profileId, "ics")` after serving ICS
- [ ] Tests: ICS output format, RRULE correctness, multi-day DTSTART/DTEND, VALARM reminder, Content-Type header, auth rejection

### Phase 2: Email/SMS Digest (~2.5 hours) ✅

**Core digest service:**
- [x] Create `lib/services/email-digest.ts` — build digest content (events + stats)
- [x] Create `sendWeeklyDigests()` — iterate opted-in parents, resolve contact, send
- [x] Send-time lookup via `supabaseAdmin.auth.admin.getUserById()` for contact info
- [x] Filter out `@phone.choregami.local` placeholder emails (phone-signup placeholders)

**Dual-trigger delivery guarantee (verified via POCs):**
- [x] `CRON_SECRET` added to `.env` ✓ (POC 2 verified)
- [x] Add `--unstable-cron` to deno.json `start`/`build`/`preview` tasks
- [x] Add `Deno.cron("weekly-digest", "0 6 * * 0", ...)` in `main.ts` — primary trigger
- [x] Create `routes/api/cron/weekly-digest.ts` — HTTP fallback (pattern from `scripts/PoCs/poc2_http_secret.ts`)
- [x] Make `sendWeeklyDigests()` idempotent — check `last_sent_at` per profile, skip if sent this cycle (pattern from `scripts/PoCs/poc3_idempotent_send.ts`)
- [x] Record `last_sent_at` in `preferences.notifications` after each successful send
- [x] Register external cron fallback (GitHub Actions) — see Section 10 below

**Settings UI:**
- [x] Add digest checkbox in parent settings (server-side pass-through: route passes `digestChannel` prop)
- [x] In `routes/parent/settings.tsx` handler: detect channel from `auth.users`, pass to island
- [x] Store preference in `family_profiles.preferences.notifications` JSONB (`{ weekly_summary, digest_channel, last_sent_at }`)
- [x] Create `routes/api/settings/notifications.ts` — POST endpoint for saving preferences

**Tests:**
- [ ] Digest content builder (events query, stats aggregation, shoutout logic)
- [ ] Channel detection (email-registered → email, phone-registered → SMS, both → preferred)
- [ ] Idempotency: call `sendWeeklyDigests()` twice → second is no-op
- [ ] Secret auth: wrong/missing `CRON_SECRET` → 401
- [ ] Opt-out respected: `weekly_summary: false` → skipped

### Phase 3: In-App Badge (~45 min) ✅
- [x] Add upcoming event check to AppHeader (via `/api/events/badge-check` endpoint)
- [x] Add red dot badge CSS (with pulse animation)
- [x] Create `routes/api/events/badge-check.ts` — lightweight today/tomorrow check
- [ ] Tests: today/tomorrow detection, no-badge when no events, midnight boundary edge case

### Phase 4: Usage Tracking & Cost Control (~1.5 hours) ✅

**Feature limits config:**
- [x] Create `config/feature-limits.ts` — `FEATURE_LIMITS` (free/premium tiers) + `GLOBAL_EMAIL_BUDGET`
- [x] SMS gate uses `FEATURE_LIMITS[tier].sms_per_month` (no hardcoded values)

**Usage tracker service (dual counters):**
- [x] Create `lib/services/usage-tracker.ts` — `incrementUsage()`, `getMonthlyUsage()`, `getTotalUsage()`
- [x] All-time counters (`total_*_sent`) — never reset, used for lifetime engagement analytics
- [x] Monthly counters (`this_month_*`) — reset when `cycle_start` month changes, used for gate enforcement
- [x] Add `routes/api/analytics/event.ts` — lightweight POST endpoint for client-side events (badge taps)

**Instrument tracking points:**
- [x] In `sendWeeklyDigests()`: `incrementUsage(profileId, "digests")` after successful send
- [x] In `routes/api/events/[id]/calendar.ts`: `incrementUsage(profileId, "ics")` after serving ICS
- [ ] In AppHeader island: POST to `/api/analytics/event` on badge tap → `incrementUsage(profileId, "badges")`

**Global email budget cap** (queries in [`sql/20260122_notifications_usage_queries.sql`](../../sql/20260122_notifications_usage_queries.sql)):
- [x] At top of `sendWeeklyDigests()`: sum `this_month_digests` across all parent profiles
- [x] If total >= `GLOBAL_EMAIL_BUDGET` (1000) → abort entire run, log alert
- [x] Prevents catastrophic runaway even if per-user logic has a bug

**SMS cost gate:**
- [x] In `sendWeeklyDigests()`: check `getMonthlyUsage(profile, "digests") >= FEATURE_LIMITS[tier].sms_per_month` → auto-fallback to email + flag `sms_limit_hit`
- [x] In settings island: show "Switched to Email Digest" banner when `sms_limit_hit: true`
- [x] Provide "Switch to email" action (updates `digest_channel` to `"email"`, clears `sms_limit_hit`)
- [ ] Provide "Upgrade" link (existing Stripe integration — deferred until premium tier exists)

**Tests:**
- [ ] Counter increment: both `total_*` and `this_month_*` update in single call
- [ ] Monthly reset: new month resets `this_month_*` but preserves `total_*`
- [ ] SMS gate: exceeding `FEATURE_LIMITS.free.sms_per_month` → falls back to email
- [ ] Global cap: total across all profiles >= 1000 → abort run
- [ ] `sms_limit_hit` flag set correctly
- [ ] Switch-to-email clears flag and updates channel

---

## 8. Cross-References

- **JSONB Settings**: [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - `preferences.notifications` schema for digest storage
- **FCM Plan (Deferred)**: [FCM Push Notifications](./20260122_fcm_push_notifications_plan.md) - archived, revisit when demand validated
- **MealPlanner FCM Strategy**: Referenced for analysis but approach rejected for ChoreGami
- **Events System**: [Multi-day & Repeating Events](./20260121_events-multiday-repeating-endtime.md)
- **Resend Config**: `.env` line 36 (`RESEND_API_KEY`)
- **Twilio Config**: `.env` lines 68-72 (reserved for future SMS if validated)
- **MealPlanner localStorage Pattern**: `choregami-mealplanner/routes/login.tsx:110-122` — HTML response with script injection
- **MealPlanner Logout**: `choregami-mealplanner/routes/logout.tsx:59` — clears `mealplanner_user_data`
- **ChoreGami UserDataManager**: `lib/auth/UserDataManager.ts` — `getStoredUserData()` for client-side reads
- **Usage Queries**: [`sql/20260122_notifications_usage_queries.sql`](../../sql/20260122_notifications_usage_queries.sql) — global budget cap, upgrade candidates, cron helper, atomic increment
- **POC Scripts**: `scripts/PoCs/poc{1,2,3}_*.ts` — verified Deno.cron, HTTP secret, JSONB idempotency (Jan 22, 2026)

---

**Estimated Total Effort**: ~7 hours (includes localStorage fix + unit tests + auth + timezone + usage tracking + cost control)
**Monthly Cost**: $0 email (Resend free tier), SMS gated at 4/user/month
**Database Migration**: None (JSONB `preferences` column already exists on `family_profiles`)
**Vendor Lock-in**: None
**Delivery Guarantee**: Dual-trigger (Deno.cron + HTTP fallback) with idempotent sends — verified via POCs
**Cost Control**: `FEATURE_LIMITS` config + global email cap (1000/month) + SMS gate + dual counters (all-time + monthly)
**Cron**: `Deno.cron` primary + `routes/api/cron/weekly-digest.ts` fallback (secret-authenticated)
**Auth**: Calendar endpoint authenticated via session
**Multi-parent**: Per-user digest config in `family_profiles.preferences.notifications`
**Contact info**: Uses `auth.users` registration data (no manual input)
**Usage tracking**: JSONB counters in `preferences.notifications.usage` (monthly reset)
**POCs**: All 3 passed (Jan 22, 2026) — see `scripts/PoCs/`

---

## 9. Implementation Complete (January 22, 2026)

### Files Created (8 new)

| File | Phase | Purpose |
|------|-------|---------|
| `config/feature-limits.ts` | P4 | `FEATURE_LIMITS` (free/premium tiers) + `GLOBAL_EMAIL_BUDGET` |
| `lib/services/email-digest.ts` | P2 | Full digest service: build content, send email/SMS, idempotency, SMS gate, budget cap |
| `lib/services/usage-tracker.ts` | P4 | `incrementUsage()`, `getMonthlyUsage()`, `getTotalUsage()` with dual counters |
| `routes/api/events/[id]/calendar.ts` | P1 | ICS export with TZID, VALARM, RRULE, multi-day support |
| `routes/api/cron/weekly-digest.ts` | P2 | HTTP fallback trigger (CRON_SECRET authenticated) |
| `routes/api/events/badge-check.ts` | P3 | Lightweight today/tomorrow event check |
| `routes/api/analytics/event.ts` | P4 | Client-side event tracking (badge taps) |
| `routes/api/settings/notifications.ts` | P2 | Save digest preferences to JSONB |

### Files Modified (8 existing)

| File | Phase | Change |
|------|-------|--------|
| `routes/login.tsx` | P0 | `createSessionResponse()` → HTML with localStorage write |
| `routes/register.tsx` | P0 | Same pattern for signup flow |
| `routes/parent/settings.tsx` | P2 | Pass `digestChannel` + `notificationPrefs` from `auth.users` |
| `islands/FamilySettings.tsx` | P2 | Notifications section with toggle + SMS limit banner |
| `islands/EventsList.tsx` | P1 | "Add to Calendar" link on every event card |
| `islands/AppHeader.tsx` | P3 | Event badge dot with pulse animation |
| `main.ts` | P2 | `Deno.cron("weekly-digest", "0 6 * * 0", ...)` |
| `deno.json` | P2 | Added `--unstable-cron` to start/build/preview tasks |

### Build Status
- All new/modified files pass type check
- Only pre-existing errors remain (`routes/api/gift/redeem.ts` — unrelated)
- Fresh manifest regenerated (56 routes, 39 islands)

### Architecture Highlights
- **Dual-trigger delivery**: `Deno.cron` primary + HTTP fallback, idempotent via `last_sent_at`
- **SMS gate with auto-fallback**: Exceeds 4/month → sends via email instead (not silent skip)
- **Global budget cap**: Hard stop at 1,000 emails/month prevents runaway
- **Zero migration**: All data in existing `preferences` JSONB column
- **Usage tracking**: Dual counters (`total_*` never reset + `this_month_*` reset monthly)

### Remaining TODOs (Non-blocking)
- [ ] Unit tests for all phases
- [x] Register external cron fallback (GitHub Actions) — secrets configured, workflow file pending
- [ ] Badge tap tracking in AppHeader (POST to `/api/analytics/event`)
- [ ] "Upgrade" link for premium tier (deferred until Stripe integration)

---

## 10. GitHub Actions Cron Fallback

### Purpose

External safety net for the weekly digest. If `Deno.cron` doesn't fire (machine sleeping, mid-deployment, cold start), GitHub Actions triggers the same idempotent endpoint. Both can fire — `last_sent_at` prevents duplicates.

### Architecture

```
Sunday 6am UTC (9am EAT)
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Deno.cron   GitHub Actions
(primary)   (fallback)
    │         │
    └────┬────┘
         │
         ▼
sendWeeklyDigests() [idempotent]
```

### Repository Secrets (Configured)

| Secret | Purpose | Status |
|--------|---------|--------|
| `CRON_SECRET` | Authenticates request to `/api/cron/weekly-digest` | ✅ Set |
| `APP_BASE_URL` | Production URL (configurable for host migration) | ✅ Set |

**Why `APP_BASE_URL` is a secret**: When migrating from `https://choregami.fly.dev` to `https://choregami.app` (Cloud Run), update this single value — no code change needed.

**Secret type**: Repository secrets (not environment secrets). Environment secrets would only be useful with multiple deploy targets (staging/production). Single-target → repository secrets are simpler.

### Workflow File

**Path**: `.github/workflows/weekly-digest.yml`

```yaml
name: Weekly Digest Fallback
on:
  schedule:
    - cron: '0 6 * * 0'   # Sunday 6am UTC = 9am EAT
  workflow_dispatch:        # Manual trigger for testing

jobs:
  trigger-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger weekly digest endpoint
        run: |
          response=$(curl -s -w "\n%{http_code}" \
            "${{ secrets.APP_BASE_URL }}/api/cron/weekly-digest?secret=${{ secrets.CRON_SECRET }}")

          http_code=$(echo "$response" | tail -1)
          body=$(echo "$response" | head -n -1)

          echo "Status: $http_code"
          echo "Response: $body"

          if [ "$http_code" -ne 200 ]; then
            echo "::error::Digest trigger failed with status $http_code"
            exit 1
          fi
```

### Key Properties

- **Idempotent**: Safe to double-fire (Deno.cron + GitHub Actions) — `last_sent_at` per profile prevents duplicate sends
- **Configurable host**: `APP_BASE_URL` secret allows Fly.io → Cloud Run migration without code changes
- **Testable**: `workflow_dispatch` enables manual trigger from GitHub Actions UI
- **Observable**: Failed runs surface in GitHub Actions tab with error details

### Host Migration Checklist (Fly.io → Cloud Run)

1. Deploy to Cloud Run with `CRON_SECRET` env var set to same value
2. Update `APP_BASE_URL` repository secret to `https://choregami.app`
3. Verify: Actions tab → "Weekly Digest Fallback" → "Run workflow" → confirm 200 response

---

*Plan created: January 22, 2026*
*Implemented: January 22, 2026*
*GitHub Actions cron: January 22, 2026 (secrets configured, workflow file pending)*
