# Rewards & Financial Education Strategy - Market-Driven Roadmap

**Date**: January 25, 2026
**Status**: Planning
**Context**: Market analysis of paid family chore app space (2026) + review of existing ChoreGami rewards implementation
**Depends On**: `rewards_system.md` (Jan 14 - DB schema + basic plan)

---

## Market Context

### The Problem

In 2026, the generic paid family chore app space is crowded and price-sensitive.
A pure "chore checklist" subscription is hard to justify when free alternatives
exist (Family Tools, Cozi). Users balk at $4.99/month for "just task tracking."

### What Competitors Offer

| App | Pricing | Key Differentiator |
|-----|---------|-------------------|
| BusyKid | ~$4/mo | Real debit cards, investing |
| Greenlight | ~$5-10/mo | Banking + debit + savings goals |
| S'moresUp | ~$10/mo | Points + deep gamification |
| Homey | ~$5-7/mo | Allowance + basic chores |
| KiddiKash | Free tier | Points-based, no real money |
| Family Tools | Free | Basic chore charts, no rewards |

### The Opportunity

ChoreGami's existing moat is **real-time gamification** (WebSocket leaderboard,
FamilyScore, streaks, celebrations). No competitor has sub-second cross-device
updates. But gamification alone doesn't justify a subscription.

**The winning formula**: Gamification moat + Financial education outcome =
Paying proposition.

"My kids built lasting habits and learned to save toward goals they chose"
is worth $5/month. "Real-time leaderboard" alone is not.

---

## Existing Implementation Assessment

### Screenshots Reviewed (choregami.app - Previous Iteration)

The old ChoreGami app has a working rewards system with:

1. **Rewards Shop** (dedicated "Rewards" tab)
   - Parent-defined rewards with dollar costs ($6, $8, $20)
   - "Buy" buttons per reward
   - "Request New Reward" button (kid-initiated)
   - Recent Purchases history with dates/amounts

2. **Balances** ("My Money" tab)
   - Per-kid balance cards with dollar amounts
   - Weekly Earnings vs Chore Earnings breakdown
   - Savings Goals placeholder ("No savings goals yet")
   - "Pay Out" button per kid

3. **Pay Out Flow**
   - Parent PIN authentication required
   - Amount input via browser `prompt()` dialog
   - Deducts from kid's virtual balance

4. **Navigation**
   - 5-tab bottom nav: Home | Goals | Balances | Rewards | Manage Chores

### What Works (Port)

| Feature | Why It Works |
|---------|--------------|
| Dollar denomination | Real money framing = financial education angle |
| Earnings breakdown (Weekly vs Chore) | Teaches earned vs base income concept |
| Parent-defined rewards catalog | Structures the reward conversation |
| "Request New Reward" (kid-initiated) | Gives kids agency, competitors lack this |
| Purchase history with dates | Financial literacy through visibility |

### What's Broken (Redesign)

| Issue | Problem | Fix |
|-------|---------|-----|
| "Cash Out" as reward item | Category error: withdrawal != purchase | Separate "Pay Out" action on Balance screen |
| Browser `prompt()` for amount | Janky UX, breaks polish on mobile | Proper in-app modal with input field |
| 5-tab navigation | Too heavy for kid-facing 6+ app | Integrate into 2-dashboard architecture |
| `-$17.00` in red | Negative framing discourages claiming | Use positive framing per rewards_system.md |
| Savings Goals placeholder | Highest-value feature is unimplemented | Promote to Phase 1 priority |
| No behavioral data | Balances show what, not how consistently | Add habit formation insights |

---

## Strategic Decision: Points vs Dollars

### Current State

| System | Currency | Use |
|--------|----------|-----|
| ChoreGami 2026 | Abstract points | Leaderboard, streaks, celebrations |
| Old ChoreGami | Dollars | Rewards, balance, pay out |
| FamilyScore | Points | Real-time gamification engine |

### Recommendation: Hybrid Model

Keep **both** — they serve different purposes:

| Layer | Currency | Purpose |
|-------|----------|---------|
| Gamification | Points | Leaderboard rankings, streaks, celebrations, FamilyScore |
| Financial | Dollars | Rewards, savings goals, pay out, allowance |

**Implementation**: Parent sets an exchange rate in family settings
(e.g., 1 point = $1, or 10 points = $1). Points drive gamification;
dollars drive financial education.

```typescript
// families.settings.apps.choregami.finance
{
  points_per_dollar: 1,        // Exchange rate (default 1:1)
  weekly_allowance_cents: 500, // Optional base $5/week per kid
  payout_requires_pin: true    // Parent PIN for cash out
}
```

### Why Not Points-Only?

- Market feedback: "financial education" is the monetizable differentiator
- Abstract points have no real-world anchor for kids
- "Save 50 points" means nothing; "Save $50 for a game" means everything
- Competitors with real money (BusyKid, Greenlight) command higher prices

### Why Not Dollars-Only?

- Loses the gamification UX (leaderboard in dollars feels mercenary)
- FamilyScore integration uses points natively
- Points allow instant gratification without parent spending money
- Not all families want to tie chores to allowance

---

## Feature Priority (Effort-to-Value Ranked)

### Priority 1: Behavioral Insights (Highest Pareto)

**Why first**: Zero new tables, leverages existing `chore_transactions` data,
strongest "why parents pay" story.

**Features**:
- 8-12 week consistency view per kid
- Completion rate trends (weekday vs weekend, morning vs evening)
- Streak analytics with "habit formed" milestone (21+ consecutive days)
- Enrich existing weekly digest email with trend data

**Monetization story**: "See proof your approach is working. Ciku's morning
routine consistency went from 40% to 85% over 6 weeks."

**Implementation**:
```
routes/parent/insights.tsx       # ~80 lines (server handler)
islands/HabitInsights.tsx        # ~120 lines (charts/trends)
lib/services/insights-service.ts # ~80 lines (aggregate queries)
```

**Queries** (on existing chore_transactions):
```sql
-- Completion rate by week (last 12 weeks)
SELECT
  date_trunc('week', created_at) as week,
  profile_id,
  COUNT(*) as completions,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM choretracker.chore_transactions
WHERE family_id = $1
  AND transaction_type = 'chore_completed'
  AND created_at >= now() - interval '12 weeks'
GROUP BY week, profile_id
ORDER BY week;

-- Current streak per kid
SELECT profile_id,
  COUNT(*) as streak_days
FROM (
  SELECT DISTINCT profile_id, DATE(created_at) as completion_date
  FROM choretracker.chore_transactions
  WHERE family_id = $1 AND transaction_type = 'chore_completed'
) completions
WHERE completion_date >= (
  -- Find the last gap day
  SELECT COALESCE(MAX(d), '1970-01-01')
  FROM generate_series(CURRENT_DATE - 90, CURRENT_DATE, '1 day') d
  WHERE d NOT IN (
    SELECT DISTINCT DATE(created_at)
    FROM choretracker.chore_transactions
    WHERE profile_id = completions.profile_id
      AND transaction_type = 'chore_completed'
  )
)
GROUP BY profile_id;
```

**Effort**: ~280 lines, 0 new tables
**Timeline dependency**: None, can ship independently

---

### Priority 2: Rewards Marketplace

**Why second**: Tables already exist in production (`available_rewards`,
`reward_purchases`). Old app has proven the UX. Pairs with Priority 1
for the "earn + spend wisely" story.

**What to port from old app**:
- Rewards catalog display (parent-defined, dollar-denominated)
- Claim/redeem flow with balance check
- Purchase history
- "Request New Reward" button (kid-initiated)

**What to redesign**:
- No "Cash Out" in rewards catalog (separate Pay Out action)
- Proper modal for amounts (not browser prompt)
- Positive framing ("Claim" not "Buy", no red amounts)
- Integrate into kid dashboard as sub-route, not separate tab

**Implementation** (per existing rewards_system.md):
```
routes/rewards.tsx             # ~80 lines
islands/RewardsCatalog.tsx     # ~70 lines
routes/api/rewards/claim.ts    # ~60 lines
lib/services/chore-service.ts  # +50 lines (getRewards, claimReward)
```

**DB**: Already exists (`choretracker.available_rewards`, `choretracker.reward_purchases`)

**Effort**: ~260 lines, 0 new tables
**Timeline dependency**: None, can ship independently

---

### Priority 3: Savings Goals

**Why third**: Highest-value financial education feature. "I'm saving $40 for
a game" is concrete, motivating, and teaches delayed gratification. The old
app had this as placeholder — promoting to real feature.

**Features**:
- Kid creates a goal (name, target amount, optional deadline)
- Progress bar shows current vs target
- Auto-updates as points/dollars accumulate
- Celebration when goal achieved
- Parent can "boost" (contribute toward goal)

**Implementation**:
```
routes/kid/goals.tsx           # ~80 lines
islands/SavingsGoals.tsx       # ~100 lines (create/view goals)
islands/GoalProgress.tsx       # ~50 lines (progress bar + celebration)
routes/api/goals/index.ts      # ~60 lines (CRUD)
```

**DB**: Already exists (`choretracker.savings_goals`)

**Effort**: ~290 lines, 0 new tables
**Timeline dependency**: Rewards (Priority 2) should exist first so kids
understand their balance before setting goals

---

### Priority 4: Balance & Pay Out

**Why fourth**: Requires the hybrid points/dollars decision to be finalized.
Pay Out is the real-world bridge that makes the financial education tangible.

**Features**:
- Per-kid balance view (earnings breakdown: chore vs weekly allowance)
- Pay Out action (parent-authenticated, proper modal)
- Transaction history (filtered view of chore_transactions)
- Optional: weekly allowance auto-deposit

**What's different from old app**:
- Pay Out is on Balance screen, NOT a reward catalog item
- Amount input is a styled modal, NOT browser prompt()
- Balance is a sub-view of kid dashboard, NOT a top-level tab

**Implementation**:
```
routes/parent/balances.tsx     # ~80 lines
islands/BalanceCards.tsx        # ~100 lines (per-kid cards)
islands/PayOutModal.tsx         # ~80 lines (amount + PIN)
routes/api/payout.ts           # ~60 lines
```

**New column needed**: `family_profiles.balance_cents INTEGER DEFAULT 0`
(or derive from transaction sum — TBD)

**Effort**: ~320 lines, 1 column addition
**Timeline dependency**: Priority 2 (Rewards) to establish spending pattern

---

### Priority 5: Kid-Initiated Reward Requests

**Why last**: Nice-to-have that gives kids agency. Requires parent notification
+ approval workflow. Low urgency but high delight.

**Features**:
- Kid taps "Request New Reward" on catalog
- Enters name + suggested cost
- Parent gets notification (existing notification system)
- Parent approves/rejects/modifies from settings
- Approved rewards appear in catalog

**Effort**: ~200 lines, uses existing notification system
**Timeline dependency**: Priority 2 (Rewards catalog must exist)

---

## Architecture Integration

### How Rewards Fits into ChoreGami 2026

```
Current Architecture:
├── Kid Dashboard (chores, completion, leaderboard)
├── Parent Dashboard (activity feed, adjustments)
└── Settings (family config, templates, PIN)

With Rewards + Insights:
├── Kid Dashboard
│   ├── Today's Chores (existing)
│   ├── Leaderboard (existing)
│   ├── Rewards Shop (NEW - claim rewards)
│   └── My Goals (NEW - savings progress)
├── Parent Dashboard
│   ├── Activity Feed (existing)
│   ├── Adjustments (existing)
│   ├── Insights (NEW - habit trends)
│   └── Balances (NEW - per-kid finance)
└── Settings (existing + exchange rate config)
```

### No New Tabs

Unlike the old 5-tab app, rewards and insights are **sub-routes** of existing
dashboards. The kid sees a "Rewards" link/card on their dashboard. The parent
sees "Insights" and "Balances" as sections of their dashboard.

### Transaction Service Integration

All financial operations flow through the existing TransactionService:

```typescript
// Chore completed → points + dollars
await transactionService.recordChoreCompletion(...);
// In metadata: { dollars_earned: pointValue * exchange_rate }

// Reward claimed → negative transaction
await transactionService.recordRewardClaim(profileId, rewardId, costCents);
// transaction_type: 'reward_claimed'

// Pay Out → negative transaction
await transactionService.recordPayout(profileId, amountCents);
// transaction_type: 'payout'

// Savings goal deposit → earmarked (no spend)
// Just a query: SUM(earned) - SUM(spent) vs goal target
```

### WebSocket/FamilyScore Integration

- Reward claims broadcast to family (parent sees "Julia claimed Movie Night!")
- Balance updates sync via existing FamilyScore channel
- Goal achievements trigger celebration animation (reuse existing)

---

## Competitor Differentiation Summary

| Feature | BusyKid | Greenlight | S'moresUp | ChoreGami 2026 |
|---------|---------|------------|-----------|----------------|
| Real-time leaderboard | No | No | No | Yes (WebSocket) |
| Habit formation insights | No | No | No | Yes (8-12 week) |
| Dollar rewards catalog | No (direct pay) | No (direct pay) | Points only | Yes |
| Savings goals | Yes | Yes (detailed) | No | Yes |
| Kid reward requests | No | No | No | Yes |
| Streak gamification | Basic | No | Yes | Yes (real-time) |
| Debit card | Yes | Yes | No | No (intentional) |
| Exchange rate flexibility | N/A | N/A | N/A | Yes (parent-set) |

**Positioning**: "Like BusyKid's financial education, but with S'moresUp's
gamification, real-time family engagement, and no banking complexity."

---

## Monetization Model

### Free Tier
- Core chore tracking (assignments, completion, basic leaderboard)
- Up to 2 kids
- Manual point tracking

### Paid Tier ($4.99/month)
- Behavioral insights (habit formation, trends, weekly digest)
- Rewards marketplace (unlimited rewards, purchase history)
- Savings goals (per-kid targets with progress)
- Pay Out tracking
- Real-time WebSocket features (live leaderboard, activity feed)
- Unlimited kids
- Rotation templates

### Why This Works
- Free tier is genuinely useful (not crippled)
- Paid features deliver measurable **outcomes** (habits formed, money saved)
- Price justified by financial education value, not "access to a checklist"
- No banking/card partnerships needed (parent handles physical payout)

---

## Go/No-Go Criteria Met

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Underserved persona identified | Yes | Families with kids 6-14 wanting habit formation + financial skills without banking complexity |
| Differentiation beyond chore list | Yes | Real-time gamification + behavioral insights + financial education |
| Monetization tied to value | Yes | "Prove habits formed" + "teach money skills" vs "access a checklist" |
| Technical feasibility | Yes | DB tables exist, transaction system proven, old app validates UX |

**Decision: GO** — with Priorities 1-3 as MVP paid tier.

---

## Implementation Effort Summary

| Priority | Feature | New Lines | New Tables | Dependencies |
|----------|---------|-----------|------------|--------------|
| 1 | Behavioral Insights | ~280 | 0 | None |
| 2 | Rewards Marketplace | ~260 | 0 (exist) | None |
| 3 | Savings Goals | ~290 | 0 (exist) | P2 |
| 4 | Balance & Pay Out | ~320 | 0 (+1 col) | P2 |
| 5 | Reward Requests | ~200 | 0 | P2 |
| **Total** | | **~1350** | **0** | |

All priorities use existing DB tables. No migrations needed.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-25 | Hybrid points + dollars model | Points for gamification (leaderboard), dollars for financial education (rewards, goals) |
| 2026-01-25 | Behavioral insights first | Lowest effort, highest monetization justification, zero new tables |
| 2026-01-25 | Cash Out separate from rewards | Category error in old app — withdrawal is not a purchase |
| 2026-01-25 | No debit card integration | Banking requires partnerships/compliance; virtual balance + parent payout is sufficient |
| 2026-01-25 | Sub-routes, not new tabs | Preserve simple 2-dashboard architecture vs old app's 5-tab complexity |
| 2026-01-25 | Port concept, not code | Old app's 915-line RewardsService is over-engineered; rebuild in ~260 lines |
| 2026-01-25 | Positive framing mandatory | "Claim" not "Buy", no red amounts, per rewards_system.md psychology guidelines |

---

## References

- `docs/planned/rewards_system.md` — DB schema, API endpoints, Phase 1 plan
- `lib/services/rotation-service.ts` — Template activation pattern (for savings goal milestones)
- `routes/api/rotation/complete.ts` — Transaction recording pattern
- Old app reference: `/Users/georgekariuki/repos/deno2/fresh-auth/lib/services/chore-tracker-v2/rewards.service.ts`

---

*Document created: January 25, 2026*
*Status: Strategic roadmap approved, awaiting implementation priority decision*
