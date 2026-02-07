# Stripe Checkout + Plan Badge Implementation

**Date**: February 6, 2026
**Status**: ✅ Complete
**Branch**: `feature/stripe-checkout-integration`

---

## Summary

Completed implementation of Stripe Checkout with dual billing modes (one-time purchases and subscriptions), plan preservation through OAuth flows, trial/expired/paid plan badges in the header, trust badges, and integration with existing referral/gift code systems.

---

## Features Implemented

### 1. Stripe Checkout Flow

| Component | File | Status |
|-----------|------|--------|
| Pricing page | `routes/pricing.tsx` | ✅ |
| Pricing card island | `islands/PricingCard.tsx` | ✅ |
| Checkout API | `routes/api/stripe/checkout.ts` | ✅ |
| Webhook handler | `routes/api/stripe/webhook.ts` | ✅ |
| Success page | `routes/stripe/success.tsx` | ✅ |

### 1b. Dual Billing Modes

Users can toggle between two billing options:

| Mode | Plans | Stripe Mode | Auto-Renew |
|------|-------|-------------|------------|
| **One-time** | Summer (3mo), Half Year (6mo), Full Year (12mo) | `payment` | No |
| **Subscribe** | Monthly ($12.99), Annual ($119.99) | `subscription` | Yes |

**One-time Plans:**
- Summer: $29.99 (3 months)
- Half Year: $49.99 (6 months)
- Full Year: $79.99 (12 months) - "Best Value" badge

**Subscription Plans:**
- Monthly: $12.99/month
- Annual: $119.99/year - "Save 23%" badge

### 1c. Trust Badges & Tax Notice

Added pricing footer with trust signals:
- 🔒 Secure Checkout
- 📋 Tax Compliant
- ↩️ 30-Day Guarantee
- 🚫 Cancel Anytime (subscription only)
- 👨‍👩‍👧‍👦 Family-First Support

Plus "+ applicable taxes" notice below plan cards.

### 2. Plan Badge in AppHeader

Shows contextual badges based on plan status:

| Plan State | Badge | Color | Behavior |
|------------|-------|-------|----------|
| Trial active | `14d left` | Orange (#f59e0b) | Links to /pricing |
| Trial expired | `Upgrade` | Red (#ef4444) | Links to /pricing |
| Paid plan | Plan name | Green (#10b981) | No link (informational) |

**Files Updated:**
- `islands/AppHeader.tsx` - New `planBadge` prop with type-based styling
- `lib/plan-gate.ts` - New `getPlanBadge()` helper and `PLAN_DISPLAY_NAMES`
- All parent routes - Pass planBadge to AppHeader

### 3. Trial System

| Feature | Implementation |
|---------|----------------|
| Trial duration | 15 days |
| Device fingerprinting | SHA-256 hash of browser/device signals |
| Fraud prevention | Unique index on `trial_device_hash` column |
| Trial info display | Header badge + TrialBanner component |

### 4. Plan Preservation Through OAuth

**Problem Fixed**: When users selected a plan on `/pricing` before signup, the plan selection was lost during OAuth redirect.

**Root Cause**: Returning OAuth users with existing profiles were server-side redirected to `/` before localStorage could be checked.

**Solution**: Return HTML page with JavaScript that checks localStorage before redirecting.

See: [OAuth Plan Preservation Troubleshooting](../troubleshooting/20260206_oauth_plan_preservation_fix.md)

---

## Code Changes

### New Files

```
routes/pricing.tsx                    # Pricing page with plan cards
routes/stripe/success.tsx             # Post-payment success page
routes/api/stripe/checkout.ts         # Create Stripe Checkout session
routes/api/stripe/webhook.ts          # Handle Stripe webhook events
islands/PricingCard.tsx               # Plan selection + gift code UI
islands/TrialBanner.tsx               # Trial status banner
islands/DeviceFingerprintCollector.tsx # Hidden fingerprint collector
lib/services/plan-service.ts          # Trial initialization logic
sql/20260206_trial_device_hash.sql    # Database migration
```

### Modified Files

```
lib/plan-gate.ts                      # +getPlanBadge(), PLAN_DISPLAY_NAMES
islands/AppHeader.tsx                 # +planBadge prop with CSS variants
routes/setup.tsx                      # OAuth plan preservation fix
routes/landing.tsx                    # "Start Free Trial" CTAs
routes/parent/dashboard.tsx           # Pass planBadge to header
routes/parent/settings.tsx            # Pass planBadge to header
routes/parent/events.tsx              # Pass planBadge to header
routes/parent/insights.tsx            # Pass planBadge to header
routes/parent/balances.tsx            # Pass planBadge to header
routes/parent/rewards.tsx             # Pass planBadge to header
routes/reports.tsx                    # Pass planBadge to header
```

---

## Plan Badge Implementation Details

### Helper Function (lib/plan-gate.ts)

```typescript
export interface PlanBadgeInfo {
  type: 'trial' | 'expired' | 'paid';
  label: string;
}

export function getPlanBadge(settings: any): PlanBadgeInfo | undefined {
  const plan = getPlan(settings);
  const trialInfo = getTrialInfo(settings);

  // Trial active
  if (plan.type === 'trial' && trialInfo.isActive) {
    return { type: 'trial', label: `${trialInfo.daysRemaining}d left` };
  }

  // Trial expired (no paid plan)
  if (trialInfo.isExpired || plan.type === 'free') {
    const hadTrial = settings?.apps?.choregami?.trial?.started_at;
    if (hadTrial) {
      return { type: 'expired', label: 'Upgrade' };
    }
    return undefined;
  }

  // Paid plan
  if (plan.type !== 'free' && plan.type !== 'trial') {
    const displayName = PLAN_DISPLAY_NAMES[plan.type];
    return { type: 'paid', label: displayName };
  }

  return undefined;
}
```

### Display Names

```typescript
export const PLAN_DISPLAY_NAMES: Record<...> = {
  summer: 'Summer',
  school_year: 'Half Year',
  full_year: 'Full Year',
};
```

### CSS Styling (AppHeader.tsx)

```css
.plan-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  padding: 2px 6px;
  border-radius: 6px;
  text-decoration: none;
  white-space: nowrap;
}
.plan-badge-trial { background: rgba(245, 158, 11, 0.9); }
.plan-badge-expired { background: rgba(239, 68, 68, 0.9); }
.plan-badge-paid { background: rgba(16, 185, 129, 0.9); cursor: default; }
```

---

## OAuth Plan Preservation Fix

### The Bug

When a returning user (existing account) logged in via OAuth after selecting a plan:

1. User selects plan on `/pricing` → stored in `localStorage.pendingPlanSelection`
2. User clicks Google OAuth on `/register`
3. OAuth completes, redirects to `/setup`
4. **BUG**: `setup.tsx` GET handler found existing profile → server-side redirect to `/`
5. **RESULT**: localStorage was never checked, plan selection lost

### The Fix

Changed server-side redirect to return HTML page with JavaScript:

```typescript
// BEFORE (buggy)
if (existingProfile) {
  return new Response(null, { status: 303, headers: { Location: "/" } });
}

// AFTER (fixed)
if (existingProfile) {
  return new Response(
    `<!DOCTYPE html>...
      <script>
        var pendingPlan = localStorage.getItem('pendingPlanSelection');
        if (pendingPlan) {
          localStorage.removeItem('pendingPlanSelection');
          window.location.href = '/pricing?checkout=' + pendingPlan;
        } else {
          window.location.href = '/';
        }
      </script>
    ...`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
```

---

## Testing Checklist

### Stripe Checkout
- [x] Create checkout session with correct metadata
- [x] Webhook updates family plan correctly
- [x] Success page displays plan info
- [x] Referral bonus months tracked in metadata

### Plan Badge
- [x] Trial active shows "Xd left" in orange
- [x] Trial expired shows "Upgrade" in red
- [x] Paid plan shows plan name in green
- [x] Badge links to /pricing (trial/expired only)

### OAuth Plan Preservation
- [x] New user: plan preserved through signup
- [x] Returning user: plan preserved through OAuth
- [x] Plan auto-triggers Stripe checkout after redirect

### Trial System
- [x] Device fingerprint collected at signup
- [x] Trial initialized with 15-day duration
- [x] Repeat device blocked from new trial

---

## Related Documents

- [Stripe Checkout Design Doc](../planned/20260206_stripe_checkout_unified_payments.md)
- [OAuth Plan Preservation Fix](../troubleshooting/20260206_oauth_plan_preservation_fix.md)
- [Plan Gate Utility](../../lib/plan-gate.ts)
- [Trial Device Hash Migration](../../sql/20260206_trial_device_hash.sql)
- [Template Gating & Gift Codes](../planned/20260118_template_gating_gift_codes.md) - Code-first redemption flow
- [Amazon Distribution Strategy](../marketing/20260206_amazon_whatsapp_distribution_strategy.md) - `/families` landing page

---

## Commits

1. `c413914` - Initial Stripe checkout implementation
2. `ba2e74e` - Fix plan preservation for returning OAuth users
3. `64a2140` - Add plan badge to AppHeader across all parent pages
4. `797b49d` - Add subscription + one-time pricing options
5. `48574c4` - Add tax notice and trust badges to pricing
6. `6ee0e53` - Update tests and success page for pricing changes

---

**Author**: Development Team
**Completed**: February 6, 2026
