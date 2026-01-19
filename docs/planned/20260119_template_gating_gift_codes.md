# Template Gating & Gift Codes Implementation Plan

**Document Created**: January 19, 2026
**Status**: 📋 Planned - Awaiting Implementation
**Architecture**: JSONB Settings (No New Columns)

## Executive Summary

Gate advanced rotation templates behind a "Family Plan" tier, activated via redeemable gift codes. Uses existing JSONB settings architecture for plan storage - no database schema changes required.

### Strategic Context

This implementation follows the product strategy of:
- **Free tier as observation surface**: Basic features to acquire users and observe behavior
- **Paid tier as pain resolver**: Advanced templates for families who need structure
- **Prepaid time passes**: Not subscriptions - reduces parent friction

### Scope

| In Scope | Out of Scope (Phase 2) |
|----------|------------------------|
| Plan gate helper | Stripe Checkout integration |
| Gift code redemption API | In-app purchase flow |
| Redeem UI (/redeem) | Gift purchase UI |
| Template gating in FamilySettings | Email notifications |
| Plan status display | Promo code management |

---

## Template Gating Strategy

### Free vs Paid Templates

| Template | Access | Rationale |
|----------|--------|-----------|
| 📝 Manual (Default) | ✅ FREE | Core functionality |
| 🌱 Daily Basics | ✅ FREE | Entry-level, habit formation |
| 🎯 Smart Family Rotation | 🔒 Family Plan | Advanced scheduling |
| ⚡ Weekend Warrior | 🔒 Family Plan | Specialized pattern |
| 👨‍👩‍👧‍👦 Large Family Rotation | 🔒 Family Plan | Complex coordination |
| ☀️ Summer Break | 🔒 Family Plan | Seasonal premium |
| 📚 School Year | 🔒 Family Plan | Seasonal premium |

### Pricing Structure (Prepaid Time Passes)

| Plan | Duration | Price | Use Case |
|------|----------|-------|----------|
| School Year | Sept-June (~10 months) | $49 | Primary offering |
| Summer | June-August (3 months) | $19 | Seasonal add-on |
| Full Year | 12 months from activation | $59 | Best value |

---

## Technical Architecture

### Data Storage: JSONB Settings (No New Columns)

Plan information stored in existing `families.settings` JSONB column:

```jsonc
{
  "apps": {
    "choregami": {
      // Existing settings...
      "points_per_dollar": 1,
      "children_pins_enabled": true,

      // NEW: Plan info (just add keys, no migration)
      "plan": {
        "type": "school_year",           // 'school_year' | 'summer' | 'full_year'
        "expires_at": "2027-06-30",      // ISO date string
        "activated_at": "2026-09-01",    // When plan started
        "source": "gift",                // 'direct' | 'gift' | 'promo'
        "gift_code": "GIFT-ABCD-1234"    // Reference (if from gift)
      }
    }
  }
}
```

**Benefits:**
- No ALTER TABLE migrations
- Reuses existing settings patterns
- Backwards compatible
- Flexible for future plan types

### Gift Codes Table (Already Created)

```sql
-- Table exists in production
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code TEXT PRIMARY KEY,           -- GIFT-XXXX-XXXX-XXXX
  plan_type TEXT NOT NULL,         -- 'school_year' | 'summer' | 'full_year'
  purchased_by UUID NOT NULL,      -- user_id of purchaser
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT,                    -- Optional gift message
  redeemed_by UUID,                -- family_id (null until used)
  redeemed_at TIMESTAMPTZ          -- When redeemed
);
```

---

## Implementation Phases

### Phase 1: Plan Gate Helper (~20 lines)

**File:** `lib/plan-gate.ts`

```typescript
export type PlanType = 'free' | 'school_year' | 'summer' | 'full_year';

export const PLAN_DURATIONS_DAYS: Record<Exclude<PlanType, 'free'>, number> = {
  school_year: 300,  // ~10 months
  summer: 90,        // 3 months
  full_year: 365,    // 12 months
};

export function getPlan(settings: any): { type: PlanType; expiresAt: Date | null } {
  const plan = settings?.apps?.choregami?.plan;
  if (!plan?.expires_at) return { type: 'free', expiresAt: null };

  const expiresAt = new Date(plan.expires_at);
  if (expiresAt < new Date()) return { type: 'free', expiresAt: null };

  return { type: plan.type || 'free', expiresAt };
}

export function hasPaidPlan(settings: any): boolean {
  return getPlan(settings).type !== 'free';
}

export function canAccessTemplate(settings: any, templateKey: string): boolean {
  if (templateKey === 'daily_basics') return true;  // Always free
  return hasPaidPlan(settings);
}

export function daysUntilExpiry(settings: any): number | null {
  const { expiresAt } = getPlan(settings);
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
```

---

### Phase 2: Redeem API (~35 lines)

**File:** `routes/api/gift/redeem.ts`

**Endpoint:** `POST /api/gift/redeem`

**Request:**
```json
{ "code": "GIFT-XXXX-XXXX-XXXX" }
```

**Response (Success):**
```json
{
  "success": true,
  "plan_type": "school_year",
  "expires_at": "2027-06-30T00:00:00Z",
  "message": "Happy Birthday!"
}
```

**Response (Error):**
```json
{ "error": "Invalid or already used code" }
```

**Logic:**
1. Validate user is logged in with family
2. Find unused gift code in database
3. Calculate expiry based on plan duration
4. Update `families.settings` JSONB with plan info
5. Mark gift code as redeemed
6. Return success with plan details

---

### Phase 3: Redeem UI (~110 lines)

**Files:**
- `routes/redeem.tsx` - Page route (~60 lines)
- `islands/RedeemForm.tsx` - Interactive form (~50 lines)

**URL:** `/redeem` or `/redeem?code=GIFT-XXXX-XXXX`

**UI Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    /redeem                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         🎁                                       │
│                                                                 │
│              Redeem Gift Code                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              GIFT-XXXX-XXXX-XXXX                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Redeem                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│              Don't have a code? See plans                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Success State:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         🎉                                       │
│                                                                 │
│                   Gift Activated!                               │
│                                                                 │
│   School Year plan                                              │
│   Active until June 30, 2027                                    │
│                                                                 │
│   "Happy Birthday! Love, Grandma"                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Start Using Templates                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Template Gating in FamilySettings (~50 lines)

**File:** `islands/FamilySettings.tsx` (modify existing)

**Changes:**
1. Import `canAccessTemplate`, `hasPaidPlan` from plan-gate
2. Add visual lock indicator (🔒) on gated templates
3. Prevent selection of locked templates
4. Show upgrade modal when locked template tapped

**Locked Template UI:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ○ 🎯 Smart Family Rotation                         🔒          │
│    Two-week cycle balancing cleaning intensity                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Upgrade Modal:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🎯 Smart Family Rotation                                      │
│                                                                 │
│   Two-week cycle that alternates between intensive              │
│   cleaning weeks and lighter maintenance weeks.                 │
│                                                                 │
│   This template is part of Family Plan.                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Enter Gift Code                            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                       Not Now                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Plan Status Display (~15 lines)

**Location:** Top of FamilySettings card

**Paid Plan:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Family Plan                          ends in 14 days        │
└─────────────────────────────────────────────────────────────────┘
```

**Free Plan:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Free Plan                              Have a gift code?       │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Summary

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `lib/plan-gate.ts` | CREATE | ~20 | Plan checking utilities |
| `routes/api/gift/redeem.ts` | CREATE | ~35 | Redemption endpoint |
| `routes/redeem.tsx` | CREATE | ~60 | Redeem page |
| `islands/RedeemForm.tsx` | CREATE | ~50 | Redeem form island |
| `islands/FamilySettings.tsx` | MODIFY | +50 | Template gating |
| `fresh.gen.ts` | AUTO | - | Auto-generated |

**Total: ~215 lines across 5 files**

---

## Manual Operations (For Now)

### Creating Gift Codes

Until Stripe integration (Phase 2), create codes directly in Supabase:

```sql
-- Create a School Year gift code
INSERT INTO gift_codes (code, plan_type, purchased_by, message)
VALUES (
  'GIFT-BETA-2026-TEST',
  'school_year',
  'admin-user-uuid-here',
  'Thanks for being a beta tester!'
);

-- Create a Summer gift code
INSERT INTO gift_codes (code, plan_type, purchased_by, message)
VALUES (
  'GIFT-SUMR-2026-PRMO',
  'summer',
  'admin-user-uuid-here',
  'Enjoy your summer!'
);
```

### Code Format

Recommended format: `GIFT-XXXX-XXXX-XXXX` (uppercase, hyphens)

Example generation:
```typescript
function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/I/1
  const segment = () => Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `GIFT-${segment()}-${segment()}-${segment()}`;
}
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User goes to /parent/settings                               │
│                    │                                            │
│                    ▼                                            │
│  2. Sees template list                                          │
│     • Manual (Default) ✅                                        │
│     • Daily Basics ✅                                            │
│     • Smart Family Rotation 🔒                                   │
│     • Weekend Warrior 🔒                                         │
│     • (etc.)                                                    │
│                    │                                            │
│                    ▼                                            │
│  3. Taps locked template                                        │
│                    │                                            │
│                    ▼                                            │
│  4. Modal appears:                                              │
│     "This template is part of Family Plan"                      │
│     [Enter Gift Code] [Not Now]                                 │
│                    │                                            │
│                    ▼                                            │
│  5. Clicks "Enter Gift Code" → /redeem                          │
│                    │                                            │
│                    ▼                                            │
│  6. Enters code: GIFT-XXXX-XXXX-XXXX                            │
│                    │                                            │
│                    ▼                                            │
│  7. API validates & activates plan                              │
│                    │                                            │
│                    ▼                                            │
│  8. Success! Shows confirmation with expiry date                │
│                    │                                            │
│                    ▼                                            │
│  9. "Start Using Templates" → /parent/settings                  │
│     All templates now unlocked!                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Manual Testing

- [ ] Free user sees lock icons on premium templates
- [ ] Tapping locked template shows upgrade modal
- [ ] /redeem page loads correctly
- [ ] Invalid code shows error message
- [ ] Already-used code shows error message
- [ ] Valid code activates plan
- [ ] Success page shows plan details and gift message
- [ ] After redemption, all templates unlocked
- [ ] Plan status shows in settings header
- [ ] Expired plan reverts to free tier
- [ ] Prefilled code via URL works (/redeem?code=XXX)

### Edge Cases

- [ ] User not logged in → redirect to login
- [ ] Code with wrong format → clear error
- [ ] Network error → graceful failure
- [ ] Plan already active → still works (extends? replaces?)

---

## Future Enhancements (Phase 2)

### Stripe Checkout Integration (~140 lines)

```
┌─────────────────────────────────────────────────────────────────┐
│  NEW FILES:                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  routes/api/checkout.ts         ~40 lines (create session)      │
│  routes/api/webhooks/stripe.ts  ~50 lines (handle payment)      │
│  routes/checkout/success.tsx    ~30 lines (success page)        │
│  lib/stripe.ts                  ~20 lines (client init)         │
└─────────────────────────────────────────────────────────────────┘
```

### Gift Purchase Flow

- Buy gift for others
- Email delivery option
- Printable gift card

### Promo Codes

- Time-limited discounts
- Bulk school purchases
- Referral codes

---

## Design Principles Alignment

| Principle | How This Plan Aligns |
|-----------|---------------------|
| **20% effort, 80% value** | ~215 lines enables full gating + redemption |
| **No code bloat** | Reuses existing JSONB settings pattern |
| **Max 500 lines/module** | Largest file ~60 lines |
| **Simplicity** | Single redemption flow, no complex pricing UI |
| **Low cognitive load** | Clear lock icons, simple modal, one input field |
| **Architecture flexibility** | JSONB allows adding plan types without migrations |

---

## References

- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md)
- [Chore Templates Design](../chore-templates-design.md)
- [Seasonal Templates](../milestones/20260116_seasonal-templates-implementation.md)

---

## Approval Checklist

- [ ] Phase 1: Plan Gate Helper
- [ ] Phase 2: Redeem API
- [ ] Phase 3: Redeem UI
- [ ] Phase 4: Template Gating in FamilySettings
- [ ] Phase 5: Plan Status Display

**Estimated Total Implementation: ~215 lines**
