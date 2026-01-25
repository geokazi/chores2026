# Balance, Rewards & Savings Goals Implementation

**Date**: January 25, 2026
**Status**: ✅ Complete
**Version**: 1.20
**Priorities**: P2 (Balance & Pay Out), P3 (Rewards Marketplace), P4 (Savings Goals)

---

## Overview

One-shot implementation of three financial education features for ChoreGami 2026, following the strategy outlined in [Rewards Market Strategy](../planned/20260125_rewards_market_strategy.md).

### Features Delivered

| Priority | Feature | Description |
|----------|---------|-------------|
| P2 | Balance & Pay Out | Per-kid balance cards, earnings breakdown, parent PIN-verified payouts |
| P3 | Rewards Marketplace | Parent-defined catalog, claim flow, positive framing, purchase history |
| P4 | Savings Goals | Kid-created goals, progress bars, parent boost, achievement celebration |

---

## Architecture

### Hybrid Storage Pattern

Following [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JSONB (Configuration)                           │
├─────────────────────────────────────────────────────────────────────────┤
│ families.settings.apps.choregami.rewards.catalog[]                      │
│   → Parent-defined rewards (name, icon, pointCost, category, limits)    │
│                                                                         │
│ families.settings.apps.choregami.finance                                │
│   → dollarValuePerPoint, payoutRequiresPin                              │
│                                                                         │
│ family_profiles.preferences.apps.choregami.goals[]                      │
│   → Per-kid savings goals (name, target, current, icon, category)       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      Relational (Transactions)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ choretracker.chore_transactions                                         │
│   → All point changes (cash_out, reward_redemption, adjustment)         │
│                                                                         │
│ choretracker.reward_purchases                                           │
│   → Purchase records linking rewards to transactions                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Transaction Types Added

| Type | Use | Points |
|------|-----|--------|
| `cash_out` | Parent pays out kid's balance | Negative |
| `reward_redemption` | Kid claims a reward | Negative |
| `adjustment` | Transfer to savings goal | Negative |

---

## Files Created

### Types (`lib/types/finance.ts`)

Shared TypeScript interfaces for all three features:

```typescript
// Key interfaces
interface BalanceInfo { profileId, profileName, currentPoints, dollarValue, weeklyEarnings, choreEarnings }
interface AvailableReward { id, name, icon, pointCost, category, isActive, ... }
interface RewardPurchase { id, profileId, rewardId, transactionId, status, ... }
interface SavingsGoal { id, name, targetAmount, currentAmount, isAchieved, ... }
interface FinanceSettings { dollarValuePerPoint, payoutRequiresPin }
```

### Services

| File | Lines | Purpose |
|------|-------|---------|
| `lib/services/balance-service.ts` | ~280 | Balance queries, payout via TransactionService |
| `lib/services/rewards-service.ts` | ~310 | Catalog CRUD, claim via TransactionService |
| `lib/services/goals-service.ts` | ~340 | Goal CRUD, contributions via TransactionService |

**Key patterns**:
- Uses `TransactionService` for all point-changing operations (FamilyScore sync)
- Uses `.schema("choretracker")` for transaction tables
- No duplicate transaction logic - centralized in TransactionService

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `routes/api/payout.ts` | POST | Process payout (parent PIN required) |
| `routes/api/rewards/claim.ts` | POST | Kid claims reward |
| `routes/api/rewards/catalog.ts` | GET, POST, DELETE | Catalog CRUD (parent only) |
| `routes/api/rewards/fulfill.ts` | POST | Mark purchase as fulfilled (parent only) |
| `routes/api/goals/index.ts` | GET, POST, PUT, DELETE | Goal CRUD + boost |

**Authorization patterns**:
- All routes verify session via `getAuthenticatedSession()`
- Cross-family access blocked by checking `session.family.members`
- Payout requires parent role + PIN
- Boost requires parent role
- Goal deletion requires owner OR parent

### Page Routes

| Route | Purpose |
|-------|---------|
| `routes/parent/balances.tsx` | Per-kid balance cards, recent purchases |
| `routes/parent/rewards.tsx` | Catalog management, fulfillment queue, goal boost |
| `routes/kid/rewards.tsx` | Rewards catalog for kids |
| `routes/kid/goals.tsx` | Savings goals for kids |

### Islands (Interactive Components)

| Island | Lines | Features |
|--------|-------|----------|
| `islands/BalanceCards.tsx` | 488 | Balance grid, Pay Out modal, earnings breakdown |
| `islands/RewardsCatalog.tsx` | 496 | Catalog display, claim modal, celebration |
| `islands/SavingsGoals.tsx` | 771 | Goal cards, progress bars, create/add/delete modals |
| `islands/ParentRewards.tsx` | 563 | 3-tab UI: Pending, Catalog, Goals with CRUD + boost |

**UX patterns**:
- Positive framing: "Claim" not "Buy", green success states
- Family-friendly language: "Rewards to Give" not "Awaiting Fulfillment"
- Celebration modals with bounce animation
- Balance preview before actions
- Custom modals (no browser `confirm()`)
- Info boxes explaining reward flow to parents

### Tests

| File | Steps | Coverage |
|------|-------|----------|
| `tests/services/balance-service.test.ts` | 27 | Types, conversion, validation, PIN |
| `tests/services/rewards-service.test.ts` | 27 | Types, filtering, claim validation |
| `tests/services/goals-service.test.ts` | 26 | Types, progress, achievement, boost |

**Total**: 80 test steps, all passing

---

## Navigation Integration

Added to `islands/AppHeader.tsx`:

```tsx
{/* Kid-only financial features */}
{!isParent && (
  <>
    <a href="/kid/rewards">🎁 Rewards</a>
    <a href="/kid/goals">🎯 My Goals</a>
  </>
)}

{/* Parent financial features */}
<a href="/parent/balances">💰 Balances</a>
<a href="/parent/rewards">🎁 Rewards</a>
```

---

## Security Considerations

### Authorization

| Action | Required Role | Additional Check |
|--------|---------------|------------------|
| View balances | Parent | Family membership |
| Process payout | Parent | PIN verification |
| Claim reward | Any | Balance check |
| Create goal | Any | Profile ownership |
| Delete goal | Owner OR Parent | Goal ownership check |
| Boost goal | Parent | Profile in family |

### Known Limitations

1. **Plaintext PIN fallback**: When bcrypt hash not present, falls back to plaintext comparison (matches existing pattern)
2. **No rate limiting**: Brute-force PIN protection not implemented
3. **Non-atomic balance updates**: Potential race condition on simultaneous claims (acceptable for MVP)

---

## Code Review Fixes

Post-implementation fixes applied:

| Issue | Fix | File |
|-------|-----|------|
| Prop mutation | Removed direct mutation of `selectedKid` | `BalanceCards.tsx` |
| Authorization gap | Added owner OR parent check for delete | `routes/api/goals/index.ts` |
| Browser confirm() | Replaced with custom modal | `SavingsGoals.tsx` |

---

## Cross-References

### Strategy & Design
- [Rewards Market Strategy](../planned/20260125_rewards_market_strategy.md) - Full market analysis and priority ranking
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Storage pattern rationale

### Related Features
- [Behavioral Insights (P1)](../planned/20260125_rewards_market_strategy.md#priority-1-behavioral-insights-highest-pareto) - Habit tracking (shipped same day)
- [Transaction Service](../../lib/services/transaction-service.ts) - Core point ledger

### UI Mockups
- See [Rewards Market Strategy - UI Design Mockups](../planned/20260125_rewards_market_strategy.md#ui-design-mockups-p2--p3) for original ASCII mockups

---

## Metrics

| Metric | Value |
|--------|-------|
| Total lines added | ~4,600 |
| New files | 19 |
| New tables | 0 |
| New migrations | 0 |
| Test coverage | 80 steps |

---

## FamilyScore Sync Integration (Jan 25, 2026 - Update)

All financial services now use `TransactionService` for point-changing operations, ensuring FamilyScore sync:

| Service Method | TransactionService Method | When Called |
|---------------|---------------------------|-------------|
| `RewardsService.fulfillPurchase()` | `recordRewardRedemption()` | Parent marks done |
| `BalanceService.processPayout()` | `recordCashOut()` | Parent processes payout |
| `GoalsService.addToGoal()` | `recordGoalContribution()` | Kid adds to goal |

**Note**: `claimReward()` does NOT create a transaction - it only creates a pending purchase request. The transaction is created when the parent fulfills (marks done).

This eliminates duplicate transaction logic and ensures all point changes sync to FamilyScore for real-time leaderboard updates.

---

## Parent Rewards Management (Jan 25, 2026 - Update)

Added `/parent/rewards` page with 3-tab interface:

| Tab | Features |
|-----|----------|
| **Pending** | Rewards to give queue with "Mark Done" button |
| **Catalog** | Add/Edit/Delete rewards, starter templates |
| **Goals** | View all kids' goals, parent boost feature |

### UX Language Improvements (Jan 24, 2026)

Replaced corporate/e-commerce jargon with family-friendly language:

| Before | After |
|--------|-------|
| "Awaiting Fulfillment" | "Rewards to Give" |
| "No pending rewards to fulfill" | "All caught up! No rewards owed right now." |
| "✓ Given" button | "Mark Done" button |

Added info box explaining the flow: "When kids claim a reward, it appears here. Points are only deducted when you tap 'Mark Done' after delivering the reward."

### Starter Rewards Pricing (Jan 24, 2026)

Updated starter rewards to reflect realistic 1 pt = $1 conversion:

| Reward | Old | New |
|--------|-----|-----|
| Movie Night Pick | 50 pts | 5 pts |
| Extra Screen Time | 75 pts | 5 pts |
| Pizza Topping Choice | 50 pts | 3 pts |
| Store Trip ($10) | 500 pts | 10 pts |
| Stay Up Late | 100 pts | **Removed** |

### Catalog UX Improvements (Jan 24, 2026)

**Grouped sections with clear labels:**
- **"✅ Your Family's Rewards"** — rewards kids can claim (with edit/delete)
- **"➕ Popular Rewards to Add"** — default templates to pick from

**Inline point editing for defaults:**
- Tap points value (e.g., "5 pts ✏️") to edit inline before adding
- No modal needed for simple point adjustments
- Custom points preserved when adding to family catalog

**Goals tab empty state:**
- Encourages parents to sit down with kids together
- "Go to 🎯 My Goals on their dashboard together"

### Kid Goals Page Polish (Jan 24, 2026)

Enhanced `/kid/goals` empty state with fun, engaging design:

**Visual improvements:**
- Bouncing 🎯 target icon animation
- Gradient mint background with dashed border
- White pill badges with hover effects

**Concrete goal examples with realistic prices:**
| Goal | Points |
|------|--------|
| 🍦 Ice cream | 10 pts |
| 🎮 Video game | 50 pts |
| 🎧 Headphones | 60 pts |
| 🎢 Theme park | 80 pts |

**Call-to-action:** "👨‍👩‍👧 Ask a parent to help you get started!"

---

## Completed Features ✅

1. ~~Purchase fulfillment tracking~~ - Parent marks rewards as delivered via `/parent/rewards`
2. ~~FamilyScore sync for financial transactions~~ - All services use TransactionService

## Next Steps

1. **P5: Kid-Initiated Reward Requests** - Allow kids to suggest rewards for parent approval
2. **Weekly allowance auto-deposit** - Optional recurring points addition
3. **Goal sharing** - Family can see and boost each other's goals

---

## Reward Approval Flow (Jan 24, 2026 - BREAKING CHANGE)

The reward claim flow was corrected to require parent approval before points are deducted:

### Old Flow (Incorrect)
1. Kid claims → Points immediately deducted, transaction created
2. Parent marks done → Just status update (no financial impact)

### New Flow (Correct)
1. Kid claims → Creates **pending** request (NO points deducted)
2. Parent "Mark Done" → Points deducted, transaction created, FamilyScore synced, activity logged

### Why This Change?
- Gives parents control over when rewards are actually "spent"
- Prevents accidental point deductions
- Aligns with real-world approval workflows (kid asks → parent approves)

### Technical Changes

| File | Change |
|------|--------|
| `lib/services/rewards-service.ts` | `claimReward()` now only creates pending purchase; `fulfillPurchase()` now creates transaction |
| `lib/types/finance.ts` | Added `"pending"` to `RewardPurchase.status` type |
| `lib/services/activity-service.ts` | Added `"reward_fulfilled"` activity type |
| `routes/api/rewards/fulfill.ts` | Updated to handle new return type with error messages |

### Database Impact

The `reward_purchases` table now uses these statuses:
- `pending` - Kid claimed, awaiting parent fulfillment
- `fulfilled` - Parent marked done, points deducted
- `cancelled` - Request cancelled (future feature)

---

## Kid Rewards UX Improvements (Jan 24, 2026)

Enhanced the kid-facing rewards page (`/kid/rewards`) with helpful messaging:

### Info Tip
Added explanation under "Available Rewards":
> "When you claim a reward, a parent will see it and give it to you."

### Encouraging Messages for Unaffordable Rewards
Instead of disabled "Not enough pts" button, now shows:
> "Earn 3 more pts 💪"

### Clearer Confirmation Modal
Updated to explain the approval flow:
> "A parent will see your request and give you this reward. Points will be deducted when they mark it done."

### Celebration Modal Updates
- Title: "Request Sent!" (not "Reward Claimed!")
- Message: "A parent will see your request. They'll give you this reward soon!"
- Button: "Got it!" (not "Done")

---

## Starter Templates for Empty Catalog (Jan 24, 2026)

Added one-tap starter rewards for new families on `/parent/rewards`:

| Reward | Points | Category |
|--------|--------|----------|
| 🎬 Movie Night Pick | 5 pts | entertainment |
| 🎮 Extra Screen Time | 5 pts | gaming |
| 🍕 Pizza Topping Choice | 3 pts | food |
| 🛒 Store Trip ($10) | 10 pts | other |

Parents can add any starter with one tap, or create custom rewards.

---

*Implemented: January 25, 2026*
*Updated: January 24, 2026 (Catalog UX, inline point editing, kid goals polish, parent-assist messaging)*
