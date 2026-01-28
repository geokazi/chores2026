# SMS Delivery: 10DLC Compliance & Carrier Registration

**Date**: January 23, 2026 (Updated: January 27, 2026)
**Status**: Blocked — requires Twilio Console action
**Priority**: High (SMS digest + SMS invites non-functional until resolved)
**Related**:
- [Notifications: Calendar + Email + Badges](../milestones/20260122_notifications_calendar_email_badges.md)
- [Family Member Invites](../milestones/20260127_family_member_invites.md) - SMS invites also blocked

---

## Problem Summary

SMS messages sent via the weekly digest are accepted by Twilio's API (HTTP 200, status "queued") but **rejected by downstream carriers** before delivery. Users never receive the SMS.

### Observed Behavior

```
Twilio API Response:
  status: "queued"
  error_code: null
  sid: SM431d1e9a0ccb5b7a174321bb75d96e61

After delivery attempt:
  status: "undelivered"
  error_code: 30034
  error_message: "Message Blocked"
  price: -$0.0083 (charged despite non-delivery)
```

### Root Cause

US carriers (T-Mobile, AT&T, Verizon) now **require 10DLC registration** for all application-to-person (A2P) SMS sent from local (10-digit) phone numbers. Our Twilio number `+12068884842` (Seattle local) is not registered for A2P messaging, so carriers block the messages at the network level.

---

## What is 10DLC?

**10DLC** (10-Digit Long Code) is a US carrier-mandated system for registering business SMS use cases.

| Term | Meaning |
|------|---------|
| **A2P** | Application-to-Person messaging (our use case) |
| **P2P** | Person-to-Person (regular texting between humans) |
| **10DLC** | 10-Digit Long Code — standard US phone numbers |
| **Brand** | Your registered business identity (GKTech Solutions LLC) |
| **Campaign** | Your specific messaging use case (weekly digest notifications) |
| **TCR** | The Campaign Registry — the industry body managing 10DLC |

### Why Carriers Block Unregistered Messages

Since 2023, US carriers enforce 10DLC to:
1. Reduce spam/phishing from unregistered senders
2. Identify legitimate business senders
3. Apply per-campaign throughput limits
4. Provide opt-out compliance

Unregistered local numbers sending A2P traffic are treated as spam and silently dropped.

---

## Current Configuration

| Setting | Value |
|---------|-------|
| Twilio Account | GKTech Solutions LLC (Full, Active) |
| Account SID | AC<redacted> |
| From Number | +12068884842 (Seattle local, 10DLC) |
| Number Type | Local (not toll-free, not short code) |
| 10DLC Brand | Not registered |
| 10DLC Campaign | Not registered |
| SMS Status | Queued by Twilio, blocked by carrier |

---

## Resolution Options

### Option 1: Register 10DLC Campaign (Recommended)

Register the business and use case with Twilio's A2P Messaging compliance.

**Steps:**

1. **Register Brand** — Twilio Console > Messaging > Trust Hub > A2P Brand Registration
   - Business name: GKTech Solutions LLC
   - EIN or business registration required
   - Approval: 1-3 business days

2. **Create Campaign** — Twilio Console > Messaging > Trust Hub > A2P Campaign
   - Use case: "Notifications" or "Account Notifications"
   - Description: "Weekly family chore scorecard digest sent to opted-in parents"
   - Sample messages: Include actual SMS template
   - Opt-in method: "In-app settings toggle"
   - Opt-out: "Reply STOP"
   - Approval: 1-5 business days

3. **Associate Number** — Link `+12068884842` to the approved campaign

**Pros**: Best deliverability, lowest cost per message, highest throughput
**Cons**: Takes 2-7 business days for full approval

### Option 2: Switch to Toll-Free Number

Purchase a toll-free number and complete toll-free verification.

**Steps:**

1. **Buy toll-free number** — Twilio Console > Phone Numbers > Buy > Toll-Free
2. **Submit verification** — Twilio Console > Phone Numbers > Toll-Free Verification
   - Business name, use case description, sample messages
   - Approval: 2-5 business days
3. **Update `.env`** — Set `TWILIO_PHONE_NUMBER` to new toll-free number

**Pros**: Simpler registration process, good for low-volume
**Cons**: Slightly higher per-message cost, users may distrust toll-free senders

### Option 3: Use Twilio Messaging Service

Create a Messaging Service with a number pool for automatic sender selection.

**Steps:**

1. **Create Messaging Service** — Twilio Console > Messaging > Services
2. **Add number** to the service pool
3. **Update code** — Send via Messaging Service SID instead of From number:

```typescript
// In sendSmsDigest():
body: new URLSearchParams({
  MessagingServiceSid: Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!,
  To: toPhone,
  Body: smsBody,
}),
```

**Pros**: Handles compliance routing automatically, scales well
**Cons**: Still requires underlying 10DLC or toll-free registration

### Option 4: Use Twilio Verify (Workaround)

Repurpose the existing Verify service (already configured for phone auth) to send templated messages.

**Not recommended** — Verify is for OTP/authentication only, using it for marketing/notification violates Twilio's acceptable use policy.

---

## Code Impact

The SMS sending code in `lib/services/email-digest.ts` is **correct and functional**. No code changes are needed for Options 1 or 2. Option 3 requires a minor change to use `MessagingServiceSid` instead of `From`.

### Relevant Code Path

```
sendWeeklyDigests()
  → resolvePhone(user)           # Correctly extracts +16179030249
  → sendSmsDigest(phone, content)
    → Twilio API POST             # HTTP 200, message queued
    → Carrier delivery            # ❌ BLOCKED (error 30034)
```

### Environment Variables (Current)

```bash
TWILIO_ACCOUNT_SID=AC<redacted>  # ✅ Valid
TWILIO_AUTH_TOKEN=<redacted>                             # ✅ Valid
TWILIO_PHONE_NUMBER=+12068884842                         # ⚠️  Not 10DLC registered
TWILIO_VERIFY_SERVICE_SID=VA<redacted>                   # ✅ For phone auth only
```

### After Registration (New Variable for Option 3)

```bash
TWILIO_MESSAGING_SERVICE_SID=MG<sid>  # Only if using Messaging Service
```

---

## Testing After Resolution

Once 10DLC registration is approved:

1. **Reset idempotency flag:**
```sql
UPDATE family_profiles
SET preferences = jsonb_set(
  preferences,
  '{notifications,last_sent_at}',
  '"2020-01-01T00:00:00Z"'::jsonb
)
WHERE user_id = '68cb5436-e769-421b-ac94-3160d06a5ab7';
```

2. **Trigger digest:**
```bash
curl "http://localhost:8000/api/cron/weekly-digest?secret=$(grep '^CRON_SECRET=' .env | cut -d= -f2)"
```

3. **Verify delivery status:**
```bash
# Replace SM_SID with the message SID from digest logs
curl -s "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages/<SM_SID>.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Status: {d[\"status\"]}')
print(f'Error: {d.get(\"error_code\", \"none\")}')
"
```

Expected: `status: "delivered"`, `error_code: none`

4. **Full testing guide**: See [Testing Notifications](../testing-notifications.md)

---

## SMS Monthly Limits (Unchanged)

The existing rate limiting in `config/feature-limits.ts` remains valid:

| Tier | SMS/Month | Status |
|------|-----------|--------|
| Free | 4 | Enforced in `sendWeeklyDigests()` |
| Premium | 30 | Future tier |

These limits apply *after* carrier delivery succeeds. Currently, messages never reach the carrier delivery stage.

---

## Timeline Estimate

| Step | Duration |
|------|----------|
| Submit Brand registration | Same day |
| Brand approval | 1-3 business days |
| Submit Campaign | Same day (after brand) |
| Campaign approval | 1-5 business days |
| Associate number | Immediate (after campaign) |
| **Total** | **3-8 business days** |

---

## Error Code Reference

| Code | Meaning | Our Situation |
|------|---------|---------------|
| 30003 | Unreachable destination | Not our issue |
| 30004 | Message blocked by carrier | Close — but 30034 is more specific |
| 30005 | Unknown destination | Not our issue |
| 30006 | Landline or unreachable | Not our issue |
| **30034** | **Message blocked** | **Our error — unregistered 10DLC** |
| 30035 | Message rate limit exceeded | Not our issue (yet) |

---

## Cross-References

- [Notifications: Calendar + Email + Badges](../milestones/20260122_notifications_calendar_email_badges.md) — Base notification system implementation
- [Weekly Digest Enhancement](../marketing/20260123_weekly_digest_enhancement.md) — Enhanced 7-section scorecard design
- [Testing Notifications](../testing-notifications.md) — Email & SMS testing procedures
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) — `preferences.notifications` schema
- [Deferred: FCM Push Notifications](../milestones/20260122_DEFERRED_fcm_push_notifications_plan.md) — Alternative push channel (future)
- [Feature Limits Config](../../config/feature-limits.ts) — SMS monthly caps

---

## Action Items

- [ ] Register Brand in Twilio Console (GKTech Solutions LLC)
- [ ] Submit 10DLC Campaign (use case: account notifications / weekly digest / family invites)
- [ ] Associate +12068884842 with approved campaign
- [ ] Re-test SMS delivery after approval
- [ ] Monitor first successful delivery via Twilio message logs
- [ ] Consider toll-free as backup if 10DLC approval is slow
- [ ] Re-enable SMS invites in `invite-service.ts` after approval
- [ ] Remove "SMS unavailable" banner from `FamilyMembersSection.tsx`

## Affected Features (Jan 27, 2026 Update)

| Feature | Status | Workaround |
|---------|--------|------------|
| Weekly SMS Digest | ❌ Blocked | Email digest works |
| SMS Family Invites | ❌ Blocked | Email invites work |

### SMS Invite Demand Tracking

User attempts to use SMS invites are tracked in `family_activity`:

```sql
SELECT COUNT(*) FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' = 'sms_invite';
```

Use this to gauge urgency of A2P registration.

---

*Created: January 23, 2026*
*Diagnosed via: Direct Twilio API testing, message SID SM431d1e9a0ccb5b7a174321bb75d96e61*
