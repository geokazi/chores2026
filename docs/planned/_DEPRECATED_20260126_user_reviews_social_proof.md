# User Reviews & Social Proof

**Document Created**: January 26, 2026
**Status**: 📋 **PLANNED**
**Effort**: ~4-6 hours total (phased)

## Executive Summary

Display user reviews and testimonials across the app to build trust with new visitors and reinforce value for existing users. Follows 80/20 principle: minimal schema, maximum social proof impact.

### Strategic Goals

| Goal | Metric |
|------|--------|
| Increase signup conversion | +15-25% landing page conversion |
| Reduce early churn | Reinforce decision at welcome/login |
| SEO value | User-generated content, rich snippets |
| Build trust | Social proof before commitment |

---

## Display Locations (Priority Order)

### High Priority (Phase 1)

| Location | Audience | Purpose |
|----------|----------|---------|
| Landing page (`/landing`) | New visitors | Conversion - social proof before signup |
| Public reviews page (`/reviews`) | SEO/shareable | Full review collection, Google rich snippets |
| Post-signup welcome (`/welcome`) | New users | Validate decision, reduce churn |

### Medium Priority (Phase 2)

| Location | Audience | Purpose |
|----------|----------|---------|
| Login page (`/login`) | Returning users | Subtle reinforcement while waiting |
| Empty states | Active users | Fill "nothing to do" moments |

---

## UX Mockups

### 1. Landing Page Reviews Section

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    What Families Say                        │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ ⭐⭐⭐⭐⭐          │ │ ⭐⭐⭐⭐⭐          │ │ ⭐⭐⭐⭐⭐          ││
│  │                 │ │                 │ │                 ││
│  │ "My kids       │ │ "The weekly     │ │ "Finally, no    ││
│  │ actually ASK   │ │ digest helps me │ │ more nagging    ││
│  │ to do chores!" │ │ stay on top."   │ │ about chores!"  ││
│  │                 │ │                 │ │                 ││
│  │ — Sarah M.     │ │ — The Johnsons  │ │ — Parent of 3   ││
│  │   3 months     │ │   6 months      │ │   1 year        ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│              ← Swipe on mobile (1 visible) →                │
│                                                             │
│                    [Read More Reviews]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Show 3 cards on desktop, 1 swipeable on mobile
- Featured reviews only (`is_featured = true`)
- Link to `/reviews` for full list

---

### 2. Public Reviews Page (`/reviews`)

```
┌─────────────────────────────────────────────────────────────┐
│  ChoreGami                                    [Get Started] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               Families Love ChoreGami                       │
│           ⭐⭐⭐⭐⭐ 4.8 average (47 reviews)                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▼]  [5★]  [4★]  [Recent]                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⭐⭐⭐⭐⭐  "My kids actually ASK to do chores now.      ││
│  │          Game changer for our family!"                 ││
│  │                                                         ││
│  │  — Sarah M. · Using 3 months · California              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⭐⭐⭐⭐⭐  "The weekly digest email helps me stay on     ││
│  │          top of everything without micromanaging."     ││
│  │                                                         ││
│  │  — The Johnson Family · Using 6 months                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⭐⭐⭐⭐☆  "Great app! Would love to see more templates  ││
│  │          for younger kids."                            ││
│  │                                                         ││
│  │  — Marcus T. · Using 2 months · Texas                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                      [Load More]                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│            Ready to try it?  [Get Started Free]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**SEO Implementation:**
- JSON-LD structured data for Google rich snippets
- Meta tags for social sharing
- Canonical URL

---

### 3. Post-Signup Welcome Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  🎉 Welcome to ChoreGami!                   │
│                                                             │
│         You've joined 500+ families making chores           │
│               fun, fair, and manageable.                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💬 "We saw a 3x increase in chore completion               │
│      the first week!"                                       │
│      — The Johnson Family                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📧 Every Sunday, you'll get your family summary:           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Weekly Family Scorecard                            │   │
│  │  ────────────────────────────────────────────────── │   │
│  │  🏆 Emma: 47 pts (12 chores)                        │   │
│  │  🥈 Jake: 35 pts (9 chores) · 🔥 5-day streak!     │   │
│  │  📊 Total family: 235 points this week             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                 [Set Up Your Family →]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Single featured review (rotate daily)
- Static digest preview (hardcoded or from JSON file)
- Proceed to `/setup` flow

---

### 4. Login Page (Subtle)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      ChoreGami                              │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │                         │                    │
│              │  📧 Email               │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │                   │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  🔒 Password            │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │                   │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  [Sign In]              │                    │
│              │                         │                    │
│              │  ─────── or ───────     │                    │
│              │  [Google] [Facebook]    │                    │
│              │                         │                    │
│              └─────────────────────────┘                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💬 "The leaderboard keeps my kids motivated all week!"     │
│     ⭐⭐⭐⭐⭐ — Parent of 3                                    │
│                                                             │
│                    ← Auto-rotates →                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- One rotating quote below login form
- Auto-rotate every 5 seconds
- Don't distract from login action

---

### 5. Empty States

```
┌─────────────────────────────────────────────────────────────┐
│  Kid Dashboard - No Chores Today                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    🎉 All done!                             │
│                                                             │
│            No chores today, [Kid Name]!                     │
│              Enjoy your rest day.                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💬 "Rest days make the chore days feel more rewarding"     │
│     — ChoreGami Parent                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `public.user_reviews`

```sql
CREATE TABLE public.user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  display_name text NOT NULL,
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE (family_id)
);
```

**Migration**: [`sql/20260126_user_reviews.sql`](../../sql/20260126_user_reviews.sql)

### Metadata Examples

```jsonc
{
  "months_using": 6,
  "location": "California",
  "feature_highlighted": "weekly_digest",
  "family_size": 3,
  "submitted_from": "settings_page"
}
```

---

## API Endpoints

### Public (No Auth)

```typescript
// Get approved reviews for public display
GET /api/reviews?limit=10&featured_only=false
Response: { reviews: UserReview[], total: number, average_rating: number }

// Get featured reviews for landing page
GET /api/reviews/featured?limit=3
Response: { reviews: UserReview[] }
```

### Authenticated (Parents Only)

```typescript
// Submit a review
POST /api/reviews
Body: { rating: 5, review_text: "...", display_name: "The Smith Family" }
Response: { success: true, review: UserReview }

// Update own review
PUT /api/reviews
Body: { rating: 4, review_text: "Updated..." }
Response: { success: true, review: UserReview }

// Delete own review
DELETE /api/reviews
Response: { success: true }
```

### Admin (Future)

```typescript
// Moderate review
POST /api/admin/reviews/[id]/moderate
Body: { is_approved: true, is_featured: false }
```

---

## Files to Create

| File | Lines | Description |
|------|-------|-------------|
| `sql/20260126_user_reviews.sql` | ~60 | Migration script |
| `lib/types/reviews.ts` | ~20 | TypeScript types |
| `routes/api/reviews/index.ts` | ~80 | GET list, POST create |
| `routes/api/reviews/featured.ts` | ~30 | GET featured only |
| `routes/reviews.tsx` | ~50 | Public reviews page |
| `islands/ReviewCard.tsx` | ~40 | Single review display |
| `islands/ReviewCarousel.tsx` | ~60 | Landing page carousel |
| `islands/ReviewSubmitForm.tsx` | ~100 | Submit review modal |

**Total: ~440 lines** (under 500-line limit per module)

---

## Implementation Phases

### Phase 1: Core Infrastructure (~2 hours)

1. Run migration: `sql/20260126_user_reviews.sql`
2. Create types: `lib/types/reviews.ts`
3. Create API: `routes/api/reviews/index.ts`
4. Create featured API: `routes/api/reviews/featured.ts`

### Phase 2: Public Display (~2 hours)

1. Create `/reviews` page with review list
2. Add ReviewCard component
3. Add SEO structured data (JSON-LD)
4. Add to landing page (if exists) or create landing section

### Phase 3: User Submission (~2 hours)

1. Create ReviewSubmitForm island
2. Add "Leave a Review" button to Settings
3. Add post-signup welcome screen with review quote

### Phase 4: Polish (Optional, ~1 hour)

1. Login page rotating quote
2. Empty state quotes
3. Review moderation admin UI

---

## Digest Preview Strategy

**Decision**: Use static file, not database table.

```
static/content/digest-preview.json
```

```json
{
  "title": "Your Weekly Family Summary",
  "sample_week": "Jan 19-25, 2026",
  "highlights": [
    "Emma completed 12 chores (47 pts)",
    "Jake hit a 5-day streak! 🔥",
    "Total family points: 235"
  ]
}
```

**Rationale**: Digest preview rarely changes. Static file is simpler than a database table and can be updated with code deploys.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing page conversion | +15% | Signup rate before/after |
| Reviews submitted | 10+ in first month | Database count |
| Average rating displayed | 4.5+ stars | Calculated from approved |
| SEO impressions | +20% | Google Search Console |

---

## Related Documents

- [Business Requirements](../business-requirements.md) - Product specs
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Metadata pattern
- [Template Gating](../milestones/20260118_template_gating_gift_codes.md) - Similar JSONB approach

---

**Document Owner**: Product Team
**Last Updated**: January 26, 2026
