# Template Gating & Gift Codes Implementation

**Document Created**: January 18, 2026
**Status**: ✅ **IMPLEMENTED** (January 19, 2026)
**Architecture**: JSONB Settings (No New Columns)

## Executive Summary

Gate advanced rotation templates behind a "Family Plan" tier, activated via redeemable gift codes. Uses existing JSONB settings architecture for plan storage - no database schema changes required.

### Strategic Context

This implementation follows the product strategy of:
- **Free tier as observation surface**: Basic features to acquire users and observe behavior
- **Paid tier as pain resolver**: Advanced templates for families who need structure
- **Prepaid time passes**: Not subscriptions - reduces parent friction

### Scope

| In Scope (✅ Implemented) | Out of Scope (Phase 2) |
|---------------------------|------------------------|
| Plan gate helper (`lib/plan-gate.ts`) | Stripe Checkout integration |
| Gift code redemption API | In-app purchase flow |
| Redeem UI (`/redeem`) | Gift purchase UI |
| Template gating in TemplateSelector | Email notifications |
| Plan status display | Promo code management |

---

## Implementation Summary

### Files Created/Modified

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `lib/plan-gate.ts` | CREATE | ~55 | Plan checking utilities with expiry calculation |
| `lib/plan-gate_test.ts` | CREATE | ~140 | 15 unit tests for plan-gate |
| `routes/api/gift/redeem.ts` | CREATE | ~100 | Redemption API endpoint |
| `routes/api/gift/redeem_test.ts` | CREATE | ~160 | 14 unit tests for redemption |
| `routes/redeem.tsx` | CREATE | ~65 | Redeem page route |
| `islands/RedeemForm.tsx` | CREATE | ~195 | Interactive redemption form |
| `islands/TemplateSelector.tsx` | CREATE | ~450 | Extracted template selection with gating |
| `islands/FamilySettings.tsx` | MODIFY | -600 | Refactored to use TemplateSelector |
| `sql/20260118_gift_codes.sql` | CREATE | ~100 | Database schema and generation functions |

**Feb 6, 2026 Updates:**

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `routes/api/gift/validate.ts` | CREATE | ~42 | Code validation API (no auth required) |
| `routes/families.tsx` | CREATE | ~350 | Family-focused landing page for Amazon traffic |
| `routes/redeem.tsx` | MODIFY | - | Removed login requirement for code-first flow |
| `islands/RedeemForm.tsx` | MODIFY | ~342 | 3-state flow: form → validated → success |
| `lib/plan-gate.ts` | MODIFY | - | Updated school_year to 180 days (Half Year) |
| `lib/auth/staff.ts` | CREATE | ~80 | Staff email validation for admin access |
| `routes/admin/gift-codes.tsx` | CREATE | ~100 | Admin panel page |
| `islands/GiftCodeAdmin.tsx` | CREATE | ~450 | Interactive admin UI component |
| `routes/api/admin/gift-codes/generate.ts` | CREATE | ~85 | Batch code generation API |
| `routes/api/admin/gift-codes/list.ts` | CREATE | ~100 | Code listing API with filters |
| `routes/api/admin/gift-codes/stats.ts` | CREATE | ~120 | Financial statistics API |

**Feb 7, 2026 Updates:**

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `islands/AdminIdleTimeout.tsx` | CREATE | ~145 | 2-minute idle timeout component |
| `routes/admin/index.tsx` | MODIFY | - | Added logout button + idle timeout |
| `routes/admin/gift-codes.tsx` | MODIFY | - | Added logout button + idle timeout |
| `routes/api/admin/gift-codes/list.ts` | MODIFY | +60 | Added redeemer email + expiry lookup |
| `islands/GiftCodeAdmin.tsx` | MODIFY | +15 | Added Assigned To + Expires columns |

**Total: ~1,265 lines original + ~1,335 lines Feb 6 + ~220 lines Feb 7 (admin) + ~150 lines Feb 7 (auth flow) updates**

**Feb 7, 2026 Auth Flow Updates:**

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `routes/login.tsx` | MODIFY | +3 | Added `returnTo` param support alongside `redirect` |
| `routes/redeem.tsx` | MODIFY | +5 | Added `hasFamily` prop to distinguish auth states |
| `islands/RedeemForm.tsx` | MODIFY | +40 | Store code in localStorage, clear on success, handle no-family state |
| `routes/api/gift/redeem.ts` | MODIFY | +30 | Accept explicit `familyId` for setup flow |
| `routes/setup.tsx` | MODIFY | +60 | Read pendingGiftCode, show banner, apply after family creation |
| `routes/logout.ts` | MODIFY | +8 | Clear pending gift code tokens |

---

## Template Gating Strategy

### Free vs Paid Templates

| Template | Access | Rationale |
|----------|--------|-----------|
| 📝 Manual (Default) | ✅ FREE | Core functionality |
| 🌱 Daily Basics | ✅ FREE | Entry-level, habit formation |
| 🔄 Dynamic Daily Routines | ✅ FREE | Scales to any family size |
| 🎯 Smart Family Rotation | 🔒 Family Plan | Advanced scheduling |
| ⚡ Weekend Warrior | 🔒 Family Plan | Specialized pattern |
| 👨‍👩‍👧‍👦 Large Family Rotation | 🔒 Family Plan | Complex coordination |
| ☀️ Summer Break | 🔒 Family Plan | Seasonal premium |
| 📚 School Year | 🔒 Family Plan | Seasonal premium |

### Pricing Structure (Prepaid Time Passes)

| Plan | Duration | Price | Use Case |
|------|----------|-------|----------|
| Half Year | 6 months (180 days) | $49.99 | Primary offering |
| Summer | 3 months (90 days) | $29.99 | Seasonal add-on |
| Full Year | 12 months (365 days) | $79.99 | Best value |

> **Updated Feb 6, 2026**: School Year renamed to Half Year, durations aligned with Stripe products.

---

## Technical Implementation

### Plan Gate Utilities (`lib/plan-gate.ts`)

```typescript
export type PlanType = 'free' | 'school_year' | 'summer' | 'full_year';

export const PLAN_DURATIONS_DAYS: Record<Exclude<PlanType, 'free'>, number> = {
  school_year: 180,  // 6 months (Half Year)
  summer: 90,        // 3 months
  full_year: 365,    // 12 months
};

// Templates that are always free (no plan required)
export const FREE_TEMPLATES = ['daily_basics', 'dynamic_daily'];

export interface PlanInfo {
  type: PlanType;
  expiresAt: Date | null;
  daysRemaining: number | null;
}

export function getPlan(settings: any): PlanInfo;
export function hasPaidPlan(settings: any): boolean;
export function canAccessTemplate(settings: any, templateKey: string): boolean;
export function calculateNewExpiry(currentSettings: any, planType: Exclude<PlanType, 'free'>): Date;
```

**Key Features:**
- `getPlan()`: Extracts plan info from JSONB settings, handles expiry
- `hasPaidPlan()`: Simple boolean check for paid status
- `canAccessTemplate()`: Checks FREE_TEMPLATES first, then plan status
- `calculateNewExpiry()`: **Extends** existing plans by adding days (not replacing)

### Data Storage: JSONB Settings

Plan information stored in existing `families.settings` JSONB column:

```jsonc
{
  "apps": {
    "choregami": {
      // Existing settings...
      "points_per_dollar": 1,
      "children_pins_enabled": true,

      // Plan info (added via gift code redemption)
      "plan": {
        "type": "school_year",           // 'school_year' | 'summer' | 'full_year'
        "expires_at": "2027-06-30",      // ISO date string (YYYY-MM-DD)
        "activated_at": "2026-09-01",    // When plan started
        "source": "gift",                // 'direct' | 'gift' | 'promo'
        "gift_code": "GIFT-ABCD-1234"    // Reference (if from gift)
      }
    }
  }
}
```

### Gift Codes Database Schema

```sql
-- Table structure
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code TEXT PRIMARY KEY,              -- GIFT-XXXX-XXXX-XXXX format
  plan_type TEXT NOT NULL,            -- 'school_year' | 'summer' | 'full_year'
  purchased_by UUID NOT NULL,         -- user_id of purchaser/admin
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT,                       -- Optional gift message
  redeemed_by UUID,                   -- family_id (null until used)
  redeemed_at TIMESTAMPTZ,            -- When redeemed
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('school_year', 'summer', 'full_year'))
);

-- Code generation function (excludes confusing chars: O/0/I/1/L)
CREATE OR REPLACE FUNCTION generate_gift_code() RETURNS TEXT;
CREATE OR REPLACE FUNCTION create_gift_code(p_plan_type TEXT, p_purchased_by UUID, p_message TEXT DEFAULT NULL) RETURNS TEXT;
```

### Validation API (`routes/api/gift/validate.ts`) - NEW Feb 6, 2026

**Endpoint:** `POST /api/gift/validate`

**Purpose:** Validate gift codes **without requiring login** - enables code-first flow.

**Request:**
```json
{ "code": "GIFT-XXXX-XXXX-XXXX" }
```

**Response (Valid):**
```json
{
  "valid": true,
  "plan_type": "school_year",
  "message": "Happy Birthday!"
}
```

**Response (Invalid):**
```json
{ "valid": false, "error": "Invalid or already used code" }
```

**Logic:**
1. Normalize code (uppercase, trim)
2. Query `gift_codes` table for unused code
3. Return plan info without redeeming

---

### Redemption API (`routes/api/gift/redeem.ts`)

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
2. Normalize code (uppercase, trim)
3. Find unused gift code in database
4. Calculate new expiry (extends existing plan if active)
5. Update `families.settings` JSONB with plan info
6. Mark gift code as redeemed
7. Return success with plan details

### TemplateSelector Component (`islands/TemplateSelector.tsx`)

Extracted from FamilySettings.tsx (~2400 lines → ~1800 lines after extraction).

**Features:**
- Visual lock icons (🔒) on gated templates
- **ACTIVE badge**: Blue badge showing currently active template
- **FREE badge**: Green badge on always-free templates
- Plan status banner with helpful context:
  - Free Plan: "🎁 Free Plan - 3 templates included · Unlock 5 more with Family Plan"
  - Family Plan: "📚 Family Plan - ends in X days"
- Upgrade modal when locked template tapped
- Slot assignment modal for template activation
- Customization panel for active templates

**Props:**
```typescript
interface Props {
  settings: any;
  children: { id: string; name: string }[];
  onRemoveRotation: () => Promise<void>;
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
│  2. Sees template list with TemplateSelector                    │
│     • Manual (Default) ✅                                        │
│     • Daily Basics ✅                                            │
│     • Dynamic Daily Routines ✅                                  │
│     • Smart Family Rotation 🔒                                   │
│     • Weekend Warrior 🔒                                         │
│     • (etc.)                                                    │
│                    │                                            │
│                    ▼                                            │
│  3. Taps locked template                                        │
│                    │                                            │
│                    ▼                                            │
│  4. Upgrade modal appears:                                      │
│     "This template requires Family Plan"                        │
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
│     (extends existing plan if active)                           │
│                    │                                            │
│                    ▼                                            │
│  8. Success! Shows confirmation with expiry date                │
│     + optional gift message                                     │
│                    │                                            │
│                    ▼                                            │
│  9. "Start Using Templates" → /parent/settings                  │
│     All paid templates now unlocked!                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Code-First Redemption Flow (NEW Feb 6, 2026)

For users arriving from external sources (Amazon gift cards, marketing links):

```
┌─────────────────────────────────────────────────────────────────┐
│              CODE-FIRST REDEMPTION FLOW                          │
│         (No login required to validate code)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User arrives at /families or /redeem?code=GIFT-XXXX         │
│     (from Amazon gift card, marketing email, etc.)              │
│                    │                                            │
│                    ▼                                            │
│  2. Enters gift code (or code is pre-filled from URL)           │
│     [GIFT-XXXX-XXXX-XXXX]                                       │
│                    │                                            │
│                    ▼                                            │
│  3. Clicks "Check Code" → POST /api/gift/validate               │
│     (No login required!)                                        │
│                    │                                            │
│         ┌─────────┴─────────┐                                   │
│         ▼                   ▼                                   │
│     [Invalid]           [Valid]                                 │
│     Show error          Show plan info                          │
│                    │                                            │
│         ┌─────────┴─────────┐                                   │
│         ▼                   ▼                                   │
│   [Not Logged In]    [Logged In]                                │
│   Show login prompt  Auto-redeem                                │
│   with returnTo URL  via /api/gift/redeem                       │
│         │                   │                                   │
│         ▼                   ▼                                   │
│   /login?returnTo=    Success!                                  │
│   /redeem?code=XXX    Plan activated                            │
│         │                                                       │
│         ▼                                                       │
│   After login, returns to /redeem?code=XXX                      │
│   Code pre-filled, click "Check Code" → auto-redeems            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key benefits:**
- Reduces friction for gift recipients
- Validates code before requiring account creation
- Preserves code through login/signup flow via `returnTo` URL
- Supports `/families` landing page for Amazon traffic

---

## Gift Code Administration

### Admin Panel (Recommended)

Staff members can generate and manage gift codes via the admin panel:

**URL**: `/admin/gift-codes`

**Features:**
- **Generate Codes**: Batch generation (1-100 codes at a time)
- **View Pending Codes**: Unused codes ready for distribution
- **View Redeemed Codes**: Codes with **assigned email** and **subscription expiry date**
- **Financial Dashboard**: Revenue tracking by plan type
- **Security**: 2-minute idle auto-logout with 30-second warning, logout button

**Access Control:**
- Requires authenticated staff email
- Authorized domains: `@choregami.com`, `@choregami.app`, `@probuild365.com`
- Specific emails: `support@choregami.com`, `admin@choregami.com`, `gk@probuild365.com`

**Files:**
- `routes/admin/index.tsx` - Admin dashboard landing
- `routes/admin/gift-codes.tsx` - Gift code management page
- `islands/GiftCodeAdmin.tsx` - Interactive UI component
- `islands/AdminIdleTimeout.tsx` - 2-min idle timeout with warning modal
- `routes/api/admin/gift-codes/generate.ts` - Batch generation API
- `routes/api/admin/gift-codes/list.ts` - Code listing API (with redeemer email + expiry)
- `routes/api/admin/gift-codes/stats.ts` - Statistics API
- `lib/auth/staff.ts` - Staff email validation

### Manual SQL Operations (Alternative)

For direct database access, create codes via Supabase SQL Editor:

```sql
-- Get your admin user UUID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create a Half Year gift code (formerly School Year)
SELECT create_gift_code('school_year', 'YOUR-ADMIN-USER-UUID', 'Welcome to ChoreGami!');

-- Create a Summer gift code
SELECT create_gift_code('summer', 'YOUR-ADMIN-USER-UUID', 'Enjoy your summer!');

-- Create a Full Year gift code
SELECT create_gift_code('full_year', 'YOUR-ADMIN-USER-UUID', 'Thanks for being a beta tester!');

-- Create multiple codes at once (batch)
SELECT create_gift_code('school_year', 'YOUR-ADMIN-USER-UUID', 'Beta tester reward')
FROM generate_series(1, 5);

-- View all unused gift codes
SELECT code, plan_type, message, purchased_at
FROM gift_codes
WHERE redeemed_by IS NULL
ORDER BY purchased_at DESC;

-- View redemption history
SELECT code, plan_type, redeemed_by, redeemed_at
FROM gift_codes
WHERE redeemed_by IS NOT NULL
ORDER BY redeemed_at DESC;
```

### Code Format

Format: `GIFT-XXXX-XXXX-XXXX` (uppercase, hyphens)

Character set excludes confusing characters: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no O/0/I/1/L)

---

## Testing

### Unit Tests (29 total)

**lib/plan-gate_test.ts** (15 tests):
- `getPlan` - empty/null/expired/active settings
- `hasPaidPlan` - various plan states
- `canAccessTemplate` - free vs paid templates
- `calculateNewExpiry` - new plans and extensions
- `FREE_TEMPLATES` - constant validation

**routes/api/gift/redeem_test.ts** (14 tests):
- Authentication validation
- Input validation (code format, normalization)
- Plan extension logic
- Settings structure updates
- Response format validation

### Manual Testing Checklist

- [x] Free user sees lock icons on premium templates
- [x] Tapping locked template shows upgrade modal
- [x] /redeem page loads correctly
- [x] Invalid code shows error message
- [x] Valid code activates plan
- [x] Success page shows plan details and gift message
- [x] After redemption, all templates unlocked
- [x] Plan status shows in settings header
- [x] Prefilled code via URL works (/redeem?code=XXX)

---

## Future Enhancements (Phase 2)

### Stripe Checkout Integration (~140 lines)

```
┌─────────────────────────────────────────────────────────────────┐
│  FUTURE FILES:                                                  │
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

| Principle | How Implementation Aligns |
|-----------|---------------------------|
| **20% effort, 80% value** | ~1,265 lines enables full gating + redemption + tests |
| **No code bloat** | Reuses existing JSONB settings pattern |
| **Max 500 lines/module** | Largest component ~450 lines (TemplateSelector) |
| **Simplicity** | Single redemption flow, no complex pricing UI |
| **Low cognitive load** | Clear lock icons, simple modal, one input field |
| **Architecture flexibility** | JSONB allows adding plan types without migrations |
| **Technical debt reduction** | FamilySettings reduced from ~2400 to ~1800 lines |

---

## References

- [Admin Page Access Control](../decisions/20260206_admin_page_access_control.md) - Staff-only admin panel pattern
- [Gift Code Auth Flow Preservation](./20260207_gift_code_auth_flow_preservation.md) - localStorage preservation through auth flows
- [Shopify Webhook Gift Fulfillment](./20260207_shopify_webhook_gift_fulfillment.md) - Automatic fulfillment via Shopify
- [Gift Code Testing Guide](../testing/20260206_gift_code_testing_guide.md) - Comprehensive test cases
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md)
- [Chore Templates Design](../chore-templates-design.md)
- [Seasonal Templates](../milestones/20260116_seasonal-templates-implementation.md)
- [Dynamic Template Expansion](../milestones/20260117_dynamic_template_expansion.md)
- [Gift Codes Table Migration](../../sql/20260118_gift_codes.sql)
- [Technical Architecture](../architecture.md)

---

## Implementation Checklist

- [x] Phase 1: Plan Gate Helper (`lib/plan-gate.ts`)
- [x] Phase 2: Redeem API (`routes/api/gift/redeem.ts`)
- [x] Phase 3: Redeem UI (`routes/redeem.tsx`, `islands/RedeemForm.tsx`)
- [x] Phase 4: Template Gating (`islands/TemplateSelector.tsx`)
- [x] Phase 5: Plan Status Display (in TemplateSelector)
- [x] Phase 6: Code-First Validation (`routes/api/gift/validate.ts`)
- [x] Phase 7: Family Landing Page (`routes/families.tsx`)
- [x] Phase 8: Admin Panel (`routes/admin/gift-codes.tsx`, `islands/GiftCodeAdmin.tsx`)
- [x] Phase 9: Admin Security (idle timeout, logout button)
- [x] Phase 10: Redeemer Details (email + expiry in list view)
- [x] Phase 11: Auth Flow Preservation (localStorage through login/signup/OAuth)
- [x] Phase 12: Shopify Webhook Fulfillment (auto-generate + email on order)
- [x] Unit Tests (29 tests passing)
- [x] Git commit

**Core Implementation Complete: January 19, 2026**
**Admin Panel Added: February 6, 2026**
**Admin Security + Redeemer Details: February 7, 2026**
**Auth Flow Preservation: February 7, 2026**
**Shopify Webhook Fulfillment: February 7, 2026**
