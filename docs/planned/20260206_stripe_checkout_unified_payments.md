# Stripe Checkout + Unified Payments System

**Date**: February 6, 2026
**Status**: 🚧 In Progress
**Priority**: Revenue / Core Feature
**Branch**: `feature/stripe-checkout-integration`

---

## Overview

Implement Stripe Checkout for paid subscriptions while integrating with existing referral codes, gift codes, and plan gate systems. Includes 15-day free trial with device fingerprinting for fraud prevention.

### Business Goals

1. Enable paid subscriptions via Stripe (3mo, 10mo, 12mo)
2. Prevent trial abuse with device fingerprinting
3. Respect and integrate all existing code systems
4. Provide seamless upgrade path from trial → paid

---

## Existing Systems to Respect

| System | Code Format | Benefit | Storage |
|--------|-------------|---------|---------|
| Referral | E1E48B (6-char) | +1 free month (max 6) | JSONB `settings.apps.choregami.referral` |
| Gift Codes | GIFT-XXXX-XXXX-XXXX | Activate plan (extends) | `gift_codes` table + JSONB |
| Plan Gate | - | Template access control | JSONB `settings.apps.choregami.plan` |

### Plan Types Alignment

| Current Plan | Duration | Stripe Price | Gift Code |
|--------------|----------|--------------|-----------|
| summer | 90 days | $29.99 (3mo) | ✅ Exists |
| school_year | 300 days | $49.99 (10mo) | ✅ Exists |
| full_year | 365 days | $79.99 (annual) | ✅ Exists |
| **NEW: trial** | 15 days | Free | N/A |

---

## Principles Applied

| Principle | How Applied |
|-----------|-------------|
| **Pareto 80/20** | Stripe Checkout (hosted) - no custom payment forms |
| **Reuse existing** | Copy patterns from fresh-auth, extend plan-gate.ts |
| **O(1) database** | Unique index on device_hash for fraud check |
| **No code bloat** | ~410 lines total across all new files |
| **JSONB flexibility** | Plan data in existing settings structure |
| **Complete schema** | All tracking fields included upfront |

---

## UX Design: Unified Pricing Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                    Choose Your Plan                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   Summer     │  │  School Year │  │  Full Year ⭐    │      │
│  │   3 months   │  │   10 months  │  │   12 months      │      │
│  │    $29.99    │  │    $49.99    │  │    $79.99        │      │
│  │  $10/month   │  │  $5/month    │  │   $6.67/month    │      │
│  │              │  │              │  │   Best Value     │      │
│  │  [ Select ]  │  │  [ Select ]  │  │   [ Select ]     │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
│                                                                 │
│  ─────────────────────── or ───────────────────────────────    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  🎁 Have a gift code?                                 │     │
│  │  ┌─────────────────────────────────────┐              │     │
│  │  │  GIFT-XXXX-XXXX-XXXX                │  [ Redeem ]  │     │
│  │  └─────────────────────────────────────┘              │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  💛 Referred by a friend? Your bonus applies at       │     │
│  │     checkout automatically!                           │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED SIGNUP FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. LANDING PAGE                                         │   │
│  │     - "Start Free (15 days)" button                      │   │
│  │     - Optional: ?ref=E1E48B in URL (captured)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  2. SIGNUP                                               │   │
│  │     - Collect: email, password, family name              │   │
│  │     - Collect: device fingerprint (fraud prevention)     │   │
│  │     - Store: referral_code from URL (if present)         │   │
│  │     - Check: device_hash exists? → Block repeat trial    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│           ┌─────────────┴─────────────┐                        │
│           ▼                           ▼                        │
│  ┌─────────────────┐      ┌─────────────────────────────────┐  │
│  │  DEVICE EXISTS  │      │  NEW DEVICE                     │  │
│  │  (Fraud Block)  │      │  → Create trial (15 days)       │  │
│  │                 │      │  → Store device_hash            │  │
│  │  "Welcome back! │      │  → Credit referrer (+1 month)   │  │
│  │   Log in or     │      │     if ref code valid           │  │
│  │   subscribe"    │      └─────────────────────────────────┘  │
│  └─────────────────┘                  │                        │
│                                       ▼                        │
│                    ┌─────────────────────────────────────────┐ │
│                    │  3. TRIAL ACTIVE (Days 1-10)            │ │
│                    │     - Full access to all features       │ │
│                    │     - Subtle "12 days left" badge       │ │
│                    │     - No upgrade nag                    │ │
│                    └─────────────────────────────────────────┘ │
│                                       │                        │
│                                       ▼                        │
│                    ┌─────────────────────────────────────────┐ │
│                    │  4. TRIAL ENDING (Days 11-15)           │ │
│                    │     - Non-blocking upgrade banner       │ │
│                    │     - Shows family's stats              │ │
│                    │     - Gift code input visible           │ │
│                    └─────────────────────────────────────────┘ │
│                                       │                        │
│                                       ▼                        │
│                    ┌─────────────────────────────────────────┐ │
│                    │  5. TRIAL EXPIRED (Day 16+)             │ │
│                    │     - Soft paywall                      │ │
│                    │     - Three options:                    │ │
│                    │       a) Stripe checkout (3/10/12mo)    │ │
│                    │       b) Gift code redemption           │ │
│                    │       c) Use referral bonus if earned   │ │
│                    └─────────────────────────────────────────┘ │
│                                       │                        │
│           ┌───────────────┬───────────┴───────────┐            │
│           ▼               ▼                       ▼            │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ STRIPE PAY  │  │ GIFT CODE       │  │ REFERRAL BONUS      │ │
│  │             │  │                 │  │                     │ │
│  │ → Checkout  │  │ → /api/gift/    │  │ → Apply earned      │ │
│  │ → Webhook   │  │    redeem       │  │    months from      │ │
│  │ → Activate  │  │ → Activate plan │  │    conversions      │ │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘ │
│           │               │                       │            │
│           └───────────────┴───────────────────────┘            │
│                           │                                    │
│                           ▼                                    │
│                    ┌─────────────────────────────────────────┐ │
│                    │  6. PLAN ACTIVE                         │ │
│                    │     - Full access                       │ │
│                    │     - Plan expires_at tracked           │ │
│                    │     - Can extend with gift/Stripe       │ │
│                    └─────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Trial States UX

### Trial Active (Days 1-10)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ChoreGami                           Trial: 12 days left │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │                                                          │   │
│  │  [Normal dashboard content - full access]                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Trial Ending (Days 11-15)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │  ⏰ Your trial ends in 4 days                       ││   │
│  │  │                                                     ││   │
│  │  │  Your family has completed 47 chores! Keep going.   ││   │
│  │  │                                                     ││   │
│  │  │  [ Choose a Plan ]     [ Have a gift code? ]        ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │                                                          │   │
│  │  [Normal dashboard content - still full access]          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Trial Expired (Day 16+)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    Your trial has ended                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  🎯 Your family completed 47 chores during the trial!   │   │
│  │                                                         │   │
│  │  Continue your progress with a ChoreGami plan:          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Pricing cards shown here - see Unified Pricing Screen above] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fraud Prevention: Device Already Seen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    Welcome back!                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Looks like you've tried ChoreGami before.              │   │
│  │                                                         │   │
│  │  [ Log in to existing account ]                         │   │
│  │                                                         │   │
│  │  ─────────────────── or ───────────────────────────     │   │
│  │                                                         │   │
│  │  [ Subscribe to continue ]                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stripe Checkout Flow

### 1. User Clicks "Select" on Plan

```
User clicks [ Select ] on "Full Year" plan
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/stripe/checkout                                      │
│  Body: { planType: "full_year" }                                │
│                                                                 │
│  → Check referral bonus (monthsEarned - monthsRedeemed)         │
│  → Create Stripe Checkout Session with:                         │
│      - Price: $79.99 (or adjusted for referral bonus)           │
│      - Metadata: { family_id, plan_type, referral_months }      │
│      - Success URL: /stripe/success?session_id={CHECKOUT_ID}    │
│      - Cancel URL: /pricing                                     │
│                                                                 │
│  ← Return: { url: "https://checkout.stripe.com/..." }           │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Redirect to Stripe Checkout (hosted page)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────┐                                   │   │
│  │  │  ChoreGami       │   Pay $79.99                      │   │
│  │  │  Full Year Plan  │                                   │   │
│  │  └──────────────────┘   ┌───────────────────────────┐   │   │
│  │                         │  Card number              │   │   │
│  │                         │  ________________________ │   │   │
│  │                         │                           │   │   │
│  │                         │  MM/YY     CVC            │   │   │
│  │                         │  ______    _____          │   │   │
│  │                         │                           │   │   │
│  │                         │  [ Pay $79.99 ]           │   │   │
│  │                         └───────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ (on success)
┌─────────────────────────────────────────────────────────────────┐
│  Stripe Webhook: checkout.session.completed                     │
│                                                                 │
│  → Extract family_id, plan_type from metadata                   │
│  → Calculate new expiry (extends if existing plan)              │
│  → Update families.settings.apps.choregami.plan                 │
│  → Mark referral months as redeemed (if any used)               │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Redirect to /stripe/success                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                    🎉 Welcome to ChoreGami!             │   │
│  │                                                         │   │
│  │  Your Full Year plan is now active.                     │   │
│  │  Valid until: February 6, 2027                          │   │
│  │                                                         │   │
│  │  [ Go to Dashboard ]                                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Storage Location (JSONB - No New Columns)

```jsonc
{
  "apps": {
    "choregami": {
      "plan": {
        "type": "trial" | "summer" | "school_year" | "full_year",
        "expires_at": "2026-02-21",        // YYYY-MM-DD
        "activated_at": "2026-02-06",
        "source": "trial" | "stripe" | "gift" | "referral_bonus",
        "stripe_subscription_id": "sub_xxx", // Only if Stripe
        "gift_code": "GIFT-XXXX-XXXX",      // Only if gift
      },
      "trial": {
        "started_at": "2026-02-06",
        "device_hash": "abc123def456...",   // Fraud prevention
      },
      "referral": { /* existing referral tracking */ }
    }
  }
}
```

### Device Fingerprint Index (Fraud Prevention)

```sql
-- Option A: Dedicated column for O(1) lookup
ALTER TABLE families ADD COLUMN IF NOT EXISTS trial_device_hash TEXT;
CREATE UNIQUE INDEX idx_families_trial_device_hash
  ON families(trial_device_hash)
  WHERE trial_device_hash IS NOT NULL;

-- Option B: GIN on JSONB (slightly slower but no schema change)
CREATE INDEX IF NOT EXISTS idx_families_device_hash
  ON families USING GIN (
    (settings->'apps'->'choregami'->'trial'->'device_hash')
  );
```

---

## Device Fingerprint Implementation

### Client-Side Collection

```typescript
// lib/device-fingerprint.ts

export async function collectDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || '',
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.maxTouchPoints?.toString() || '0',
    // Canvas fingerprint (optional, more unique)
    await getCanvasFingerprint(),
  ];

  // Hash the combined string
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('ChoreGami fingerprint', 2, 2);

  return canvas.toDataURL().slice(-50); // Last 50 chars
}
```

### Server-Side Check

```typescript
// In signup handler

async function checkDeviceForFraud(deviceHash: string): Promise<boolean> {
  const { data } = await supabase
    .from('families')
    .select('id')
    .eq('trial_device_hash', deviceHash)
    .limit(1);

  return data && data.length > 0; // true = fraud detected
}
```

---

## Plan Gate Updates

```typescript
// lib/plan-gate.ts - ADDITIONS

// Add 'trial' type
export type PlanType = 'free' | 'trial' | 'summer' | 'school_year' | 'full_year';

export const PLAN_DURATIONS_DAYS: Record<Exclude<PlanType, 'free'>, number> = {
  trial: 15,         // NEW: 15-day trial
  summer: 90,        // 3 months
  school_year: 300,  // ~10 months
  full_year: 365,    // 12 months
};

// Plan sources for tracking
export type PlanSource = 'trial' | 'stripe' | 'gift' | 'referral_bonus';

// Stripe price mapping
export const STRIPE_PRICES: Record<Exclude<PlanType, 'free' | 'trial'>, string> = {
  summer: 'price_summer_2999',      // $29.99
  school_year: 'price_school_4999', // $49.99
  full_year: 'price_annual_7999',   // $79.99
};
```

---

## Referral Bonus Application

```typescript
// lib/services/referral-service.ts - ADDITIONS

/** Get available referral bonus months */
async getAvailableBonus(familyId: string): Promise<number> {
  const stats = await this.getStats(familyId);
  if (!stats) return 0;

  return Math.max(0, stats.monthsEarned - stats.monthsRedeemed);
}

/** Apply referral bonus (extends plan) */
async applyReferralBonus(familyId: string, months: number): Promise<void> {
  const current = await this.getStats(familyId);
  if (!current) throw new Error('No referral data');

  const available = current.monthsEarned - current.monthsRedeemed;
  if (months > available) throw new Error('Insufficient bonus months');

  // Mark months as redeemed
  await this.supabase
    .from('families')
    .update({
      settings: {
        ...currentSettings,
        apps: {
          ...currentSettings.apps,
          choregami: {
            ...currentSettings.apps.choregami,
            referral: {
              ...current,
              reward_months_redeemed: current.monthsRedeemed + months,
            }
          }
        }
      }
    })
    .eq('id', familyId);
}
```

---

## API Routes

### POST /api/stripe/checkout

```typescript
// routes/api/stripe/checkout.ts

import Stripe from 'stripe';

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType } = await req.json();
    if (!['summer', 'school_year', 'full_year'].includes(planType)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

    // Check for referral bonus
    const referralService = new ReferralService();
    const bonusMonths = await referralService.getAvailableBonus(session.family.id);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [{
        price: STRIPE_PRICES[planType],
        quantity: 1,
      }],
      metadata: {
        family_id: session.family.id,
        plan_type: planType,
        referral_bonus_months: bonusMonths.toString(),
      },
      success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    });

    return Response.json({ url: checkoutSession.url });
  }
};
```

### POST /api/stripe/webhook

```typescript
// routes/api/stripe/webhook.ts

export const handler: Handlers = {
  async POST(req) {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const sig = req.headers.get('stripe-signature')!;
    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      );
    } catch (err) {
      return new Response('Webhook signature failed', { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { family_id, plan_type, referral_bonus_months } = session.metadata!;

        // Get current family settings
        const { data: family } = await supabase
          .from('families')
          .select('settings')
          .eq('id', family_id)
          .single();

        // Calculate new expiry (extends existing)
        const newExpiry = calculateNewExpiry(family.settings, plan_type);

        // Update family plan
        await updateFamilyPlan(family_id, {
          type: plan_type,
          expires_at: newExpiry,
          source: 'stripe',
          stripe_payment_id: session.payment_intent as string,
        });

        // Apply referral bonus months if any
        const bonusMonths = parseInt(referral_bonus_months || '0');
        if (bonusMonths > 0) {
          const referralService = new ReferralService();
          await referralService.applyReferralBonus(family_id, bonusMonths);
        }

        break;
      }
    }

    return new Response('OK');
  }
};
```

---

## File Structure

```
lib/
  plan-gate.ts                  # +10 lines (add trial type)
  device-fingerprint.ts         # ~40 lines (new)
  services/
    referral-service.ts         # +30 lines (bonus application)

routes/
  pricing.tsx                   # ~150 lines (new page)
  stripe/
    success.tsx                 # ~50 lines (confirmation page)
  api/
    stripe/
      checkout.ts               # ~60 lines
      webhook.ts                # ~80 lines

islands/
  PricingCard.tsx               # ~120 lines (plan selection + gift code)
  TrialBanner.tsx               # ~60 lines (trial status in header)
```

---

## Implementation Estimate

| Component | Lines Est. | Reuse |
|-----------|------------|-------|
| lib/plan-gate.ts update | +10 | Extend existing |
| routes/api/stripe/checkout.ts | ~60 | Pattern from fresh-auth |
| routes/api/stripe/webhook.ts | ~80 | Pattern from fresh-auth |
| routes/stripe/success.tsx | ~50 | Pattern from fresh-auth |
| routes/pricing.tsx | ~150 | New (simple) |
| islands/PricingCard.tsx | ~120 | New |
| islands/TrialBanner.tsx | ~60 | New |
| lib/device-fingerprint.ts | ~40 | New |
| Device hash check at signup | ~20 | Modify existing |
| Referral bonus application | ~30 | Extend ReferralService |
| **Total** | **~620** | Under 500/module ✅ |

---

## Environment Variables Required

```bash
# Stripe (copy from fresh-auth or create new)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_SUMMER=price_xxx      # $29.99
STRIPE_PRICE_SCHOOL_YEAR=price_xxx # $49.99
STRIPE_PRICE_FULL_YEAR=price_xxx   # $79.99
```

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Webhook spoofing | Verify Stripe signature with STRIPE_WEBHOOK_SECRET |
| Double-charging | Stripe handles idempotency; check existing plan before update |
| Trial abuse | Device fingerprint hash with unique index |
| Referral bonus abuse | Track redeemed vs earned; atomic update |
| Gift code reuse | Existing `redeemed_at` check in gift_codes table |

---

## Testing Checklist

### Unit Tests
- [ ] Device fingerprint generates consistent hash
- [ ] Plan expiry calculation extends correctly
- [ ] Referral bonus deduction works atomically

### Integration Tests
- [ ] Stripe checkout creates session with correct metadata
- [ ] Webhook updates family plan correctly
- [ ] Gift code redemption still works alongside Stripe
- [ ] Trial blocks repeat signups from same device

### Manual QA
- [ ] Full signup → trial → upgrade flow
- [ ] Gift code redemption during trial
- [ ] Referral bonus displayed at checkout
- [ ] Stripe test card payments

---

## Related Documents

- [Referral Functions SQL](../../sql/20260131_referral_functions.sql)
- [Gift Codes Schema](../../sql/20260118_gift_codes.sql)
- [Plan Gate Utility](../../lib/plan-gate.ts)
- [Referral Service](../../lib/services/referral-service.ts)
- [Referral Share Feature](./20260130_referral_share_feature.md)

---

**Author**: Development Team
**Created**: February 6, 2026
**Status**: 🚧 In Progress
