# Landing Page & Teaser Cards for Demand Tracking

**Date**: February 1, 2026
**Status**: Ready for Implementation
**Author**: Product Team
**Related**: Demo Mode, Account Types, UX Trends Assessment

## Executive Summary

This document outlines the landing page strategy with **Teaser Cards** (Hybrid Approach #2) to:
1. Showcase ChoreGami's core value proposition
2. Track demand signals for unreleased features (Roommates, Just Me)
3. Drive conversions via existing demo mode
4. Maintain visual appeal without overwhelming new visitors

---

## Landing Page Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ChoreGami                                    [Log in] [Sign up]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     Household tasks. Sorted.                                    │
│     One app for families, roommates, and you.                   │
│                                                                 │
│     [Get Started]        [See how it works]                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHO'S THIS FOR?                                                │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 👨‍👩‍👧‍👦 Families  │  │ 🏠 Roommates │  │ 👤 Just Me  │             │
│  │             │  │             │  │             │             │
│  │ Kids earn   │  │ Fair splits │  │ Stay on    │             │
│  │ points for  │  │ without    │  │ top of     │             │
│  │ chores      │  │ nagging    │  │ your tasks │             │
│  │             │  │             │  │             │             │
│  │ [Try Demo]  │  │ [Learn more]│  │ [Learn more]│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HOW IT WORKS                                                   │
│  1. Set up tasks → 2. Assign/rotate → 3. Track & celebrate     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Testimonials placeholder] | [Footer: Terms, Privacy]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Teaser Cards Strategy (Hybrid Approach #2)

### Why Teaser Cards?

| Benefit | Description |
|---------|-------------|
| **Visual appeal** | Shows product breadth without overwhelming |
| **Demand signals** | Trackable clicks reveal user interest |
| **Low friction** | No forms, just a click to express interest |
| **Easy to implement** | Simple UI + click tracking |

### Card States

| Card | Status | CTA | Action |
|------|--------|-----|--------|
| **Families** | Live | `[Try Demo]` | Opens demo mode |
| **Roommates** | Coming Soon | `[Learn more]` | Opens modal, tracks demand |
| **Just Me** | Coming Soon | `[Learn more]` | Opens modal, tracks demand |

### "Learn More" Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Roommates Mode                                    [X]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Coming Soon!                                                   │
│                                                                 │
│  Fair task splitting without the nagging.                       │
│  Perfect for apartments, couples, and shared houses.            │
│                                                                 │
│  Features:                                                      │
│  • Fairness meter (not competition)                             │
│  • Automatic rotation                                           │
│  • Optional bill splitting                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │  Want early access? (optional)                              │
│  │  [email@example.com_____________________]                   │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  [Notify Me]                              [Maybe Later]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Demo Mode Integration

**Recent Work**: Demo mode implemented (commit `83bd8b6`)

The landing page leverages existing demo mode:
- **Families card** → `[Try Demo]` → `/demo` route
- Demo shows sample family dashboard with interactive chores
- Users can complete sample chores, see confetti, explore UI
- Clear `[Exit Demo] [Sign Up]` controls throughout

**Demo Mode Flow**:
```
Landing Page → [Try Demo] → /demo → Interactive Dashboard → [Sign Up] → /register
```

---

## Demand Signal Tracking

### Data Model

```typescript
interface DemandSignal {
  id: string;
  feature: "roommates" | "just_me";
  clicked_at: Date;
  session_id?: string;  // Anonymous tracking
  email?: string;       // If user opts in
  user_agent?: string;  // Browser/device context
}
```

### Database Table

**Decision**: Reuse `family_activity` pattern (minimal schema + JSONB payload) in public schema.

```sql
-- public.demand_signals (reuses family_activity pattern)
-- No family_id FK - anonymous demand tracking
CREATE TABLE public.demand_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  data jsonb NOT NULL
);

-- Index for time-based queries
CREATE INDEX idx_demand_signals_created ON public.demand_signals(created_at DESC);

-- JSONB data contains: { v, feature, email?, session_id?, user_agent? }
```

**JSONB Payload** (same pattern as `family_activity.data`):
```typescript
{
  v: 1,                    // Schema version
  feature: "roommates",    // 'roommates' | 'just_me'
  email?: "user@...",      // Optional early access signup
  session_id?: "uuid",     // Anonymous session tracking
  user_agent?: "Mozilla/..." // Browser context
}
```

### API Endpoint

```typescript
// routes/api/demand-signal.ts
export const handler: Handlers = {
  async POST(req) {
    const { feature, email, session_id } = await req.json();

    // Validate feature
    if (!["roommates", "just_me"].includes(feature)) {
      return new Response("Invalid feature", { status: 400 });
    }

    // Insert signal with JSONB payload (family_activity pattern)
    await supabase
      .from("demand_signals")  // public schema, no .schema() needed
      .insert({
        data: {
          v: 1,  // Schema version
          feature,
          email: email || undefined,
          session_id: session_id || undefined,
          user_agent: req.headers.get("user-agent") || undefined,
        },
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

---

## Throttling Strategy

### Risk Assessment

| Factor | Reality |
|--------|---------|
| Target value | Near zero (click counts, not user data) |
| Attack motivation | None (no financial gain, no PII) |
| Worst case | Table gets spammy rows, easy to clean |
| Supabase limits | Already has connection pooling + row limits |

**Conclusion**: Low risk. Simple throttling sufficient.

### Client-Side Deduplication (Primary)

```typescript
// islands/TeaserCard.tsx
const trackDemandSignal = async (feature: string, email?: string) => {
  const storageKey = `demand_${feature}_clicked`;

  // Primary throttle: one click per feature per browser
  if (localStorage.getItem(storageKey)) {
    // Already tracked - skip API call but still show modal
    return;
  }

  // Mark as tracked
  localStorage.setItem(storageKey, "true");

  // Send to API
  await fetch("/api/demand-signal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      feature,
      email,
      session_id: getOrCreateSessionId(),
    }),
  });
};

// Session ID for anonymous tracking
const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem("demand_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("demand_session_id", sessionId);
  }
  return sessionId;
};
```

**Benefits**:
- One click per feature per browser (localStorage)
- Zero server complexity
- Accurate demand signals (deduplicated by design)

### Server-Side Rate Limiting (Belt-and-Suspenders)

```typescript
// routes/api/demand-signal.ts

// Simple in-memory rate limit (per IP, 1 minute window)
const recentClicks = new Map<string, number>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 300000; // 5 min
  for (const [ip, timestamp] of recentClicks) {
    if (timestamp < cutoff) {
      recentClicks.delete(ip);
    }
  }
}, 300000);

export const handler: Handlers = {
  async POST(req) {
    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
               req.headers.get("x-real-ip") ||
               "unknown";

    // Rate limit: 1 request per minute per IP
    const lastClick = recentClicks.get(ip);
    if (lastClick && lastClick > Date.now() - 60000) {
      return new Response("Too many requests", { status: 429 });
    }
    recentClicks.set(ip, Date.now());

    // ... rest of handler
  },
};
```

**When to Add**:
- Only if you observe abuse in production logs
- Start without it, add if needed
- Takes ~10 minutes to implement

---

## Implementation Effort

### Effort Estimate: Small (2-4 hours)

| Component | Effort | Notes |
|-----------|--------|-------|
| Landing page route | 30 min | Public route, no auth required |
| 3 teaser cards UI | 45 min | Reuse existing card styles |
| Click tracking API | 30 min | Simple POST endpoint |
| DB table for signals | 15 min | `demand_signals` table |
| "Learn more" modal | 45 min | Coming soon + optional email |
| Wire it together | 30 min | Connect clicks to API to DB |

### File Structure

```
routes/
├── landing.tsx              # NEW: Public landing page
├── api/
│   └── demand-signal.ts     # NEW: Click tracking endpoint
islands/
├── TeaserCard.tsx           # NEW: Card with demand tracking
├── LearnMoreModal.tsx       # NEW: Coming soon modal
```

---

## Analytics & Reporting

### Simple Query for Product Decisions

```sql
-- Daily demand signals by feature (JSONB query)
SELECT
  data->>'feature' as feature,
  DATE(created_at) as date,
  COUNT(*) as clicks,
  COUNT(DISTINCT data->>'email') as email_signups
FROM public.demand_signals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY data->>'feature', DATE(created_at)
ORDER BY date DESC, clicks DESC;
```

### Dashboard View (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│  DEMAND SIGNALS                              Last 30 days       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏠 Roommates                                                   │
│  ████████████████████████░░░░░░  247 clicks (68%)              │
│  📧 89 email signups                                           │
│                                                                 │
│  👤 Just Me                                                     │
│  ███████████░░░░░░░░░░░░░░░░░░░  118 clicks (32%)              │
│  📧 34 email signups                                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Insight: Roommates mode has 2x demand. Prioritize for Q2.     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Account Types & Personal Hubs](./20260131_account_types_personal_hubs.md) - Full persona architecture
- [UX Trends Assessment](./20260131_ux_trends_assessment.md) - Demo mode research
- [Demo Mode Commit](https://github.com/.../commit/83bd8b6) - Recent implementation
- [Analytics Tracking](../analytics/20260130_analytics_tracking.md) - Event tracking patterns

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| **Reuse family_activity pattern** | Same JSONB-based minimal schema, proven pattern, no new abstractions |
| Public schema (no family_id FK) | Anonymous demand tracking, no auth required |
| Client-side deduplication first | Pareto: 99% coverage with zero server complexity |
| localStorage over cookies | Simpler, no GDPR cookie concerns |
| Optional email capture | Lower friction than required fields |
| Server rate limiting optional | Add only if abuse observed |

---

## Next Steps

1. [ ] Create `routes/landing.tsx` with hero + teaser cards
2. [ ] Create `islands/TeaserCard.tsx` with click tracking
3. [ ] Create `islands/LearnMoreModal.tsx` for coming soon
4. [ ] Create `routes/api/demand-signal.ts` endpoint
5. [ ] Run migration for `demand_signals` table
6. [ ] Connect "Try Demo" to existing `/demo` route
7. [ ] Deploy and monitor signals

---

**Status**: Ready for Implementation
**Priority**: P1 (drives product roadmap decisions)
**Effort**: 2-4 hours
