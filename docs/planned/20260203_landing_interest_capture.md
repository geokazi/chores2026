# Landing Page Interest Capture

**Date**: February 3, 2026
**Status**: Planned (Deferred)
**Priority**: Low
**Source**: Landing page optimization review

---

## Feature Concept

Add a low-commitment interest capture micro-question to the landing page to gather product direction signals without bloating the page.

## Proposed Implementation

### Location
After the "How it works" section, before the final CTA.

### UI Design
Simple, one-question format with checkbox options:

```
What else would you like ChoreGami to help with?
[ ] Meal planning
[ ] Shared calendar
[ ] Home admin
[ ] Just chores (current focus)
```

### Data Storage
- Store responses in analytics table (existing `landing_analytics` or new `interest_signals`)
- No account required - anonymous capture
- Include session ID for correlation with conversion

### Schema (if implemented)
```sql
-- Option 1: Add to existing landing_analytics.metadata JSONB
-- Option 2: New dedicated table
CREATE TABLE IF NOT EXISTS interest_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  interests text[], -- ['meal_planning', 'calendar', 'home_admin', 'just_chores']
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

## Benefits

1. **Product Direction**: Quantify demand for adjacent features
2. **Prioritization**: Data-driven roadmap decisions
3. **Low Friction**: No account required, single question
4. **Segmentation**: Correlate interests with conversion rates

## Why Deferred

- Current landing page is optimized and performing well
- Adding elements increases cognitive load
- Need baseline conversion data first before adding variables
- Interest signals can be captured post-signup instead (lower risk)

## Alternative Approach (Recommended)

Capture interest signals **after signup** in the onboarding flow:
- User has already committed
- Doesn't impact landing page conversion
- Higher quality signal (from actual users)

### Post-Signup Implementation
Add to `/setup` page after family creation:

```
Quick question: What else would help your household?
[ ] Meal planning
[ ] Shared calendar
[ ] Home organization
[ ] This is all I need
```

Store in `families.settings.apps.choregami.interests` JSONB.

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 3, 2026 | Deferred | Keep landing page focused on conversion |

## When to Revisit

- After 500+ signups (baseline data)
- If conversion rate stabilizes and needs optimization
- If product roadmap requires demand validation

---

*Created: February 3, 2026*
*Related: [Landing Page & Demand Capture](../milestones/20260201_landing_page_demand_capture.md)*
