# Share Page Improvements

**Date**: February 5, 2026
**Status**: ✅ Complete
**Related**: [Landing Page & Demand Capture](./20260201_landing_page_demand_capture.md), [Referral Share Feature](../planned/20260130_referral_share_feature.md)

---

## Summary

Redesigned the Share page with empathy-first copy, real family statistics, and data consistency fixes. Changed from promotional "referral" language to peer-to-peer "invite" language.

---

## Features Implemented

### 1. Data Consistency with Reports Page

**Problem**: Share page showed different stats than Reports page.

**Root Causes**:
1. Rolling 7-day window vs Sunday-first weeks
2. Only counting `chore_completed` vs all positive transactions
3. Combined family streak vs max individual streak
4. Using `createClient()` (anon key, RLS blocked) instead of `getServiceSupabaseClient()` (service key, bypasses RLS)

**Fix**: Match Reports page logic exactly:

```typescript
// Use service client to bypass RLS on choretracker tables
const supabase = getServiceSupabaseClient();

// Calculate Sunday-first week start (same as getFamilyAnalytics)
const todayDate = new Date(year, month - 1, day);
const dayOfWeek = todayDate.getDay(); // 0=Sun
const weekStartLocal = new Date(year, month - 1, day - dayOfWeek);

// Get ALL positive transactions (same as Reports)
const { data: transactions } = await supabase
  .schema("choretracker")
  .from("chore_transactions")
  .select("profile_id, created_at, points_change")
  .eq("family_id", family.id)
  .gt("points_change", 0);

// Calculate max individual streak (not combined family)
const profileIds = [...new Set(txData.map((t) => t.profile_id))];
let maxStreak = 0;
for (const profileId of profileIds) {
  const profileStreak = calculateStreak(profileTx.map((t) => t.created_at));
  if (profileStreak > maxStreak) maxStreak = profileStreak;
}
```

### 2. Events Count Added

Now shows total family events alongside chores and streak:

```
This week: 🎉 5 chores • 🔥 6-day streak • 📅 3 events
```

### 3. Empathy-First Copy

Shifted from promotional to peer-to-peer messaging:

| Before | After |
|--------|-------|
| "Help other families discover ChoreGami" | "Help another family feel more organized" |
| "Share ChoreGami" | "Send to a friend" |
| "Tell a friend. Get 1 free month when they join." | "If they join, you'll both get 1 free month 🎉" |
| "YOUR REFERRAL LINK" | "YOUR PERSONAL INVITE LINK" |
| "Text, post, or just tell someone!" | "Text it, or just mention it next time you chat" |

### 4. Dynamic Share Messages

Share messages vary based on family's actual stats:

```typescript
// 5+ day streak
"We've been using ChoreGami for 6 days straight and the kids actually do their chores now."

// Events + 10+ chores
"Finally stopped juggling apps. 12 chores done this week, 3 family events planned—one place for everything."

// 10+ chores
"12 chores completed this week. Our family actually uses this app together. Thought you might like it."

// Has events
"We track chores and family events in one app now. 5 events planned so far. Works surprisingly well."

// Default
"We stopped juggling apps. Chores, points, family events—one shared place. Works for real families."
```

---

## Critical Implementation Detail

### Supabase Client Selection (RLS)

**IMPORTANT**: This fix is now documented in CLAUDE.md to prevent recurrence.

```typescript
// ✅ CORRECT - for server-side routes (bypasses RLS)
import { getServiceSupabaseClient } from "../lib/supabase.ts";
const supabase = getServiceSupabaseClient();

// ❌ WRONG - anon key is blocked by RLS on choretracker tables
import { createClient } from "../lib/supabase.ts";
const supabase = createClient();
```

**Why**:
- `createClient()` uses `SUPABASE_KEY` (anon key) → subject to RLS policies
- `getServiceSupabaseClient()` uses `SUPABASE_SERVICE_ROLE_KEY` → bypasses RLS
- All `choretracker.*` tables have RLS enabled

---

## Files Modified

| File | Changes |
|------|---------|
| `routes/share.tsx` | Sunday-first weeks, service client, events count, empathy copy |
| `islands/ShareReferralCard.tsx` | Dynamic messages, "invite" language, stats badge with events |
| `CLAUDE.md` | Added Supabase Client Selection (RLS) pattern |

---

## UI Changes

### Before
```
🎁 Help other families discover ChoreGami

Share ChoreGami
Tell a friend. Get 1 free month when they join.

YOUR REFERRAL LINK
```

### After
```
💛 Help another family feel more organized

We've been using ChoreGami to manage chores and
family plans in one shared place—and it's made
a real difference.

If they join, you'll both get 1 free month 🎉

This week: 🎉 5 chores • 🔥 6-day streak • 📅 3 events

YOUR PERSONAL INVITE LINK
```

---

## Related Bug Fix

### Add to Calendar Button Visibility (Ocean Depth Theme)

**Problem**: Button was barely visible in blue theme.

**Root Cause**: Used `--color-secondary` which is `#e0e7ff` (light indigo for borders) in Ocean Depth.

**Fix**: Changed to `--color-primary` which is solid in all themes.

```typescript
// Before
backgroundColor: "var(--color-secondary)"

// After
backgroundColor: "var(--color-primary)"
```

---

## Cross-References

- [Points Consistency](../troubleshooting/20260131_points_consistency_single_source_of_truth.md) - Same Sunday-first week logic
- [Events Progressive Disclosure](./20260205_events_progressive_disclosure_implementation.md) - EventCard component
- [Referral Feature](../planned/20260130_referral_share_feature.md) - Original referral implementation

---

*Created: February 5, 2026*
