# Decision: SMS Invites Disabled with Demand Tracking

**Date**: January 28, 2026
**Status**: Implemented
**Priority**: P2 (Workaround in place, data-driven re-enablement)

---

## Context

Family member invites were implemented with dual-channel support (email + phone). However, SMS delivery is blocked by US carriers due to **A2P 10DLC registration requirements**.

### The Problem

When attempting to send SMS invites via Twilio:

```
Twilio API Response:
  status: "queued"
  error_code: null

After carrier delivery:
  status: "undelivered"
  error_code: 30034
  error_message: "Message Blocked"
```

US carriers (T-Mobile, AT&T, Verizon) now require **10DLC registration** for all application-to-person (A2P) SMS from local phone numbers. Our Twilio number `+12068884842` is not registered, so carriers silently drop messages.

### Options Considered

| Option | Description | Effort | Risk |
|--------|-------------|--------|------|
| **A. Disable SMS entirely** | Remove phone option from UI | Low | Lose phone-only user segment |
| **B. Disable + track demand** | Keep UI, track attempts, show guidance | Low | Slightly confusing UX |
| **C. Register 10DLC immediately** | Complete Twilio A2P registration | Medium | 3-8 business days, may not be worth it yet |
| **D. Switch to toll-free** | Buy toll-free number, verify | Medium | 2-5 days, higher per-message cost |

---

## Decision

**Option B: Disable SMS sending but keep UI button with demand tracking**

### Rationale

1. **80/20 Principle**: Email invites work and cover most users
2. **Data-driven prioritization**: Track SMS demand to justify A2P registration effort
3. **User communication**: Show clear message guiding users to email alternative
4. **Zero lost signal**: Every phone attempt is logged for follow-up
5. **Easy re-enablement**: Code is commented, not deleted

### Why Not Remove Phone Button Entirely?

Removing the phone option would:
- Lose visibility into demand for phone-based invites
- Make it harder to follow up with users who wanted SMS
- Require UI changes to add it back later

By keeping the button and tracking clicks, we can:
- Measure actual demand (not assumed demand)
- Contact users directly when SMS is enabled
- Prioritize A2P registration based on real data

---

## Implementation

### UI Change (FamilyMembersSection.tsx)

When user selects "Phone" channel:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ SMS invites temporarily unavailable              │
│                                                      │
│  US carriers require business verification for SMS.  │
│  We're working on it!                               │
│                                                      │
│  In the meantime, please use Email to invite        │
│  your co-parent. They can add their phone number    │
│  after joining.                                      │
│                                                      │
│  [Switch to Email]                                   │
└─────────────────────────────────────────────────────┘
```

### Demand Tracking (API + ActivityService)

Phone button click triggers:

```typescript
// POST /api/analytics/feature-demand
{
  feature: "sms_invite",
  context: { contact: "+1234567890" }  // For follow-up
}
```

Stored in `family_activity` table:

```json
{
  "activity_type": "feature_demand",
  "description": "User requested SMS invite (pending A2P 10DLC)",
  "actor_id": "profile-uuid",
  "actor_name": "Mom",
  "meta": {
    "demand_feature": "sms_invite",
    "contact": "+1234567890"
  }
}
```

### Service Change (invite-service.ts)

```typescript
private async sendSmsInvite(invite: PendingInvite, familyName: string): Promise<void> {
  // SMS TEMPORARILY DISABLED - A2P 10DLC registration required
  // Carriers block unregistered 10DLC numbers (error 30034)
  // See: docs/planned/20260123_sms_10dlc_compliance.md
  //
  // To re-enable after A2P approval:
  // 1. Uncomment the code below
  // 2. Remove phone channel disable in FamilyMembersSection.tsx
  // 3. Test with a real phone number
  console.log("[invite] SMS disabled pending A2P 10DLC:", invite.contact);
  return;

  // ... original Twilio code commented out ...
}
```

---

## Querying Demand

### Quick Count

```sql
SELECT COUNT(*) as attempts
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' = 'sms_invite';
```

### Users to Follow Up With

```sql
SELECT
  fa.data->>'actor_name' as name,
  au.email,
  au.phone,
  f.name as family_name,
  fa.created_at as attempted_at
FROM choretracker.family_activity fa
JOIN public.family_profiles fp ON fp.id = (fa.data->>'actor_id')::uuid
JOIN auth.users au ON au.id = fp.user_id
JOIN public.families f ON f.id = fa.family_id
WHERE fa.data->'meta'->>'demand_feature' = 'sms_invite'
ORDER BY fa.created_at DESC;
```

### Full Query File

See: [`sql/queries/sms_invite_demand.sql`](../../sql/queries/sms_invite_demand.sql)

---

## Re-enablement Checklist

When A2P 10DLC registration is approved:

- [ ] Uncomment Twilio code in `lib/services/invite-service.ts`
- [ ] Remove phone channel warning in `islands/settings/FamilyMembersSection.tsx`
- [ ] Test with real phone number
- [ ] Run demand query to get list of users who wanted SMS
- [ ] Send follow-up email: "SMS invites now available!"
- [ ] Monitor first few SMS deliveries in Twilio logs

---

## Trade-offs

### Accepted

| Trade-off | Mitigation |
|-----------|------------|
| Confusing UX (button exists but doesn't work) | Clear warning message with email alternative |
| Extra click for phone users | Demand tracking justifies future A2P investment |
| Code complexity (commented code) | Clear comments with re-enablement instructions |

### Rejected Alternatives

| Alternative | Why Rejected |
|-------------|--------------|
| Remove phone button entirely | Loses demand signal, harder to add back |
| Silent failure (no warning) | Bad UX, users would wonder why invite never arrived |
| Immediate A2P registration | Effort may not be justified if demand is low |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Demand signal captured | 100% of phone attempts logged | Query family_activity |
| User guidance | 0 support tickets about failed SMS | Support inbox |
| Re-enablement trigger | >10 unique users request SMS | Demand query |

---

## Related Documents

- [SMS 10DLC Compliance](../planned/20260123_sms_10dlc_compliance.md) - Full technical details
- [Family Member Invites](../milestones/20260127_family_member_invites.md) - Feature implementation
- [SMS Demand Queries](../../sql/queries/sms_invite_demand.sql) - SQL for follow-up

---

## Commits

- `0e7cbbf` - 📱 Disable SMS invites pending A2P 10DLC + add demand tracking
- `c020848` - 📊 Add SMS demand tracking queries with follow-up contacts

---

**Decision Made By**: Development Team
**Implementation**: January 27-28, 2026
