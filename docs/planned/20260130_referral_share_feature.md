# Referral "Share ChoreGami" Feature

**Date**: January 30, 2026 (Planned) → January 31, 2026 (Implemented)
**Status**: ✅ Complete
**Priority**: Growth / Marketing
**Actual Effort**: ~590 lines across 11 files (incl. tests + terms enforcement)

---

## Overview

Enable users to share ChoreGami with friends and earn free months when referrals sign up. Targets two audiences:
- **Parents**: Share with other parents
- **High schoolers (teens with accounts)**: Share with friends

### Business Goal

Track referrer → referred relationship for future reward credit (e.g., 1 free month per signup).

---

## Principles Applied

| Principle | How Applied |
|-----------|-------------|
| **Pareto 80/20** | Dedicated `/share` route + profile menu link - frictionless for all family members |
| **Reuse existing** | Copy `InviteService` pattern, reuse SQL function patterns from `20260127_invite_functions.sql` |
| **O(1) database** | GIN index + JSONB containment query for code lookup |
| **No code bloat** | Dedicated `/share` route (no PIN required) - cleaner UX separation |
| **JSONB flexibility** | Add fields without migration, matches `pending_invites` pattern |
| **Complete schema** | All reward tracking fields included upfront (no technical debt) |

---

## Data Structure

### Storage Location

```
families.settings.apps.choregami.referral
```

### Schema

```jsonc
{
  "code": "ABC123",                    // 6-char alphanumeric, unique
  "created_at": "2026-01-30T12:00:00Z",
  "conversions": [
    {
      "family_id": "uuid",
      "family_name": "Smith Family",
      "user_id": "uuid",
      "converted_at": "2026-02-01T..."
    }
  ],
  "reward_months_earned": 1,           // Increment on each conversion
  "reward_months_redeemed": 0,         // Track what's been applied to billing
  "last_conversion_at": "2026-02-01T..." // For activity queries
}
```

### Why JSONB (Not Separate Table)

| Factor | JSONB | Separate Table |
|--------|-------|----------------|
| Consistency | ✅ Matches `pending_invites` pattern | ❌ New pattern |
| Schema flexibility | ✅ Add fields without migration | ❌ Requires ALTER |
| O(1) lookup | ✅ GIN index + containment | ✅ Primary key |
| Referential integrity | ❌ No FK constraints | ✅ FK to auth.users |
| Query complexity | Medium (containment syntax) | Simple (WHERE =) |

**Decision**: JSONB wins on consistency and flexibility. O(1) achieved via GIN index.

---

## SQL Functions

**File**: `sql/20260131_referral_functions.sql`

### 1. Initialize Referral (with COALESCE pattern from invite functions)

```sql
CREATE OR REPLACE FUNCTION init_family_referral(p_family_id uuid, p_code text)
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
    '{apps,choregami,referral}',
    jsonb_build_object(
      'code', p_code,
      'created_at', NOW(),
      'conversions', '[]'::jsonb,
      'reward_months_earned', 0,
      'reward_months_redeemed', 0,
      'last_conversion_at', NULL
    )
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;
```

### 2. Find Family by Referral Code (O(1) with GIN)

```sql
-- Requires GIN index on families.settings
CREATE INDEX IF NOT EXISTS idx_families_settings_gin
ON families USING GIN (settings);

CREATE OR REPLACE FUNCTION find_family_by_referral_code(p_code text)
RETURNS TABLE(family_id uuid, family_name text, referral jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.settings->'apps'->'choregami'->'referral'
  FROM families f
  WHERE f.settings @> jsonb_build_object(
    'apps', jsonb_build_object(
      'choregami', jsonb_build_object(
        'referral', jsonb_build_object('code', p_code)
      )
    )
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Record Conversion

```sql
CREATE OR REPLACE FUNCTION record_referral_conversion(
  p_referrer_family_id uuid,
  p_new_family_id uuid,
  p_new_family_name text,
  p_new_user_id uuid
)
RETURNS void AS $$
DECLARE
  current_referral jsonb;
  new_conversion jsonb;
BEGIN
  -- Get current referral data
  SELECT settings->'apps'->'choregami'->'referral'
  INTO current_referral
  FROM families
  WHERE id = p_referrer_family_id;

  -- Build new conversion entry
  new_conversion := jsonb_build_object(
    'family_id', p_new_family_id,
    'family_name', p_new_family_name,
    'user_id', p_new_user_id,
    'converted_at', NOW()
  );

  -- Update referral with new conversion
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        settings,
        '{apps,choregami,referral,conversions}',
        COALESCE(current_referral->'conversions', '[]'::jsonb) || new_conversion
      ),
      '{apps,choregami,referral,reward_months_earned}',
      to_jsonb(COALESCE((current_referral->>'reward_months_earned')::int, 0) + 1)
    ),
    '{apps,choregami,referral,last_conversion_at}',
    to_jsonb(NOW())
  )
  WHERE id = p_referrer_family_id;
END;
$$ LANGUAGE plpgsql;
```

---

## UI Design

### Adaptive Personalization (Jan 31, 2026)

The share card automatically adapts based on family activity:

| Condition | Version | Share Message |
|-----------|---------|---------------|
| < 5 chores this week | **Simple** | Generic message about ChoreGami |
| ≥ 5 chores this week | **Personalized** | Stats-based social proof message |

**Why auto-detect:**
- Active families have social proof to share → use it
- New/inactive families see low numbers → hide them (embarrassing)
- Zero extra clicks for user
- Enables A/B comparison via analytics tracking

### Simple Version (< 5 chores/week)

```
├─────────────────────────────────────────────────────┤
│  Share ChoreGami                                    │
│                                                     │
│  Tell a friend. Get 1 free month when they join.   │
│                                                     │
│  YOUR REFERRAL LINK                                 │
│  choregami.fly.dev/r/ABC123                         │
│                                                     │
│  [📋 Copy]              [📤 Share]                  │
│                                                     │
│  Earn up to 6 free months                           │
└─────────────────────────────────────────────────────┘
```

### Personalized Version (≥ 5 chores/week)

```
├─────────────────────────────────────────────────────┤
│  Share ChoreGami                                    │
│                                                     │
│  Tell a friend. Get 1 free month when they join.   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🎉 23 chores this week • 🔥 5-day streak     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  YOUR REFERRAL LINK                                 │
│  choregami.fly.dev/r/ABC123                         │
│                                                     │
│  [📋 Copy]              [📤 Share]                  │
│                                                     │
│  Earn up to 6 free months                           │
└─────────────────────────────────────────────────────┘
```

**Personalized share message:**
```
My family completed 23 chores this week with a 5-day streak! ChoreGami actually works.
```

### Analytics Tracking

Tracks which version leads to more shares:
- `referral_card_view_simple` / `referral_card_view_personalized`
- `referral_copy_simple` / `referral_copy_personalized`
- `referral_share_simple` / `referral_share_personalized`
- `referral_share_complete_simple` / `referral_share_complete_personalized`

### Zero-State (No Conversions)

```
│  Earn up to 6 free months                           │
```

### Profile Menu Link (Secondary)

```
┌──────────────────────┐
│  👤 Mom              │
├──────────────────────┤
│  ⚙️  Settings        │
│  🎁 Share ChoreGami  │  ← scrolls to card in settings
│  ─────────────────── │
│  🚪 Log Out          │
└──────────────────────┘
```

### UX Copy Decisions

| Element | Copy | Reasoning |
|---------|------|-----------|
| Label | "Your referral link" | Ownership language, removes hesitation |
| Tagline | "Tell a friend. Get 1 free month when they join." | Clear value prop |
| Personalized share | "My family completed X chores this week!" | Social proof with real stats |
| Generic share | "ChoreGami helps families stay organized..." | Safe default for new users |

### Weekly Stats Data Flow

```typescript
// routes/share.tsx handler
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const { data: transactions } = await supabase
  .schema("choretracker")
  .from("chore_transactions")
  .select("created_at")
  .eq("family_id", family.id)
  .eq("transaction_type", "chore_completed")
  .gte("created_at", oneWeekAgo);

// Reuse calculateStreak from insights-service.ts
const streakDays = calculateStreak(transactions.map(t => t.created_at));

// Pass to component
weeklyStats: { choresCompleted: transactions.length, streakDays }
```

---

## Module Structure

```
lib/services/
  referral-service.ts      # ~80 lines - code gen, lookup, conversion
  insights-service.ts      # calculateStreak() reused for share stats

islands/
  ShareReferralCard.tsx    # ~210 lines - adaptive share component with stats

routes/
  share.tsx                # ~240 lines - dedicated share page with weekly stats query
  r/[code].tsx             # ~25 lines - short URL redirect

sql/
  20260131_referral_functions.sql  # ~60 lines - 3 functions + index
```

---

## Service Layer

**File**: `lib/services/referral-service.ts`

```typescript
export interface Referral {
  code: string;
  created_at: string;
  conversions: ReferralConversion[];
  reward_months_earned: number;
  reward_months_redeemed: number;
  last_conversion_at: string | null;
}

export interface ReferralConversion {
  family_id: string;
  family_name: string;
  user_id: string;
  converted_at: string;
}

export class ReferralService {
  private supabase: SupabaseClient;

  constructor() { /* same pattern as InviteService */ }

  /** Generate 6-char alphanumeric code */
  generateCode(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  }

  /** Get or create referral for family (idempotent) */
  async getOrCreateReferral(familyId: string): Promise<Referral>

  /** O(1) lookup by code via GIN index */
  async findByCode(code: string): Promise<{
    familyId: string;
    familyName: string;
    referral: Referral;
  } | null>

  /** Record conversion (called during signup) */
  async recordConversion(
    referrerFamilyId: string,
    newFamilyId: string,
    newFamilyName: string,
    newUserId: string
  ): Promise<void>

  /** Get stats for display */
  async getStats(familyId: string): Promise<{
    code: string;
    conversions: number;
    monthsEarned: number;
    monthsRedeemed: number;
  }>
}
```

---

## Integration Points

### 1. Short URL Route (`/r/[code]`)

```typescript
// routes/r/[code].tsx
export const handler: Handlers = {
  async GET(req, ctx) {
    const code = ctx.params.code;
    return new Response(null, {
      status: 302,
      headers: { Location: `/register?ref=${code}` }
    });
  }
};
```

### 2. Registration Integration

In `/register` POST handler after successful family creation:

```typescript
const ref = url.searchParams.get("ref");
if (ref) {
  const referralService = new ReferralService();
  const referrer = await referralService.findByCode(ref);
  if (referrer && referrer.familyId !== newFamilyId) {  // Prevent self-referral
    await referralService.recordConversion(
      referrer.familyId,
      newFamilyId,
      familyName,
      userId
    );
  }
}
```

### 3. Dedicated Share Page

**Route**: `/share` (accessible to all logged-in family members - no PIN required)

**File**: `routes/share.tsx`

```typescript
// Features:
// - Playful hero section with bouncing gift emoji
// - Dynamic encouragement messages based on referral progress
// - ShareReferralCard component for copy/share actions
// - Sharing tips for word-of-mouth growth

// In handler: get or create referral
const referralService = new ReferralService();
const stats = await referralService.getStats(familyId);

// Encouragement based on progress
const encouragement = conversions === 0
  ? "Know someone who'd love this?"
  : conversions < 6
  ? `${6 - monthsEarned} more to max out your free months!`
  : "You're a ChoreGami champion! 🏆";
```

**Why separate route (not in settings)?**
- Settings requires parent PIN when enabled - unnecessary friction for sharing
- Sharing is a growth action, not a configuration action
- All family members (including teens) should be able to share
- Cleaner separation of concerns

---

## Line Count Summary

| File | Lines | Notes |
|------|-------|-------|
| `referral-service.ts` | ~80 | Service layer |
| `ShareReferralCard.tsx` | ~210 | Island component with analytics |
| `share.tsx` | ~230 | Dedicated share page (no PIN) |
| `r/[code].tsx` | ~25 | Redirect route |
| `20260131_referral_functions.sql` | ~60 | SQL functions |
| Profile menu link | ~5 | One link in AppHeader |
| Register integration | ~15 | Conversion tracking |
| **Total** | **~625** | Growth feature investment ✅ |

---

## Referral Terms

### User-Facing Copy

```
ⓘ Free months apply to future billing (up to 6).
```

### Full Terms (for /terms or Help section)

```
Referral Program Terms:
• Earn 1 free month for each friend who joins using your link and completes account setup.
• You may earn up to 6 free months through referrals.
• Free months apply to future billing; no cash value.
• Self-referrals or abuse may revoke credits.
```

### Enforcement Rules

| Rule | Implementation |
|------|----------------|
| **6-month cap** | Service layer + SQL function both enforce `reward_months_earned < 6` |
| **Activation requirement** | Credit on family creation (not just signup) |
| **No self-referral** | Check `referrer.familyId !== newFamilyId` |
| **No duplicates** | Check conversions array for existing `family_id` |

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Code enumeration | 6-char alphanumeric = 2.1B combinations, rate limit `/r/[code]` |
| Self-referral | Check `referrer.familyId !== newFamilyId` before crediting |
| Duplicate conversion | Check if `newFamilyId` already in conversions array |
| Code guessing for rewards | Conversion only credited after verified signup + family creation |
| Referral spam | One code per family (idempotent creation) |
| Reward abuse | 6-month cap enforced at service + DB level |

---

## Future Extensibility

| Future Need | Current Design Support |
|-------------|------------------------|
| Reward redemption | `reward_months_redeemed` field ready |
| Referral dashboard page | `ShareReferralCard` is reusable, add route |
| Post-celebration prompt | Import same component, show conditionally |
| Referral tiers (5 = bonus) | Query `conversions.length` from JSONB |
| Analytics | `last_conversion_at` enables time-based queries |
| Expire old codes | Add `expires_at` field to JSONB (no migration) |
| Email on conversion | Add to `recordConversion` method |

---

## What This Plan Does NOT Include

| Excluded | Why |
|----------|-----|
| Separate referral page | 80/20 - card is sufficient initially |
| Post-celebration prompt | Complexity (show logic, dismissal state) - Phase 2 |
| Email notification on conversion | Not MVP, add later |
| Automatic reward application | Billing integration TBD, just track for now |
| Admin dashboard | Query JSONB directly if needed |

---

## Unit Tests

### Test File Structure

```
tests/
├── services/
│   └── referral-service.test.ts    # ~80 lines, 12 tests
├── routes/
│   └── r-code.test.ts              # ~25 lines, 3 tests
└── integration/
    └── referral-registration.test.ts  # ~40 lines, 4 tests
```

### 1. ReferralService (`tests/services/referral-service.test.ts`)

```typescript
// Code Generation
- [ ] generateCode() returns 6-character string
- [ ] generateCode() returns uppercase alphanumeric only
- [ ] generateCode() returns unique codes (no collisions in 1000 iterations)

// Get or Create (idempotent)
- [ ] getOrCreateReferral() creates new referral for family without one
- [ ] getOrCreateReferral() returns existing referral for family with one
- [ ] getOrCreateReferral() initializes all required fields (code, created_at, conversions[], reward_months_earned, reward_months_redeemed)

// Lookup
- [ ] findByCode() returns family data for valid code
- [ ] findByCode() returns null for invalid code
- [ ] findByCode() returns null for empty string

// Conversion Recording
- [ ] recordConversion() increments reward_months_earned
- [ ] recordConversion() appends to conversions array
- [ ] recordConversion() updates last_conversion_at
- [ ] recordConversion() blocks self-referral (referrer === new family)
- [ ] recordConversion() blocks duplicate conversion (family already in conversions)
```

### 2. Short URL Route (`tests/routes/r-code.test.ts`)

```typescript
- [ ] GET /r/ABC123 redirects to /register?ref=ABC123
- [ ] GET /r/ABC123 returns 302 status
- [ ] GET /r/invalid still redirects (validation happens at registration)
```

### 3. Registration Integration (`tests/integration/referral-registration.test.ts`)

```typescript
- [ ] Registration with valid ref param calls recordConversion()
- [ ] Registration with invalid ref param silently ignores (no error)
- [ ] Registration without ref param skips referral logic
- [ ] Self-referral attempt is blocked
```

### Line Count Summary

| File | Tests | Lines |
|------|-------|-------|
| `referral-service.test.ts` | 12 | ~80 |
| `r-code.test.ts` | 3 | ~25 |
| `referral-registration.test.ts` | 4 | ~40 |
| **Total** | **19** | **~145** |

### What NOT to Unit Test

| Skip | Why |
|------|-----|
| SQL functions directly | Tested via service layer integration |
| GIN index performance | DB responsibility, not app logic |
| UI copy/share buttons | Browser APIs, manual QA sufficient |
| Canvas confetti | Visual, manual verification |

### Manual QA Checklist

- [ ] Native share works on mobile
- [ ] Clipboard copy works on desktop
- [ ] Card displays correct stats

---

## Related Documents

- [**Referral Functions SQL**](../../sql/20260131_referral_functions.sql) - Migration file (GIN index + 3 functions)
- [Invite Functions SQL](../../sql/20260127_invite_functions.sql) - Pattern reference
- [InviteService](../../lib/services/invite-service.ts) - Service pattern reference
- [Family Member Invites Milestone](../milestones/20260127_family_member_invites.md) - Similar feature

---

**Author**: Development Team
**Created**: January 30, 2026
**Implemented**: January 31, 2026
**Status**: ✅ Complete
