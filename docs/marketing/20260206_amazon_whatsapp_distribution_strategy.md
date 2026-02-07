# Amazon + WhatsApp Distribution Strategy

**Date**: February 6, 2026
**Status**: Planning
**Category**: Distribution Channels / Growth

---

## Overview

A dual-channel distribution strategy leveraging Amazon for discovery and gifting, combined with messaging apps (WhatsApp, iMessage, SMS) for trust-based viral sharing. This approach aligns with how families actually buy and share parenting tools.

**Core Insight**: Amazon handles trust and payments; messaging handles belief and sharing.

---

## Channel Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTION STRATEGY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐       ┌─────────────────────┐        │
│   │      AMAZON         │       │     MESSAGING       │        │
│   │  Discovery + Gift   │       │   Trust + Viral     │        │
│   ├─────────────────────┤       ├─────────────────────┤        │
│   │ • Grandma/aunt gift │       │ • WhatsApp (intl)   │        │
│   │ • Search intent     │       │ • iMessage (US)     │        │
│   │ • Trust transfer    │       │ • SMS fallback      │        │
│   │ • Last-minute buys  │       │ • "This worked!"    │        │
│   └──────────┬──────────┘       └──────────┬──────────┘        │
│              │                             │                    │
│              └──────────┬──────────────────┘                    │
│                         ▼                                       │
│              ┌─────────────────────┐                           │
│              │   CHOREGAMI APP     │                           │
│              │   Redemption +      │                           │
│              │   Subscription Mgmt │                           │
│              └─────────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Channel 1: Amazon (Discovery + Gifting Engine)

### Target Personas

| Persona | Behavior | Search Terms |
|---------|----------|--------------|
| Grandparents | Gift for grandkids | "gift for grandchildren", "responsibility gift" |
| Aunts/Uncles | Last-minute gift | "kids chore chart", "parenting tools" |
| Parents | Self-purchase after research | "chore app", "kids responsibility tracker" |

**Key Insight**: The Amazon buyer (grandma) is often NOT the ChoreGami user (parent) or end user (kid). The redemption flow must account for this handoff.

### Competitive Landscape

**Current Amazon "kids chore chart" results:**
- Physical chore boards: $15-25 (dominant category)
- Magnetic responsibility charts: $20-30
- Printable chore packs: $5-10
- **Digital redemption products: Minimal competition**

**Differentiation opportunity**: Position as "the digital upgrade" for families who've outgrown physical charts.

### Option A: Physical Gift Card (Recommended Start)

**What it looks like:**
- Physical card or small envelope mailed by Amazon
- Front: "ChoreGami – Turn Chores Into a Game"
- Back: Instructions + URL + redemption code

**Why this works:**
- Physical gifts feel more "real" for parents + grandparents
- Avoids Amazon digital subscription policy headaches
- Higher perceived value than "just an app"
- Each card has a unique pre-generated code

**Psychology:**
> "I'm not buying screen time. I'm buying responsibility."

### Option B: Amazon Digital Gift Card (Future Phase)

**Considerations:**
- Amazon approval can be slow
- Fees are higher (30% vs 15%)
- Amazon is sensitive to "external subscription bypass"

**If implemented:**
- Sell as "Digital Access Pass", not "subscription"
- One-time value (e.g. "6-Month Family Pass")
- Redemption happens outside Amazon

---

## Amazon Fulfillment Reality Check

### Fulfillment Options

| Option | Pros | Cons | Cost/Unit |
|--------|------|------|-----------|
| **FBA (Fulfilled by Amazon)** | Prime badge, trust, hands-off | Inventory management, FBA fees | $3-4 + storage |
| **Merchant Fulfilled** | Lower fees, control | No Prime, slower shipping | $1-2 (self-ship) |
| **Print-on-Demand (Gelato, Printful)** | No inventory, auto-fulfill | Higher per-unit, slower | $4-6 |

**Recommendation**: Start with Merchant Fulfilled (50-100 cards) to validate demand before investing in FBA inventory.

### Card Production

| Component | Option | Cost |
|-----------|--------|------|
| Card stock | 4x6" heavy cardstock | $0.30-0.50 |
| Printing | Local print shop or Vistaprint | $0.50-1.00 |
| Envelope | Kraft envelope | $0.10-0.20 |
| Code label | Pre-printed or hand-applied | $0.10 |
| **Total per unit** | | **$1.00-1.80** |

### Code Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Pre-generate batch (e.g., 100 codes)                       │
│     GIFT-XXXX-XXXX-XXXX format                                 │
│              │                                                  │
│              ▼                                                  │
│  2. Print cards with codes                                      │
│     Store mapping: code → SKU → duration                       │
│              │                                                  │
│              ▼                                                  │
│  3. Ship to Amazon FBA or self-fulfill                         │
│     Track: code_id → amazon_order_id                           │
│              │                                                  │
│              ▼                                                  │
│  4. Customer receives, redeems                                  │
│     Mark: redeemed_at, redeemed_by_family_id                   │
│              │                                                  │
│              ▼                                                  │
│  5. Unredeemed after 12 months?                                │
│     Option: Send reminder email if we have it                  │
│     Option: Code expires, no action needed                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Returns & Refunds

| Scenario | Policy |
|----------|--------|
| Unopened return | Full refund, card back in inventory |
| Opened but unredeemed | Full refund, void the code |
| Redeemed then returned | Deny refund (code used) |
| Code "doesn't work" claim | Verify in DB, assist or refund |

**Amazon reviews risk**: "Just a piece of paper with a code" → Counter with clear listing photos showing what's included.

---

## Amazon Listing Copy Guidelines

### Approved Language

| Do Say | Don't Say |
|--------|-----------|
| "Prepaid family access" | "Subscription" |
| "No recurring charges required to redeem" | "Monthly billing" |
| "Redeem on ChoreGami app" | "Cancel anytime" |
| "Family Access Pass" | "Premium membership" |

### Sample Listing Title
```
ChoreGami Family Access Pass (6 Months) - Turn Chores Into a Game |
Kids Responsibility Tracker | No App Store Purchase Required
```

### Sample Bullet Points
```
• PREPAID ACCESS: 6 months of ChoreGami family features, no recurring charges
• GIFTABLE: Perfect for grandparents, birthdays, holidays - arrives with redemption code
• EASY REDEEM: Visit choregami.com/redeem, enter code, start organizing
• BETA-TESTED: Built with feedback from real families during our beta program
• WORKS EVERYWHERE: iOS, Android, and web browser access included
```

**Note**: "Beta-tested by real families" is verifiable. Upgrade to specific numbers (e.g., "50+ families") once you have them.

---

## Channel 2: Messaging (Trust + Viral Engine)

### Platform Strategy by Region

| Region | Primary | Secondary | Notes |
|--------|---------|-----------|-------|
| US | iMessage/SMS | Facebook Messenger | WhatsApp growing but not dominant |
| Latin America | WhatsApp | SMS | WhatsApp near-universal |
| Europe | WhatsApp | iMessage | Varies by country |
| India | WhatsApp | SMS | WhatsApp dominant |

**Implementation**: Use native share sheet which auto-detects available apps, rather than forcing WhatsApp.

### Purpose
Messaging is NOT for cold discovery. It's for:
- Family groups
- School parent groups
- Neighborhood chats
- "This actually worked for us" moments

### Trigger Moments & Prompts

| Event | When Prompt Appears | Prompt Copy |
|-------|---------------------|-------------|
| First week streak | After 7th consecutive day | "Share your win?" |
| Weekly summary | Sunday evening digest | "Send to family group?" |
| Reward unlocked | Immediately after claim | "Tell someone!" |
| 30-day milestone | After 30 active days | "Who else needs this?" |

**Prompt UI:**
```
┌─────────────────────────────────────────────┐
│                                             │
│  🔥 Emma completed 7 days in a row!         │
│                                             │
│  Share with your family group?              │
│                                             │
│  [ Share ]          [ Maybe Later ]         │
│                                             │
└─────────────────────────────────────────────┘
```

### Pre-Written Share Text

```
We started using ChoreGami and it's the first chore thing
that didn't turn into a fight.

Emma finished all her chores this week 🔥
If you want to try it, here's a free month:
👉 choregami.com/r/ABC123
```

**Key principles:**
- Lead with personal result
- Include child's name (social proof)
- End with referral link
- No corporate language
- Editable before sending

---

## Cross-Channel Synergy

### Flow 1: Amazon → Messaging

Inside the physical gift card:

```
┌─────────────────────────────────────────────┐
│                                             │
│  PARENT TIP                                 │
│  Most families share ChoreGami in their     │
│  family group chat. It's more fun together! │
│                                             │
└─────────────────────────────────────────────┘
```

**Effect:** Normalizes sharing from day one.

### Flow 2: Messaging → Amazon

In-app message for active users (show during gift-giving seasons):

```
┌─────────────────────────────────────────────┐
│                                             │
│  🎁 Grandparents love gifting ChoreGami     │
│                                             │
│  Available on Amazon - search               │
│  "ChoreGami chore chart"                    │
│                                             │
│  [ Copy Link ]    [ Dismiss ]               │
│                                             │
└─────────────────────────────────────────────┘
```

**Timing:** Show Nov 15 - Dec 20, and 2 weeks before Mother's/Father's Day.

---

## Redemption UX (Critical Path)

### Requirements
- **Frictionless** - Dies if complicated
- **No credit card** on redemption
- **Instant value** confirmation
- **Works for non-tech-savvy grandma buyers**

### Ideal Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDEMPTION FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Open link (or scan QR on card)                             │
│     choregami.com/redeem                                        │
│              │                                                  │
│              ▼                                                  │
│  2. Enter code                                                  │
│     ┌─────────────────────────────┐                            │
│     │  GIFT-ABCD-EFGH-1234        │                            │
│     └─────────────────────────────┘                            │
│              │                                                  │
│              ▼                                                  │
│  3. Create family (or login)                                    │
│     • Email                                                     │
│     • Family name                                               │
│     • No credit card required                                   │
│              │                                                  │
│              ▼                                                  │
│  4. Instant confirmation                                        │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  🎉 Your family has 6 months of ChoreGami!          │    │
│     │                                                     │    │
│     │  Valid until: August 6, 2026                        │    │
│     │                                                     │    │
│     │  [ Get Started ]                                    │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Code already redeemed | "This code has been used. Contact support if unexpected." |
| Code expired | "This code has expired." (No expiry for MVP) |
| User already has active plan | Extend existing plan, show new expiry |
| Typo in code | Fuzzy match + "Did you mean GIFT-ABCD-EFGH-1234?" |

---

## Pricing Strategy

### Amazon SKUs

| SKU | Duration | Amazon Price | Direct Price | Notes |
|-----|----------|--------------|--------------|-------|
| Basic | 3 months | $29.99 | $29.99 | Entry point |
| **Popular** | 6 months | $49.99 | $49.99 | Best seller, MVP test |
| Premium | 12 months | $79.99 | $79.99 | Holiday gift |

### Realistic Margin Analysis

| Component | 6-Month Amazon Physical | 6-Month Direct |
|-----------|-------------------------|----------------|
| Sale price | $49.99 | $49.99 |
| Amazon referral fee (15%) | -$7.50 | - |
| Amazon per-item fee | -$0.99 | - |
| FBA fulfillment (est.) | -$3.50 | - |
| Card + packaging | -$1.50 | - |
| Stripe fees (3.5%) | - | -$1.75 |
| **Net revenue** | **$36.50** | **$48.24** |
| **Channel cost** | **27%** | **3.5%** |

**Decision**: Amazon is a customer acquisition channel, not a profit center. Acceptable if it brings users who wouldn't find you otherwise.

---

## Seasonal Timing

| Season | Timing | Strategy |
|--------|--------|----------|
| **Back-to-School** | July-August | Best launch window. "New school year, new habits" |
| **Holiday** | Nov-Dec | Gift focus. Brutal competition. Need early listing. |
| **New Year** | January | "Resolution" angle. Parents motivated. |
| **Summer** | May-June | "Summer structure" for kids home from school |

**Recommendation**: Launch MVP in **July** for back-to-school, iterate before holiday rush.

### Amazon Timeline

| Milestone | Lead Time |
|-----------|-----------|
| Seller Central account approval | 1-2 weeks |
| Listing approval | 1-2 weeks |
| FBA inventory receipt | 1-2 weeks |
| **Total to live** | **4-6 weeks** |

---

## Fallback Plans

### If Amazon Rejects Listing

| Alternative | Pros | Cons |
|-------------|------|------|
| **Etsy** | Gift-friendly audience, lower fees | Smaller reach |
| **Direct "Gift a Family" feature** | Full margin, no approval | No discovery |
| **Partner with parenting blogs** | Trusted audience | Affiliate complexity |
| **Shopify standalone store** | Full control | No built-in traffic |

### If Physical Cards Don't Sell

1. Test digital-only on Etsy (instant delivery)
2. Add "Email a Gift" feature in-app
3. Pivot to influencer partnerships with promo codes

---

## Minimum Viable Test

### Scope
- **1 SKU**: 6-month pass ($49.99)
- **100 cards**: Pre-printed, merchant fulfilled
- **30-day window**: Measure redemption + reviews
- **Budget**: ~$200 (cards + Amazon fees)

### Go/No-Go Criteria

| Metric | Go | No-Go |
|--------|----|----|
| Units sold | >10 | <5 |
| Redemption rate | >70% | <50% |
| Review rating | >4.0 | <3.5 |
| Customer support tickets | <20% of orders | >30% |

### What We Learn

1. Is there search demand for "chore app gift"?
2. Do buyers understand "code redemption" model?
3. What questions/complaints arise?
4. What's the buyer → redeemer handoff friction?

---

## Success Metrics (Post-MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Amazon conversion rate | >3% | Orders / Listing views |
| Redemption completion | >80% | Redeemed / Purchased |
| Time to redeem | <7 days | Median days from purchase |
| Messaging share rate | >10% | Shares / Active users (30d) |
| Share → signup rate | >20% | Signups / Referral link clicks |

---

## Risk Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Amazon policy rejection | Medium | High | Use "Access Pass" language, have Etsy backup |
| Low Amazon conversion | Medium | Medium | Focus on gift keywords, seasonal timing |
| Redemption friction | Medium | High | A/B test flow, add QR code to cards |
| "Just a code" negative reviews | High | Medium | Clear listing photos, manage expectations |
| Code theft/sharing | Low | Low | One-time use codes, track redemption |

---

## Implementation Phases

### Phase 1: Foundation (2 weeks)
- [x] Gift code redemption flow (`/redeem` route) - exists
- [x] Gift code generation system - exists
- [ ] QR code on redemption page
- [ ] Native share sheet integration (not WhatsApp-specific)

### Phase 2: Amazon MVP Test (4 weeks)
- [ ] Amazon Seller Central account
- [ ] Design and print 100 cards
- [ ] Create listing with photos
- [ ] Merchant fulfill first 50 orders
- [ ] Collect data, iterate

### Phase 3: Scale Decision (After 30-day test)
- [ ] Go: Move to FBA, add 3mo + 12mo SKUs
- [ ] No-Go: Pivot to alternatives (Etsy, direct gifting)

### Phase 4: Cross-Channel (If Go)
- [ ] Amazon → messaging prompts in packaging
- [ ] Messaging → Amazon prompts in app (seasonal)
- [ ] Attribution tracking across channels

---

## Open Questions

1. **Legal**: Do we need any disclaimers for prepaid access passes?
2. **Accounting**: How do we recognize revenue for unredeemed codes?
3. **Support**: Who handles "my code doesn't work" Amazon messages?
4. **Inventory**: How many codes to pre-generate? (Start with 200?)

---

## Infrastructure Already Built

### Share System (Ready to Deploy)
- ✅ In-app share menu ("Share ChoreGami")
- ✅ Referral page with copy buttons (`/r/XXXXXX`)
- ✅ Email referral system (automated invite emails)
- ✅ Gift code redemption flow (`/redeem`)

**Key insight**: The WhatsApp/messaging strategy isn't aspirational — infrastructure exists.

---

## Critical Messaging Gap Analysis

### Issue #1: Landing Page Undersells Emotional Value

| Strategy Doc Says | Landing Page Says |
|-------------------|-------------------|
| "Stop the nagging" | "Household tasks. Sorted." |
| "Turn chores into a game" | "Chores rotate automatically" |
| "Build responsibility" | Generic productivity language |

**Fix**: Use Amazon copy as the landing hero: "Stop the Daily Chore Battles"

### Issue #2: Points System is Invisible

The demo shows "Emma 125 pts" but there's **zero explanation** of:
- What points do
- How kids earn them
- Why parents should care

**This kills Amazon conversion** — buyers need proof kids will be motivated.

**Fix**: Add below demo:
> Kids earn points for completing chores. Use points for rewards you choose — screen time, allowance, or special privileges.

### Issue #3: Persona Dilution

| Landing Page | Amazon Reality |
|--------------|----------------|
| Families (33%) | Families with kids 6-16 (90%+) |
| Roommates (33%) | N/A for gifts |
| Solo (33%) | N/A for gifts |

**Problem**: Grandma sees "Roommates" and thinks "this isn't for families."

**Fix**: Create URL-based variants:
- `choregami.fly.dev/landing` → Current (3 personas)
- `choregami.fly.dev/families` → Family-focused (Amazon traffic)
- `choregami.fly.dev/redeem` → Gift redemption (no personas)

---

## Family-Focused Landing Variant

### Hero Section
```
STOP THE DAILY CHORE BATTLES

ChoreGami turns "Did you do it yet?" into automatic routines
your kids actually follow — without nagging, without fights.

[Start Free Trial]
15 days free · No credit card required

✅ Built by parents, for families with kids 6-16
```

### "Sound Familiar?" Section (Before How It Works)
```
😤 You're tired of repeating yourself
"Take out the trash." "Did you feed the dog?" Same arguments. Every. Single. Day.

😔 Your kids say chores aren't fair
"Why do I always have to do dishes?" The complaints never stop.

🎯 Nothing else has worked
Paper charts fall off the fridge. Apps are too complicated. You need something that sticks.

What if chores just... happened? Without the drama?
```

### Points Explanation (After Demo)
```
WHY POINTS WORK

Kids love seeing their score go up. Parents love having a clear record
of who's doing what. Everyone knows the system is fair — because it is.
```

### FAQ Section (Critical for Amazon Buyers)

| Question | Answer |
|----------|--------|
| How is this different from a chore chart? | Rotates automatically, tracks points over time, no markers or magnets |
| Will my kids actually use this? | Kids love earning points and streaks. Parents love not tracking manually. |
| What if we don't like it? | 15 days free, no credit card. Gift cards have 30-day money-back guarantee. |
| Do I need to download an app? | Works in any browser. Add to home screen optionally. |
| I have a gift card. How do I use it? | Go to choregami.fly.dev/redeem, enter code, done. |

### Final CTA
```
READY TO STOP THE CHORE BATTLES?

Join families who've turned chore time from chaos into calm.

[Start Free Trial]          [Have a gift code? Redeem here →]
```

---

## WhatsApp/Messaging Share Copy Variants

### Version A: Social Proof
```
We've been using ChoreGami for 7 days straight and the kids
actually do their chores now. Wild, I know.

If you want to try it: choregami.fly.dev/r/[CODE]
(If you join, we both get 1 free month 🎉)
```

### Version B: Problem/Solution
```
Found an app that finally stopped the "did you do your chores?" arguments.

It's called ChoreGami — automatically rotates chores, kids earn points,
no more fighting about whose turn it is.

Free trial here: choregami.fly.dev/r/[CODE]
```

### Version C: Gift Angle (Post-Amazon Launch)
```
My mom got us a ChoreGami gift card and it's honestly the most
useful gift we've gotten in years.

Chores are rotating automatically, kids know what to do, no more fights.

You can find it on Amazon or try it free: choregami.fly.dev/r/[CODE]
```

---

## Revised Action Priority List

### Must Do (Launch Blockers)
- [ ] Add points explanation to landing page demo section
- [ ] Create `/families` landing variant for Amazon traffic
- [ ] Test redemption flow end-to-end with real codes
- [ ] Verify Amazon allows prepaid access model (get written confirmation)

### Should Do (Conversion Optimization)
- [ ] A/B test emotional hero ("Stop the Daily Chore Battles") vs current
- [ ] Add share prompts at key moments (7-day streak, reward unlock)
- [ ] Create 2-3 gift card design mockups before printing
- [ ] Set up Amazon Seller Central account

### Nice to Have (Momentum Builders)
- [ ] Record video testimonial from beta family
- [ ] Create Amazon product images with text overlays
- [ ] Draft customer support responses for gift card questions
- [ ] SEO optimize `/families` for "family chore app" keywords

---

## Next Priority Decision

Given infrastructure already built, recommended order:

1. **Option C first**: Map complete Amazon → Redeem → First Chore flow UX
2. Then: Implement `/families` landing page
3. Then: Design physical gift card
4. Finally: Write Amazon Seller Central listing

Rationale: Nail the end-to-end experience before spending money on cards or Amazon fees.

---

## Related Documents

- [Distribution Launch Execution Plan](./20260206_distribution_launch_execution.md) - Phased launch sequence and infrastructure gaps
- [Referral Share Feature](../planned/20260130_referral_share_feature.md)
- [Gift Codes Implementation](../../sql/20260118_gift_codes.sql)
- [Social Ad Copy Strategy](./20260202_social_ad_copy_platform_strategy.md)

---

**Author**: Marketing Strategy
**Created**: February 6, 2026
**Updated**: February 6, 2026
**Status**: Planning → Ready for MVP Test
