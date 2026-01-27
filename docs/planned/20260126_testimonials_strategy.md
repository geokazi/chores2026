# Testimonials & Social Proof Strategy

**Document Created**: January 26, 2026
**Status**: 📋 **PLANNED**
**Effort**: ~7 hours total (phased over 5 weeks)

## Core Principle

> **Collect reviews before building infrastructure to display them.**

The bottleneck is getting users to write reviews, not displaying them.

> **Terminology: "Reviews" publicly, not "testimonials".**
> For new entrants, "reviews" signals honesty; "testimonials" signals marketing control.
> Internally we curate with testimonial energy, but externally we call them reviews.

---

## Strategy: Stage-Appropriate Approach

| Phase | When | Effort | Action |
|-------|------|--------|--------|
| **-1. Beta** | Now | 30 min | Collect 3 testimonials from beta testers (Google Form) |
| **0. Validate** | Week 1 | 1 hr | Email 10 users, ask for Trustpilot review |
| **1. Platform** | Week 2 | 2 hrs | Set up Trustpilot + Google My Business |
| **2. Prompt** | Week 3 | 3 hrs | Add review prompt to weekly digest email |
| **3. Display** | Week 5 | 1 hr | Static reviews JSON on landing page |
| **4. Self-host** | Month 3+ | 6 hrs | Only if 25+ third-party reviews exist |

**Decision gates**:
- Don't proceed to Phase 0 until you have 3+ testimonials
- Don't proceed to Phase 3 until you have 5+ reviews

---

## Phase -1: Beta Collection (NOW)

> **Reality check**: If you have <20 active users, skip everything else. Do this first.

**Goal**: Get 3 real testimonials from beta testers to use on landing page.

### Step 1: One-Tap Email (5 min)

Send to your 5-10 beta testers:

```
Subject: Quick favor - one question about ChoreGami

Hi [Name],

What's the ONE thing ChoreGami has changed for your family?

→ https://forms.gle/[your-form]

Takes 10 seconds. Thanks for being an early believer!

— GK
```

**Use Google Forms** (not custom code):
- Question: "What has ChoreGami changed for your family?"
- Options: Less nagging / Kids motivated / More free time / Other
- Follow-up: "Tell us more (optional)" [text box]

### Step 2: Follow Up for Expansion (Same Week)

To those who responded:

```
Subject: Can you tell me more?

Thanks for clicking [Less Nagging]!

Would you expand in 1-2 sentences? Something like:
"Before ChoreGami, I was nagging constantly. Now..."

I'd love to feature your story as a "Founding Family"
when we launch. You'll get 3 months free too.

Just reply to this email!

— GK
```

**Expected results**: 3-4 testimonials from 5 beta testers (60-80% response)

### Step 3: Use on Landing Page

```
┌─────────────────────────────────────────────────────────────┐
│               LOVED BY FOUNDING FAMILIES                    │
│                                                             │
│  "My kids actually   "Weekly digest    "No more morning    │
│   ASK to do chores!"  helps me stay     battles!"          │
│   — Sarah M.          on top."          — Mike T.          │
│   Founding Family     — The Johnsons    Founding Family    │
│                       Founding Family                       │
│                                                             │
│           Join [X] families using ChoreGami                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key rules**:
- "Founding Family" label = honest + aspirational
- Show real user count (even if small)
- No star ratings until you have 10+ reviews
- No "help us get to 50" progress bars (reveals small scale)

### Don't Build Yet

At this stage, **don't**:
- ❌ Build custom feedback forms
- ❌ Set up Trustpilot (wait for public launch)
- ❌ Show review counts publicly
- ❌ Create "Founding Member" badges (just use the label)

**Google Forms → Email follow-up → Manual curation. That's it.**

---

---

## Phase 0: Validate Demand (Week 1)

**Goal**: Confirm users will actually write reviews.

**Actions**:
1. Identify 10 most active families (highest chore completions)
2. Send personal email asking for Trustpilot review
3. Track response rate

**Success criteria**: 3+ users respond positively

**If <3 respond**: Pause this initiative, revisit in 60 days.

---

## Phase 1: Third-Party Platforms (Week 2)

**Goal**: Establish presence on credible review platforms.

**Set up**:
- [ ] Trustpilot (free tier) - primary
- [ ] Google My Business - local SEO
- [ ] Product Hunt profile - tech audience

**Why third-party first**:
- Established platforms = more credible
- SEO authority transfers to you
- No development needed
- Can embed widgets later

---

## Phase 2: Review Prompting (Week 3)

**Goal**: Systematically ask happy users for reviews.

### Smart Timing (When to Ask)

Prompt users when:
- Active 14+ days
- Family completed 50+ chores
- Weekly goal hit 3 weeks in a row
- Haven't been prompted in 60 days

Don't prompt when:
- New user (<7 days)
- Recent support ticket
- Low engagement signals

### Prompt Locations

| Location | Priority | Implementation |
|----------|----------|----------------|
| Weekly digest email | HIGH | Add CTA section |
| Settings page | MEDIUM | "Rate us" link |
| In-app soft ask | HIGH | Non-blocking banner (see below) |

### In-App Soft Ask (Non-Blocking)

**Trigger after positive moments** (not random):
- First full week completed
- First streak achieved (3+ days)
- First family goal hit
- First leaderboard win

**UX: Banner, not modal**:

```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 Looks like things are clicking!                         │
│ Want to share how ChoreGami's working for your family?     │
│ [Leave a quick review]                    [Maybe later ×]  │
└─────────────────────────────────────────────────────────────┘
```

**Rules**:
- Show max 1x per 60 days
- Dismiss = don't show for 90 days
- "Maybe later" = show again in 30 days
- Never show to users < 7 days old

### Email Template

```
Subject: Quick favor? 🙏

Hey [Parent Name],

Your family has completed [X] chores this month — that's amazing!

If ChoreGami has helped your family, would you take 30 seconds
to leave us a review on Trustpilot?

[Leave a Review →]

It helps other families find us.

Thanks!
The ChoreGami Team

P.S. Every review = $5 donated to Feeding America 🍎
```

---

## Phase 3: Static Testimonials (Week 5)

**Goal**: Display social proof on landing page.

**Prerequisite**: 10+ Trustpilot reviews collected.

### Implementation

Create static JSON file (no database):

```
static/content/testimonials.json
```

```json
{
  "source": "Trustpilot",
  "sourceUrl": "https://trustpilot.com/review/choregami.com",
  "totalReviews": 12,
  "percentFiveStars": 92,
  "featured": [
    {
      "quote": "My kids actually ASK to do chores now!",
      "author": "Sarah M.",
      "rating": 5,
      "date": "2026-01",
      "verified": true,
      "outcomes": ["kid_motivation", "less_nagging"]
    },
    {
      "quote": "The weekly digest helps me stay on top of everything.",
      "author": "The Johnson Family",
      "rating": 5,
      "date": "2026-01",
      "verified": true,
      "outcomes": ["parent_visibility", "less_micromanaging"]
    },
    {
      "quote": "Great app — would love more templates for younger kids.",
      "author": "Parent of 3",
      "rating": 4,
      "date": "2025-12",
      "verified": true,
      "outcomes": ["higher_completion"]
    }
  ]
}
```

### Enhanced Display Format

**Use percentage instead of average** (more persuasive):

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        ⭐⭐⭐⭐⭐ Loved by 92% of families (12 reviews)        │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ ⭐⭐⭐⭐⭐          │ │ ⭐⭐⭐⭐⭐          │ │ ⭐⭐⭐⭐☆          ││
│  │                 │ │                 │ │                 ││
│  │ "My kids       │ │ "The weekly     │ │ "Great app—     ││
│  │ actually ASK   │ │ digest helps me │ │ would love more ││
│  │ to do chores!" │ │ stay on top."   │ │ templates."     ││
│  │                 │ │                 │ │                 ││
│  │ 🏷 Less nagging │ │ 🏷 Visibility   │ │ 🏷 Completion   ││
│  │ — Sarah M. ✔   │ │ — Johnsons ✔   │ │ — Parent of 3 ✔││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│              [Read All Reviews on Trustpilot →]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Trust Signals

| Signal | Implementation | Why |
|--------|----------------|-----|
| **✔ Verified** | Show if family has 50+ chores | Combats fake review fatigue |
| **Outcome tags** | `🏷 Less nagging` | Parents self-identify with problems |
| **Include 4★** | Show 1 mild critique | Imperfection increases credibility |
| **% not average** | "92% love it" vs "4.8 stars" | Percentages feel more human |

### Outcome Tag Vocabulary

| Tag | Display | Problem it solves |
|-----|---------|-------------------|
| `less_nagging` | Less nagging | "I'm tired of reminding kids" |
| `kid_motivation` | Kid motivation | "My kids won't do chores" |
| `higher_completion` | Higher completion | "Chores never get done" |
| `parent_visibility` | Parent visibility | "I don't know what got done" |
| `less_micromanaging` | Less micromanaging | "I have to watch everything" |
| `sibling_fairness` | Sibling fairness | "Kids fight about who does what" |

**Key decisions**:
- Static 3-card layout (no carousel)
- Link to Trustpilot for full reviews
- Include one 4-star review (builds trust)
- Update JSON manually when new reviews come in

---

## Phase 4: Self-Hosted Reviews (Month 3+)

**Only build if ALL conditions met**:
- [ ] 25+ third-party reviews exist
- [ ] Users requesting in-app review submission
- [ ] You have moderation capacity

**If conditions met**: Use database schema from deprecated doc.

**Migration**: [`sql/20260126_user_reviews.sql`](../../sql/20260126_user_reviews.sql)

---

## What We're NOT Doing

| Feature | Why Skip |
|---------|----------|
| Self-hosted `/reviews` page | Low SEO value vs Trustpilot |
| Review carousel | Users don't swipe (1-2% interact) |
| Login page quotes | Distracts, causes login errors |
| Empty state quotes | Encourages inactivity |
| Star filters | Overkill with <50 reviews |
| Auto-rotation | Accessibility nightmare |

---

## Incentive Strategy

**Offer**: $5 donation to Feeding America for each review

**Why charity**:
- Legal (not paying for reviews)
- Ethical (transparent)
- On-brand (family-focused)
- Tax deductible

**Budget**: $250 for first 50 reviews

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Review response rate | 20%+ of prompted users | Week 3 |
| Trustpilot reviews | 10+ | Month 1 |
| Trustpilot reviews | 25+ | Month 3 |
| Average rating | 4.5+ stars | Ongoing |

---

## Analytics Events (Track What Matters)

**Not vanity metrics — causal metrics:**

| Event | What It Measures | Priority |
|-------|------------------|----------|
| `testimonial_section_viewed` | Did they see social proof? | HIGH |
| `testimonial_link_clicked` | Which reviews persuade? | HIGH |
| `signup_after_testimonial_view` | **Gold metric** — causal lift | HIGH |
| `review_prompt_shown` | Prompt reach | MEDIUM |
| `review_prompt_clicked` | Prompt conversion | HIGH |
| `review_prompt_dismissed` | Avoid over-nagging | MEDIUM |

**Implementation**: Simple event logging (no fancy tooling needed).

```typescript
// Example: Track testimonial view before signup
analytics.track('testimonial_section_viewed', {
  page: 'landing',
  testimonials_shown: 3,
  timestamp: Date.now()
});

// On signup, check if they viewed testimonials
analytics.track('signup_completed', {
  viewed_testimonials: sessionStorage.get('saw_testimonials') === 'true'
});
```

---

## Handling Negative Reviews

| Rating | Action |
|--------|--------|
| 5 stars | Feature on landing page |
| 4 stars | Thank publicly, note feedback |
| 3 stars | Respond publicly, follow up privately |
| 1-2 stars | Respond publicly, escalate to support |

**Response template** (for 3 stars or below):
```
Hi [Name], thanks for the feedback. We're sorry ChoreGami
didn't meet your expectations. We'd love to make it right —
could you email support@choregami.com so we can help?
```

---

## Files to Create

| File | Lines | When |
|------|-------|------|
| `static/content/testimonials.json` | ~30 | Week 5 |
| `islands/TestimonialsSection.tsx` | ~50 | Week 5 |

**Total: ~80 lines** (vs 440 in original plan)

---

## Related Documents

- [Outreach Templates](./20260126_testimonial_outreach_templates.md) - Email scripts for collecting testimonials
- [Business Requirements](../business-requirements.md) - Product specs
- [Deprecated: User Reviews Infrastructure](./_DEPRECATED_20260126_user_reviews_social_proof.md) - Original over-engineered plan
- [Migration SQL](../../sql/20260126_user_reviews.sql) - For Phase 4 if needed

---

**Document Owner**: Product Team
**Last Updated**: January 26, 2026
