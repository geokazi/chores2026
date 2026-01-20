# Feedback Strategy Decision

**Date**: January 20, 2026
**Status**: Decided
**Decision**: Ship Google Form link now, build in-app feedback later with traction

## Context

Throughout ChoreGami development, we've applied Pareto principles consistently:
- "Ship first, optimize later with demand"
- "Check analytics, decide with data"
- "20% effort for 80% value"

This raised a key question: **How do we track that demand?**

### Features We've Deferred (Pending Demand Signal)

| Feature | Status | Demand Signal Needed |
|---------|--------|---------------------|
| Tablet/desktop styling | Deferred | Analytics (device breakdown) |
| Two-column layouts | Deferred | User complaints |
| Event recurrence | Future | Feature requests |
| Calendar view | Future | Feature requests |
| Offline/PWA | Planned | User complaints |
| Photo verification | Phase 2 | Demand signal |

**Insight**: Analytics tells you WHAT users do. Feedback tells you WHAT users WANT.

## Options Considered

### Option A: No Feedback System
- **Effort**: 0
- **Result**: Blind decision-making
- **Pareto Score**: High effort-savings, but no demand signals

### Option B: External Tool (Google Forms) ✅ **Selected**
- **Effort**: 10 minutes (add a link)
- **Pros**: Zero code, proven UX, free tier
- **Cons**: Data lives outside system
- **Pareto Score**: 95/5

### Option C: In-App Feedback (JSONB Table)
- **Effort**: 1-2 hours
- **Pros**: Data in system, queryable
- **Cons**: Build overhead for small user base
- **Pareto Score**: 70/30
- **When to revisit**: 100+ active users

### Option D: Full Feedback System (Upvoting, Roadmap)
- **Effort**: 1-2 weeks
- **Pareto Score**: 10/90
- **Verdict**: Overkill for early stage

## Industry Context

| User Stage | Typical Approach |
|------------|------------------|
| **0-100 users** | Direct communication (email, chat, calls) |
| **100-1000 users** | Simple feedback form + analytics |
| **1000+ users** | Structured tools (Canny, ProductBoard) |

**ChoreGami is at Stage 1.** Direct communication is actually more valuable than forms at this scale.

## Decision

### Now: External Form + Direct Outreach

1. **Add "Send Feedback" link** in Settings → Google Form
   - 10 minutes to set up
   - Zero code changes
   - Captures: category, message, email (optional)

2. **Direct user outreach** via email:
   - "What's missing?"
   - "What's confusing?"
   - "What device do you use most?"

3. **Analytics** (existing):
   - Device breakdown
   - Page visits
   - Feature usage patterns

### Later (100+ users): In-App JSONB Feedback

Build in-app feedback when:
- External form receives >20 responses
- Users complain about friction of external form
- Need to correlate feedback with user/family data

#### Future JSONB Schema (Reference)

```sql
CREATE TABLE choretracker.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  profile_id UUID REFERENCES family_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL
);

-- Example data:
-- { "type": "feature", "message": "Would love recurring events!", "page": "/parent/events" }
-- { "type": "bug", "message": "Prep tasks don't save", "device": "iPad" }
-- { "type": "general", "message": "Kids love it!", "rating": 5 }
```

## Demand Tracking Summary

| Signal Type | Method | Timeline |
|-------------|--------|----------|
| Device usage | Analytics | Now |
| Feature requests | Google Form | Now |
| Bug reports | Google Form + email | Now |
| Qualitative feedback | Direct user interviews | Now |
| Structured in-app feedback | JSONB table | 100+ users |
| Feature voting/roadmap | Canny/ProductBoard | 1000+ users |

## Action Items

- [ ] Create Google Form with fields: Type (Feature/Bug/General), Message, Email (optional)
- [ ] Add "Send Feedback" link to Settings page
- [ ] Schedule direct outreach emails to early users
- [ ] Set reminder to revisit at 100 users

---

**Principle Applied**: Ship the simplest solution that captures demand signals. Build infrastructure when the simple solution shows traction.

*Decision made: January 20, 2026*
