# Family Member Invites (Co-Parent & Caregiver)

**Date**: January 27, 2026
**Status**: ✅ Complete (SMS temporarily disabled pending A2P 10DLC)
**Effort**: ~850 lines total (all modules under 500-line limit)
**Principle**: 80/20 Pareto - dual-channel invites with minimal complexity

> **Note (Jan 27, 2026)**: SMS invites temporarily disabled due to US carrier A2P 10DLC requirements.
> Email invites work fully. See [SMS 10DLC Compliance](../planned/20260123_sms_10dlc_compliance.md) for details.
> Feature demand is being tracked via `family_activity` to prioritize A2P registration.

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

## Database Relationships

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE RELATIONSHIPS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐         ┌──────────────────┐                          │
│  │   auth.users     │         │  public.families │                          │
│  │  (Supabase Auth) │         │                  │                          │
│  ├──────────────────┤         ├──────────────────┤                          │
│  │ id (uuid) PK     │         │ id (uuid) PK     │                          │
│  │ email            │         │ name             │                          │
│  │ phone            │         │ settings (JSONB) │◄─── pending_invites[]    │
│  │ created_at       │         │ created_at       │                          │
│  └────────┬─────────┘         └────────┬─────────┘                          │
│           │                            │                                     │
│           │ 1:N                        │ 1:N                                 │
│           │                            │                                     │
│           ▼                            ▼                                     │
│  ┌─────────────────────────────────────────────────┐                        │
│  │            public.family_profiles               │                        │
│  ├─────────────────────────────────────────────────┤                        │
│  │ id (uuid) PK                                    │                        │
│  │ family_id (uuid) FK ────────────────────────────┼──► families.id         │
│  │ user_id (uuid) FK (nullable) ───────────────────┼──► auth.users.id       │
│  │ name (text)                                     │                        │
│  │ role (text) ─────── 'parent' | 'child'          │                        │
│  │ current_points (int)                            │                        │
│  │ pin_hash (text)                                 │                        │
│  └─────────────────────────────────────────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

| Column | Description | Value |
|--------|-------------|-------|
| `family_profiles.user_id` | Links to auth account | UUID for adults, NULL for kids |
| `family_profiles.family_id` | Links to family | Always set |
| `family_profiles.role` | Access level | `parent` = full access, `child` = limited |

### Profile Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROFILE TYPES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PARENT PROFILE (with auth account)          KID PROFILE (no auth account)  │
│  ┌─────────────────────────────┐             ┌─────────────────────────────┐│
│  │ id: "prof-123"              │             │ id: "prof-456"              ││
│  │ family_id: "fam-abc"        │             │ family_id: "fam-abc"        ││
│  │ user_id: "user-789" ────────┼──► auth    │ user_id: NULL ──────────────┼┼► No auth
│  │ name: "Mom"                 │             │ name: "Ciku"                ││
│  │ role: "parent"              │             │ role: "child"               ││
│  │ current_points: 0           │             │ current_points: 107         ││
│  └─────────────────────────────┘             └─────────────────────────────┘│
│                                                                              │
│  • Has their own login                       • Selected from kid picker     │
│  • Can manage family settings                • Optional 4-digit PIN         │
│  • Can invite other adults                   • Cannot invite others         │
│  • Can adjust points                         • Can complete chores          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Invite Acceptance Flow (Database Perspective)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INVITE ACCEPTANCE - DATABASE CHANGES                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BEFORE: Invite stored in families.settings JSONB                           │
│  ─────────────────────────────────────────────────                          │
│  families.settings.apps.choregami.pending_invites = [                       │
│    {                                                                         │
│      "token": "abc123...",                                                   │
│      "channel": "email",                                                     │
│      "contact": "spouse@example.com",                                        │
│      "role": "parent",                                                       │
│      "name": "Alex",                                                         │
│      "invited_by": "prof-123",                                               │
│      "expires_at": "2026-02-03T..."                                          │
│    }                                                                         │
│  ]                                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STEP 1: User clicks invite link → authenticates (creates auth.users row)   │
│                                                                              │
│  auth.users:                                                                 │
│  ┌────────────────────────────────────────────────┐                         │
│  │ id: "user-new-789"                             │ ◄── NEW ROW              │
│  │ email: "spouse@example.com"                    │                         │
│  │ created_at: "2026-01-28T..."                   │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STEP 2: acceptInvite() creates family_profiles row linking user to family  │
│                                                                              │
│  family_profiles:                                                            │
│  ┌────────────────────────────────────────────────┐                         │
│  │ id: "prof-new-456"                             │ ◄── NEW ROW              │
│  │ family_id: "fam-abc" ─────────────────────────►│ Links to invited family │
│  │ user_id: "user-new-789" ──────────────────────►│ Links to their auth     │
│  │ name: "Alex"                                   │                         │
│  │ role: "parent"                                 │ ◄── Currently hardcoded │
│  │ current_points: 0                              │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STEP 3: remove_pending_invite() clears invite from JSONB                   │
│                                                                              │
│  families.settings.apps.choregami.pending_invites = []  ◄── Invite removed  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
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

### File Structure (~850 lines total)

| File | Purpose | Lines |
|------|---------|-------|
| `lib/services/invite-service.ts` | Token gen, validation, JSONB ops, email/SMS sending | ~306 |
| `routes/api/family/invite.ts` | Create and send invite API | ~92 |
| `routes/join.tsx` | Accept invite page with login flow | ~219 |
| `islands/settings/FamilyMembersSection.tsx` | UI additions (button + modal) | ~150 added |
| `sql/20260127_invite_functions.sql` | JSONB SQL functions | ~79 |

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

-- Find invite by token - O(1) database operation
-- Searches all families' JSONB arrays in single query (avoids O(n×m) JS iteration)
CREATE OR REPLACE FUNCTION find_invite_by_token(p_token text)
RETURNS TABLE(family_id uuid, family_name text, invite jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, inv
  FROM families f,
       jsonb_array_elements(
         COALESCE(f.settings->'apps'->'choregami'->'pending_invites', '[]')
       ) AS inv
  WHERE inv->>'token' = p_token
    AND (inv->>'expires_at')::timestamptz > NOW()
  LIMIT 1;
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

  // Find invite by token - O(1) via SQL function
  async findByToken(token: string): Promise<{
    invite: PendingInvite;
    familyId: string;
    familyName: string;
  } | null> { /* uses find_invite_by_token RPC */ }

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

- [x] Email invite sends successfully via Resend
- [ ] SMS invite sends successfully via Twilio (blocked - pending A2P 10DLC)
- [x] Token validates correctly
- [x] Expired tokens rejected
- [x] New user joins correct family
- [x] Existing user joins correct family
- [x] Parent profile created with correct role
- [x] Invite removed from JSONB after acceptance
- [x] Max 5 pending invites enforced
- [x] SMS demand tracking via family_activity
- [x] OAuth login preserves invite token (localStorage bridge)
- [x] Phone login respects redirect parameter (P1)
- [x] Token paste recovery on error page (P2)
- [x] "Joining [Family]" context banner on login page (P3)
- [x] Context banner persists across auth mode switches
- [x] Direct login flow - skip intermediate /join page (P4/Option A)

## Success Criteria

1. ✅ **Co-parent can join family** with their own independent login
2. ✅ **Zero password sharing** required
3. ⚠️ **Email works, SMS pending** - A2P 10DLC registration required
4. ✅ **All modules under 500 lines** (~850 total across 5 files)
5. ✅ **No new database tables** (JSONB storage only)
6. ✅ **O(1) token lookup** via SQL function
7. ✅ **SMS demand tracking** - users clicking Phone logged to family_activity

## SMS Demand Tracking

When users click the Phone button (temporarily unavailable), we track this to measure demand.

**Full queries**: [`sql/queries/sms_invite_demand.sql`](../../sql/queries/sms_invite_demand.sql)

```sql
-- Quick count
SELECT COUNT(*) as attempts
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' = 'sms_invite';

-- Users to follow up with (includes email/phone)
SELECT fa.data->>'actor_name' as name, au.email, au.phone, fa.created_at
FROM choretracker.family_activity fa
JOIN public.family_profiles fp ON fp.id = (fa.data->>'actor_id')::uuid
JOIN auth.users au ON au.id = fp.user_id
WHERE fa.data->'meta'->>'demand_feature' = 'sms_invite'
ORDER BY fa.created_at DESC;
```

This data helps prioritize A2P 10DLC registration effort.

## Related Documents

- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Storage pattern
- [Architecture](../architecture.md) - Auth flow reference
- [Testing Notifications](../testing-notifications.md) - Resend/Twilio setup
- [Business Requirements](../business-requirements.md) - Epic 6: Family Management
- [OAuth Token Preservation Decision](../decisions/20260128_oauth_invite_token_preservation.md) - localStorage bridge fix
- [SMS Invite Demand Tracking Decision](../decisions/20260128_sms_invite_demand_tracking.md) - Why phone button stays with demand capture

---

## Phase 2: Adult Child Invites (Assessment)

### Problem Statement

Current implementation hardcodes `role: "parent"` when accepting invites:

```typescript
// lib/services/invite-service.ts - acceptInvite()
const { error: profileError } = await this.supabase
  .from("family_profiles")
  .insert({
    family_id: familyId,
    user_id: userId,
    name: invite.name || "Parent",
    role: "parent",  // ← Always parent
    current_points: 0,
  });
```

This creates a problem for:
- **Adult children** (teens 13+) who have their own email/phone/social accounts
- **Teen accountability**: Parents want teen to have their OWN login (not shared family password)
- **But NOT parent access**: Teen shouldn't manage family settings or adjust points

### Use Cases

| User Type | Has Auth Account | Role | Can Invite | Can Adjust Points | Can Manage Settings |
|-----------|-----------------|------|------------|-------------------|---------------------|
| Parent | ✅ Yes | `parent` | ✅ | ✅ | ✅ |
| Co-parent | ✅ Yes | `parent` | ✅ | ✅ | ✅ |
| Young child | ❌ No | `child` | ❌ | ❌ | ❌ |
| **Teen (13+)** | ✅ Yes | `child` | ❌ | ❌ | ❌ |
| Caregiver | ✅ Yes | `caregiver`? | ❌ | ⚠️ Limited? | ❌ |

### Proposed Solution: Role Selection in Invite

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENHANCED INVITE MODAL (Phase 2)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Invite Adult to Family                                                     │
│   ─────────────────────                                                      │
│                                                                              │
│   How should we reach them?                                                  │
│   [📧 Email]    [📱 Phone]                                                   │
│                                                                              │
│   ┌─────────────────────────────────────────────┐                           │
│   │ spouse@example.com                          │                           │
│   └─────────────────────────────────────────────┘                           │
│                                                                              │
│   Name (optional):                                                           │
│   ┌─────────────────────────────────────────────┐                           │
│   │ Alex                                        │                           │
│   └─────────────────────────────────────────────┘                           │
│                                                                              │
│   Role:                                          ◄── NEW FIELD               │
│   (●) Co-parent - Full family management                                     │
│   ( ) Teen - Own login, chore completion only                               │
│   ( ) Caregiver - View-only, no management                                   │
│                                                                              │
│              [Cancel]  [Send Invite]                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Approach

**Minimal Changes (80/20 Principle)**:

1. **Add `role` field to PendingInvite interface** (~2 lines)
   ```typescript
   interface PendingInvite {
     // ... existing fields ...
     role: "parent" | "child";  // Was always "parent"
   }
   ```

2. **Update UI to show role selector** (~15 lines)
   - Default to "Co-parent" (current behavior)
   - Add "Teen" option that sets `role: "child"`

3. **Pass role through to acceptInvite** (~3 lines)
   ```typescript
   // Instead of hardcoding "parent"
   role: invite.role,  // Use role from invite
   ```

4. **Total: ~20 lines changed**

### Role Permissions Matrix

| Permission | `parent` | `child` (teen with auth) | `child` (young, no auth) |
|------------|----------|-------------------------|-------------------------|
| Own login | ✅ | ✅ | ❌ |
| Complete chores | ✅ | ✅ | ✅ |
| View leaderboard | ✅ | ✅ | ✅ |
| Invite others | ✅ | ❌ | ❌ |
| Adjust points | ✅ | ❌ | ❌ |
| Manage family settings | ✅ | ❌ | ❌ |
| Delete chores | ✅ | ❌ | ❌ |

### Database Impact

**No schema changes needed.** The `role` column already supports any string:
- Current: `parent` | `child`
- The key insight: a `child` role CAN have a `user_id` (auth account)

```
family_profiles:
┌────────────────────────────────────────────────────────────────────┐
│ Teen with own login:                                               │
│ ┌─────────────────────────────┐                                    │
│ │ id: "prof-teen-789"         │                                    │
│ │ family_id: "fam-abc"        │                                    │
│ │ user_id: "user-teen-123" ───┼──► HAS auth account (can log in)  │
│ │ name: "Ciku"                │                                    │
│ │ role: "child" ──────────────┼──► But limited permissions         │
│ │ current_points: 107         │                                    │
│ └─────────────────────────────┘                                    │
└────────────────────────────────────────────────────────────────────┘
```

### UX Considerations

1. **Clear labeling**: "Co-parent" vs "Teen" vs "Caregiver" (not technical "parent/child")
2. **Default safe**: Default to Co-parent to preserve current behavior
3. **Explanation text**: Brief description of what each role can/can't do
4. **Post-invite visibility**: Show invited role in pending invites list

### Decision: Defer to Phase 2

**Recommendation**: Implement when there's demand signal.

**Why defer**:
- Current use case (invite spouse/co-parent) works today
- Teen invite is a valid need but less common than co-parent
- ~20 lines to implement when needed
- Can track demand similar to SMS tracking

**When to implement**:
- User feedback requesting teen invites
- Support tickets about "invite my teenager"
- Feature request in family_activity demand tracking

---

**Implementation Status**: ✅ Complete
**Actual Effort**: ~850 lines new code (all modules under 500-line limit)
**Dependencies**: Resend (email), Twilio (SMS) - both already configured
**Optimizations**: O(1) token lookup via SQL function (avoids O(n×m) JS iteration)

*Document created by: Claude Code AI Assistant*
