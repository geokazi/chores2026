# Distribution Launch Execution Plan

**Date**: February 6, 2026
**Updated**: February 7, 2026 (Competitive pricing)
**Status**: ✅ Ready to Execute
**Category**: Launch Execution
**Related**: [Amazon + WhatsApp Distribution Strategy](./20260206_amazon_whatsapp_distribution_strategy.md)

---

## 🚨 REALITY CHECK: YOU'RE 1 DAY FROM REVENUE

**Everything is built.** This is not a planning document anymore — it's an execution checklist.

You have:
- ✅ Full redemption flow (backend + frontend)
- ✅ `/families` landing page (already live)
- ✅ Code generation SQL function (just needs execution)
- ✅ Admin panel for code management (`/admin/gift-codes`)
- ✅ Stripe checkout with gift code support
- ✅ Plan extension logic (doesn't override existing plans)
- ✅ Code-first validation (no login required to check codes)

**You don't need more strategy. You need execution momentum.**

---

## Overview

This document covers the **execution sequence** for launching gift card distribution channels. It complements the strategy document with tactical decisions, infrastructure requirements, and phased timelines.

**Key Insight**: Don't wait for Amazon approval to start selling. Validate with Shopify first.

---

## Strategic Coherence Check

All strategy documents align:

| Element | Channel Strategy | Redemption Flow | Distribution |
|---------|-----------------|-----------------|--------------|
| Primary channel | Amazon gift cards | Optimized for Amazon | Amazon Tier 1 |
| Backup channels | WhatsApp sharing | N/A | Shopify/Etsy/Pinterest |
| Code-first flow | Implied | Explicit | Assumed |
| Gift psychology | Core insight | Implemented | Leveraged |
| Viral loop | WhatsApp referrals | "Invite family" CTA | Built-in share page |

**No conflicts** — documents are internally consistent.

---

## Complete Arsenal (What Exists)

### 1. Channel Strategy
- ✅ Amazon as primary gifting engine
- ✅ WhatsApp/messaging as viral loop
- ✅ Prepaid access positioning (not "subscription")
- ✅ Pricing tiers: $4.99/1mo, $14.99/3mo, $24.99/6mo, $39.99/12mo (competitive Feb 2026)
- ✅ Complete Amazon listing copy (multiple variants)

### 2. Redemption Infrastructure
- ✅ Code-first validation (no login required)
- ✅ Gift code redemption flow (`/redeem`)
- ✅ Gift codes table in database
- ✅ Plan extension logic

### 3. Sharing Infrastructure
- ✅ In-app share menu
- ✅ Referral page with copy buttons (`/r/XXXXXX`)
- ✅ Email referral system
- ✅ Referral tracking

### 4. Admin Infrastructure (NEW - Feb 6, 2026)
- ✅ Admin panel at `/admin/gift-codes`
- ✅ Batch code generation (1-100 codes at a time)
- ✅ View pending/redeemed codes
- ✅ Financial dashboard (revenue by plan type)
- ✅ Staff email validation (`lib/auth/staff.ts`)

---

## 🔥 IMMEDIATE EXECUTION PLAN

### TODAY (3 Hours Total)

#### Hour 1: Generate Codes

**Option A: Use Admin Panel (Recommended)**

1. Go to `choregami.app/admin/gift-codes`
2. Login with staff email (`@choregami.com`, `@choregami.app`, or `@probuild365.com`)
3. Generate codes:
   - 20x Half Year (`school_year`)
   - 15x Summer (`summer`)
   - 15x Full Year (`full_year`)
4. Copy codes to Google Sheets with columns: `code | plan_type | status`

**Option B: SQL Direct (Alternative)**

```sql
-- Get your admin UUID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Generate 50 codes
SELECT create_gift_code('school_year', 'YOUR-UUID', 'Shopify Launch Batch 1')
FROM generate_series(1, 20);

SELECT create_gift_code('summer', 'YOUR-UUID', 'Shopify Launch Batch 1')
FROM generate_series(1, 15);

SELECT create_gift_code('full_year', 'YOUR-UUID', 'Shopify Launch Batch 1')
FROM generate_series(1, 15);

-- Export for manual fulfillment
SELECT code, plan_type, created_at
FROM gift_codes
WHERE redeemed_by IS NULL
ORDER BY plan_type, created_at;
```

---

#### Hour 2: Test Your Own System

1. Visit `choregami.app/redeem`
2. Grab a `summer` code from your spreadsheet
3. Enter code → verify validation works (should show "Code Valid!" without login)
4. Login with test account
5. Check that plan shows as active in header badge
6. Mark code as "tested" in spreadsheet

**If anything breaks:** Fix it now before selling.

---

#### Hour 3: Shopify Store Setup

**Step 1:** Shopify trial signup (5 min)
- Go to shopify.com
- Start 14-day trial
- Name: "ChoreGami" or "ChoreGami Family"

**Step 2:** Create products (20 min each)

**Product 0: Monthly Trial** (NEW)
```
Title: ChoreGami Monthly Trial (1 Month)
Price: $4.99
Badge: "Try It - Less Than a Latte"
Type: Digital product
Description: Perfect for families who want to try before committing.
```

**Product 1: Summer Pass**
```
Title: ChoreGami Summer Family Pass (3 Months)
Price: $14.99
Type: Digital product
Description: [Use Version A from Amazon docs]

Under "Digital delivery":
Select: "This is a digital product"
Delivery method: Manual (you'll email the code)

Product image: [Use your ChoreGami logo or create simple card graphic]
```

**Product 2: Half Year Pass**
```
Title: ChoreGami Half Year Family Pass (6 Months)
Price: $24.99
Badge: "MOST POPULAR - Only $4.17/mo"
[Same setup as above]
```

**Product 3: Full Year Pass**
```
Title: ChoreGami Full Year Family Pass (12 Months)
Price: $39.99
Badge: "BEST VALUE - Only $3.33/mo"
[Same setup as above]
```

**Step 3:** Configure checkout (10 min)
- Go to Settings → Checkout
- Enable "Email" as required field
- Add custom note: "Digital codes sent within 24 hours"

**Step 4:** Set up order notifications (5 min)
- Settings → Notifications
- Enable "Order confirmation" email to yourself
- This is how you'll know when to send codes

---

### TOMORROW: First Sale

**Manual Fulfillment Process:**

1. Get Shopify order notification email
2. Open your codes spreadsheet
3. Find unused code for the SKU purchased (summer/school_year/full_year)
4. Mark it as "sold to [customer email]" in spreadsheet
5. Send this email:

**Email Template:**
```
Subject: Your ChoreGami Family Access Code

Hi [Name],

Thanks for purchasing ChoreGami! Here's your family access code:

━━━━━━━━━━━━━━━━━━━━
Your Gift Code: [CODE]
━━━━━━━━━━━━━━━━━━━━

To get started:
1. Visit: choregami.app/redeem
2. Enter your code above
3. Create your family account (or login if you have one)
4. Start organizing chores!

Your [6-month] access is now active, plus you get a 15-day free trial to test everything out.

Need help? Just reply to this email.

—
ChoreGami Team
Built with ❤️ for busy families
```

6. Update spreadsheet: change status to "fulfilled [date]"
7. (Optional) Check admin panel to verify code was redeemed

---

### THIS WEEK: Marketing

**Day 2-3: Soft Launch**
- Post in your personal WhatsApp/social: "I built ChoreGami to help families stop fighting about chores. It's finally ready. If you want to try it, here's the link."
- Share Shopify store link (not just app link)
- Target: 3-5 sales from warm network

**Day 4-5: Pinterest Setup**
- Create 5 pins in Canva:
  - "How We Stopped Nagging About Chores"
  - "The Chore Chart That Actually Works"
  - "Family Organization Made Simple"
  - "Teaching Kids Responsibility Without Fighting"
  - "Digital Chore System for Busy Parents"
- All link to `choregami.app/families` with CTA to Shopify
- Don't expect conversions yet — this is planting seeds

**Day 6-7: Etsy Prep**
- Design simple 1-page printable chore chart in Canva
- Export as PDF
- Create Etsy listing: "Digital Chore Chart + Family Management App Access"
- Bundle: Printable PDF + gift code in email
- Price same as Shopify

---

### WEEK 2: Amazon Parallel Track

While Shopify/Etsy run, start Amazon process:

| Day | Action |
|-----|--------|
| Monday | Apply for Amazon Professional Seller account ($39.99/month) |
| Tue-Wed | While waiting for approval, draft Amazon listing using Version A copy |
| Thu-Fri | Apply for Amazon Gift Card program (needs: business info, bank details, sales history) |

**Timeline:** 2-4 weeks for seller approval, then 2-4 weeks for gift card approval

Include your Shopify sales data in application to strengthen it.

---

## ❌ What NOT To Do

| Don't | Why |
|-------|-----|
| ~~Build more admin features~~ | Admin panel already exists, SQL works for edge cases |
| ~~Build Shopify webhooks~~ | Manual fulfillment validates the model first |
| ~~Design physical cards~~ | Wait for Amazon approval |
| ~~Hire Shopify dev~~ | You don't need automation yet |
| ~~Spend on ads~~ | Organic + Pinterest first |

---

## 📊 Realistic Revenue Projections

### Month 1 (Manual Shopify + Etsy)
- 10-20 sales from warm network
- 5-10 sales from Pinterest (if you post 20+ pins)
- 2-5 sales from Etsy organic
- **Total: 17-35 sales = $500-$1,500 revenue**

### Month 2-3 (With Pinterest Momentum)
- 20-40 sales/month as pins spread
- **Revenue: $1,000-$2,000/month**

### Month 4-6 (If Amazon Approves)
- Amazon adds 50-200 sales/month
- **Revenue: $3,000-$10,000/month**

These aren't guaranteed, but they're realistic for a product this well-positioned.

---

## Distribution Channel Tiers

| Tier | Channel | Why | Risk | Timeline |
|------|---------|-----|------|----------|
| **1** | **Shopify** | Full control, instant setup, zero approval | None | 1 week |
| **1** | **Amazon** | Massive reach, gift-buyer trust | Slow approval | 6-12 weeks |
| **2** | **Etsy** | Homeschool/routine audience, digital bundles | Niche | 2 weeks |
| **3** | **Pinterest** | High-intent parent traffic, low cost | Traffic only | Ongoing |
| **4** | **Direct WhatsApp** | Peer-to-peer sales | Manual | Immediate |
| **Avoid** | App Store / Google Play | 30% cut, subscription friction | N/A | N/A |
| **Avoid** | Meta Shops | Policy complexity | N/A | N/A |

---

## Recommended Launch Sequence

### Phase 1: Validate Demand (Week 1-2)

**Channel**: Shopify
**Why**: Zero approval risk, full control, instant setup
**Goal**: Sell 10-20 gift codes to validate copy/pricing

**Action items:**
1. Set up Shopify store with 4 SKUs ($4.99, $14.99, $24.99, $39.99)
2. Use Version A copy from Amazon strategy doc
3. Auto-email codes via Shopify webhooks
4. Test redemption flow end-to-end

**Success metric**: 10+ purchases with <5% refund rate

---

### Phase 2: Scale Traffic (Week 3-4)

**Channel**: Pinterest → Shopify
**Why**: High-intent parent traffic, low cost

**Action items:**
1. Create 10 Pinterest pins ("printable chore chart" aesthetic)
2. Link to `/families` landing page
3. CTA to Shopify gift card purchase
4. Track Pinterest → Purchase conversion

**Success metric**: 3%+ click-to-purchase rate

---

### Phase 3: Amazon Submission (Month 2)

**Channel**: Amazon physical gift cards
**Why**: Massive reach, but slow approval

**Action items:**
1. Apply to Amazon gift card program with Shopify traction data
2. Design physical cards (use Version A copy)
3. Submit product listing
4. Pre-order 500 cards for fulfillment

**Timeline**: 4-8 weeks for approval

**Leverage**: "We've already sold 100+ gift codes" strengthens application

---

### Phase 4: Etsy Experiment (Concurrent)

**Channel**: Etsy digital bundle
**Why**: Different customer profile (homeschool, routine-focused)

**Action items:**
1. Create "printable + digital access" bundle
2. Design 1-page PDF printable chore chart
3. Include digital code in download
4. Optimize for "chore chart printable" searches

**Success metric**: Organic sales within 30 days

---

## Infrastructure Status (Updated Feb 6, 2026)

### ✅ Code Generation System — COMPLETE

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Secure random code generator | ✅ | `create_gift_code()` SQL function |
| Database tracking | ✅ | `gift_codes` table with status, plan_type, redeemed_by |
| Redemption API | ✅ | `/api/gift/redeem` + `/api/gift/validate` |
| Admin panel | ✅ | `/admin/gift-codes` with generate/view/stats |
| Bulk generation | ✅ | Admin panel supports 1-100 codes at a time |

**Files:**
- `routes/admin/gift-codes.tsx` - Admin page
- `islands/GiftCodeAdmin.tsx` - Interactive UI
- `routes/api/admin/gift-codes/generate.ts` - Batch generation API
- `routes/api/admin/gift-codes/list.ts` - Code listing API
- `routes/api/admin/gift-codes/stats.ts` - Financial stats API
- `lib/auth/staff.ts` - Staff email validation

---

### ✅ Fulfillment Process — MANUAL (By Design)

**Question**: How do codes get from system to buyers?

| Option | Pros | Cons | When to Use |
|--------|------|------|-------------|
| **Shopify auto-email** | Scalable, instant | Requires webhook setup | 50+ sales |
| **Manual fulfillment** | Zero setup | Time-consuming | Validation phase |

**Recommendation**: Start manual, automate at 50+ sales

**Manual process:**
1. Pre-generate 100 codes in database
2. Mark as `sku: '6_month'`, `status: 'available'`
3. On Shopify sale notification → manually email code
4. Mark code as `status: 'sold'`, `sold_at: now()`

---

### Gap 3: Amazon Seller Account

**Question**: Do you have an active Amazon seller account?

| Account Type | Setup Time | Monthly Fee | Notes |
|--------------|------------|-------------|-------|
| Individual | 1 week | $0 + $0.99/item | Limited features |
| Professional | 2-4 weeks | $39.99/mo | Required for gift cards |
| Gift card approval | +2-4 weeks | N/A | Additional review |

**Recommendation**: Apply for Professional Seller account NOW while building Shopify. Timelines overlap.

---

### Gap 4: Printable Design (Etsy)

**Question**: Do you have a designed PDF printable?

**Why it matters:**
- Etsy requires a deliverable file
- "Digital access code" alone won't rank
- Bundling physical + digital increases perceived value

**Recommendation**: Design one A4/Letter printable chart in Figma → export PDF → bundle with code

**Simple version:**
```
┌─────────────────────────────────────────────┐
│           CHOREGAMI CHORE CHART             │
│                                             │
│  Name: _____________    Week of: ________   │
│                                             │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  │     │     │     │     │     │     │     │
│  │     │     │     │     │     │     │     │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘
│                                             │
│  🎮 UPGRADE TO DIGITAL: choregami.fly.dev   │
│     Your code: GIFT-XXXX-XXXX-XXXX          │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Gap 5: WhatsApp Pre-Written Messages

**Question**: Are share messages pre-populated in `/share` page?

**Current state:**
- ✅ Referral URL with code
- ✅ "Copy" and "Share" buttons
- ⚠️ Pre-written message text?

**Recommendation**: Add click-to-copy message on share page:
```
We've been using ChoreGami for a week and the kids actually
do their chores now 🎉

Try it free: https://choregami.fly.dev/r/[CODE]
(If you join, we both get 1 free month!)
```

---

## Immediate Next Actions

### Option A: Fast Revenue Validation (Recommended First)

| Day | Action |
|-----|--------|
| 1 | Verify code generation works, pre-generate 50 codes |
| 2 | Set up basic Shopify store (3 SKUs) |
| 3 | Create product images + descriptions |
| 4 | Test purchase → manual email → redemption flow |
| 5 | Go live, announce to beta families |

**Timeline**: 3-5 days
**Risk**: Low
**Outcome**: Proof of concept + revenue

---

### Option B: Amazon Application (Parallel)

| Week | Action |
|------|--------|
| 1 | Apply for Amazon Professional Seller account |
| 2 | Draft product listing while waiting |
| 3-4 | Design physical card mockups |
| 5-8 | Request gift card category approval |
| 8-12 | Submit listing, await approval |

**Timeline**: 6-12 weeks total
**Risk**: Approval uncertainty
**Outcome**: Access to massive channel (if approved)

---

### Option C: Distribution Diversification (After Option A)

| Week | Action |
|------|--------|
| 1-2 | Shopify live (from Option A) |
| 3 | Design Etsy printable bundle |
| 4 | Launch Etsy listing |
| 4+ | Create Pinterest pins, drive traffic |

**Timeline**: 2-4 weeks
**Risk**: Split focus
**Outcome**: Multiple revenue streams

---

## Recommended Execution Order

```
Week 1-2:  [====== SHOPIFY VALIDATION ======]
                    ↓
Week 2:    [== AMAZON APPLICATION STARTS ==]───────────────────┐
                    ↓                                          │
Week 3-4:  [====== ETSY + PINTEREST ======]                    │
                    ↓                                          │
Week 5-8:  [== ITERATE BASED ON DATA ==]                       │
                                                               │
Week 8-12:                              [== AMAZON APPROVAL ==]↓
                                                               ↓
Month 3:   [============ AMAZON LIVE ============]
```

**Key insight**: You're 30 days from revenue via Shopify while Amazon runs in parallel.

---

## Success Metrics by Phase

| Phase | Metric | Target | Go/No-Go |
|-------|--------|--------|----------|
| Shopify validation | Units sold | >10 in 2 weeks | <5 = pivot messaging |
| Shopify validation | Redemption rate | >80% | <60% = fix UX |
| Pinterest | Click-to-purchase | >3% | <1% = test new pins |
| Etsy | Organic sales | >5 in 30 days | 0 = delist |
| Amazon | Approval | Yes/No | No = Shopify primary |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Amazon rejects listing | Shopify + Etsy already generating revenue |
| Low Shopify conversion | A/B test copy, try different price point |
| Code fulfillment bottleneck | Automate at 50 sales threshold |
| Etsy buried in search | Pinterest drives direct traffic |

---

## Open Questions

1. **Shopify**: Free plan or paid? (Free has transaction fees but no monthly)
2. **Payment processor**: Shopify Payments vs Stripe direct?
3. **Code inventory**: How many to pre-generate? (Suggest: 100 to start)
4. **Physical cards**: Print locally or use print-on-demand service?
5. **Beta announcement**: Email list? In-app banner? Both?

---

## Related Documents

- [Amazon + WhatsApp Distribution Strategy](./20260206_amazon_whatsapp_distribution_strategy.md) - Channel strategy and messaging
- [Social Ad Copy Strategy](./20260202_social_ad_copy_platform_strategy.md) - Ad creative
- [Referral Share Feature](../planned/20260130_referral_share_feature.md) - Viral mechanics

---

---

## 🎯 Final Recommendation

**Stop planning. Start selling.**

### Your Next 24 Hours:
1. ✅ Generate 50 codes (admin panel or SQL)
2. ✅ Test redemption flow yourself
3. ✅ Set up Shopify store
4. ✅ Share store link with 5 friends

### By Friday:
- First 3 sales processed manually
- Redemption flow proven with real customers

### By End of Month:
- 15+ sales
- Pinterest traffic starting
- Etsy listing live
- Amazon application submitted

---

## 🏆 Why You're Ready

You've done something rare: **you built the entire moat before launching.**

Most founders launch with broken redemption flows, no landing page variants, no share mechanics, and wonder why gift cards don't work.

You have:
- ✅ World-class redemption UX (code-first, no login friction)
- ✅ Family-optimized landing page (`/families`)
- ✅ Built-in viral loop (`/share`)
- ✅ Multiple distribution channels ready
- ✅ Prepaid economics that work
- ✅ Admin panel for operations

**The only risk now is overthinking instead of shipping.**

---

**Author**: Marketing Strategy
**Created**: February 6, 2026
**Updated**: February 6, 2026 (Admin panel + execution plan added)
**Status**: ✅ EXECUTE NOW
