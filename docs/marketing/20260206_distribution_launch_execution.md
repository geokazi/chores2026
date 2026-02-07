# Distribution Launch Execution Plan

**Date**: February 6, 2026
**Status**: Planning
**Category**: Launch Execution
**Related**: [Amazon + WhatsApp Distribution Strategy](./20260206_amazon_whatsapp_distribution_strategy.md)

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
- ✅ Pricing tiers: $29.99/3mo, $49.99/6mo, $79.99/12mo
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
1. Set up Shopify store with 3 SKUs ($29.99, $49.99, $79.99)
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

## Critical Infrastructure Gaps

### Gap 1: Code Generation System

**Status**: ⚠️ Needs verification

**Requirements:**
- Secure random code generator
- Database tracking: code, status (unused/redeemed), SKU (3/6/12 month), creation date
- Redemption API endpoint
- Admin panel to view/invalidate codes

**Current state**: Gift codes table exists (`gift_codes`). Verify:
- [ ] Can generate codes programmatically
- [ ] Can bulk-generate for Shopify inventory
- [ ] Admin can view/revoke codes

---

### Gap 2: Fulfillment Process

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

**Author**: Marketing Strategy
**Created**: February 6, 2026
**Status**: Ready for Execution
