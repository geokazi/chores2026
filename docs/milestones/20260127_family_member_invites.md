# Family Member Invites (Co-Parent & Caregiver)

**Date**: January 27, 2026
**Status**: 📋 Planned
**Effort**: ~200 lines new code
**Principle**: 80/20 Pareto - dual-channel invites with minimal complexity

## Problem Statement

### Current State
- Only account creator can be a parent
- No way to add spouse/co-parent with their own login
- Kids are profiles (good) but adults need full accounts

### Cozi Comparison (What We're Improving)
| Cozi Pain Point | ChoreGami Solution |
|-----------------|-------------------|
| Shared password for everyone | Each parent has own login |
| Manual password distribution | Magic link sent automatically |
| Change password = lock everyone out | Individual account management |
| Everyone needs email for app | Phone-only option for adults |
| 12 person limit | Unlimited parents, 8 kids |

## Solution: Dual-Channel Invites via JSONB

### Design Principles Applied
- **No new database tables** - Uses existing `families.settings` JSONB
- **Reuses existing infrastructure** - Resend (email) + Twilio (SMS) already working
- **~200 lines total** - Well under 500-line module limit
- **Consistent architecture** - Follows JSONB settings pattern

### Invite Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  INVITE FLOW (EMAIL OR PHONE)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Parent taps "Invite Adult" in Settings                      │
│  2. Chooses channel: [Email] or [Phone]                         │
│  3. Enters email or phone number                                │
│                                                                 │
│  4. API generates secure token, stores in JSONB:                │
│     settings.apps.choregami.pending_invites[]                   │
│                                                                 │
│  5a. EMAIL: Resend sends invite with link                       │
│      "Join [Family Name] on ChoreGami: https://...?token=xxx"   │
│                                                                 │
│  5b. PHONE: Twilio sends SMS with link                          │
│      "[Inviter] invited you to ChoreGami: https://cho.re/j/xxx" │
│                                                                 │
│  6. Recipient clicks link → /join?token=xxx                     │
│  7. Token validated → show login/signup options                 │
│  8. After auth → auto-join family as parent                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Structure

### JSONB Storage (No New Tables)

```jsonc
// families.settings.apps.choregami
{
  // ... existing settings ...
  "pending_invites": [
    {
      "token": "abc123def456ghi789...",  // 40-char secure random
      "channel": "email",                 // "email" | "phone"
      "contact": "spouse@example.com",    // email or phone number
      "role": "parent",
      "name": "Alex",                     // optional display name
      "invited_by": "profile-uuid",
      "invited_at": "2026-01-27T10:00:00Z",
      "expires_at": "2026-02-03T10:00:00Z"  // 7 days
    }
  ]
}
```

### Why Self-Managed vs Supabase Built-in?

| Aspect | Supabase Built-in | Self-Managed (Chosen) |
|--------|------------------|----------------------|
| Email support | Yes | Yes |
| Phone support | No | **Yes** |
| Custom templates | Limited | Full control |
| Family context in flow | Hard to pass | Easy |
| Consistent architecture | Different pattern | JSONB like everything else |
| Code complexity | 1 line | ~100 lines |

**Decision**: Self-managed because phone support is required and we already have Resend + Twilio working.

## Implementation

### File Structure (~200 lines total)

| File | Purpose | Lines |
|------|---------|-------|
| `lib/services/invite-service.ts` | Token gen, validation, JSONB ops | ~100 |
| `routes/api/family/invite.ts` | Create invite API | ~50 |
| `routes/join.tsx` | Accept invite page | ~30 |
| `islands/FamilySettings.tsx` | UI additions (button + modal) | ~20 |

### SQL Functions (for JSONB array operations)

```sql
-- Append invite to pending_invites array
CREATE OR REPLACE FUNCTION append_pending_invite(p_family_id uuid, p_invite jsonb)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'),
        '{apps}',
        COALESCE(settings->'apps', '{}')
      ),
      '{apps,choregami}',
      COALESCE(settings->'apps'->'choregami', '{}')
    ),
    '{apps,choregami,pending_invites}',
    COALESCE(settings->'apps'->'choregami'->'pending_invites', '[]') || p_invite
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;

-- Remove invite by token
CREATE OR REPLACE FUNCTION remove_pending_invite(p_family_id uuid, p_token text)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    settings,
    '{apps,choregami,pending_invites}',
    (
      SELECT COALESCE(jsonb_agg(invite), '[]')
      FROM jsonb_array_elements(settings->'apps'->'choregami'->'pending_invites') AS invite
      WHERE invite->>'token' != p_token
    )
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;
```

### InviteService (~100 lines)

```typescript
// lib/services/invite-service.ts
export interface PendingInvite {
  token: string;
  channel: "email" | "phone";
  contact: string;
  role: "parent";
  name?: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
}

export class InviteService {
  // Generate 40-char secure token
  generateToken(): string {
    return crypto.randomUUID().replace(/-/g, "") +
           crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }

  // Create invite and store in JSONB
  async createInvite(
    familyId: string,
    channel: "email" | "phone",
    contact: string,
    invitedBy: string,
    name?: string
  ): Promise<PendingInvite> { /* ... */ }

  // Find invite by token (searches all families)
  async findByToken(token: string): Promise<{
    invite: PendingInvite;
    familyId: string;
    familyName: string;
  } | null> { /* ... */ }

  // Accept invite: remove from pending, create profile
  async acceptInvite(token: string, userId: string): Promise<boolean> { /* ... */ }

  // Send invite via appropriate channel
  async sendInvite(invite: PendingInvite, familyName: string): Promise<void> {
    if (invite.channel === "email") {
      await this.sendEmailInvite(invite, familyName);
    } else {
      await this.sendSmsInvite(invite, familyName);
    }
  }
}
```

### Message Templates

**Email (via Resend):**
```
Subject: Join [Family Name] on ChoreGami

Hi!

[Inviter Name] invited you to join their family on ChoreGami.

Click here to join: https://choregami.app/join?token=xxx

This link expires in 7 days.

— The ChoreGami Team
```

**SMS (via Twilio):**
```
[Inviter] invited you to ChoreGami! Join [Family]: https://choregami.app/j/xxx
```

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token guessing | 40-char cryptographic random token |
| Expired invites | 7-day expiry checked on validation |
| Revoked invites | Status check before accepting |
| Wrong family | Token tied to specific family_id |
| Rate limiting | Max 5 pending invites per family |
| Spam prevention | Only authenticated parents can invite |

## UI Changes

### Settings > Family Members Section

```
👨‍👩‍👧‍👦 Family Members (3 kids, 1 parent)
├── Mom (you)        0 points
├── Ciku           107 points  [✏️][🗑️]
├── Julia           43 points  [✏️][🗑️]
└── Tonie!          37 points  [✏️][🗑️]

[+ Add Kid]  [+ Invite Adult]
                    ↑ NEW
```

### Invite Modal

```
┌─────────────────────────────────────┐
│  Invite Adult to Family             │
├─────────────────────────────────────┤
│                                     │
│  How should we reach them?          │
│                                     │
│  [📧 Email]    [📱 Phone]           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ spouse@example.com          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Name (optional):                   │
│  ┌─────────────────────────────┐   │
│  │ Alex                        │   │
│  └─────────────────────────────┘   │
│                                     │
│        [Cancel]  [Send Invite]      │
└─────────────────────────────────────┘
```

## What We're NOT Building (Simplicity)

- ❌ Invite management UI (view pending, resend, revoke) - Phase 2
- ❌ Multiple invite roles (caregiver, teen) - Phase 2
- ❌ Invite expiry notifications - Phase 2
- ❌ Bulk invites - Not needed

## Testing Checklist

- [ ] Email invite sends successfully via Resend
- [ ] SMS invite sends successfully via Twilio
- [ ] Token validates correctly
- [ ] Expired tokens rejected
- [ ] New user joins correct family
- [ ] Existing user joins correct family
- [ ] Parent profile created with correct role
- [ ] Invite removed from JSONB after acceptance
- [ ] Max 5 pending invites enforced

## Success Criteria

1. **Co-parent can join family** with their own independent login
2. **Zero password sharing** required
3. **Works for both email and phone** users
4. **< 200 lines** of new code
5. **No new database tables**

## Related Documents

- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Storage pattern
- [Architecture](../architecture.md) - Auth flow reference
- [Testing Notifications](../testing-notifications.md) - Resend/Twilio setup
- [Business Requirements](../business-requirements.md) - Epic 6: Family Management

---

**Implementation Status**: 📋 Planned
**Estimated Effort**: ~200 lines new code
**Dependencies**: Resend (email), Twilio (SMS) - both already configured

*Document created by: Claude Code AI Assistant*
