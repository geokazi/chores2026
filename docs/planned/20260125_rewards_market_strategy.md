# Rewards & Financial Education Strategy - Market-Driven Roadmap

**Date**: January 25, 2026
**Status**: ✅ P1-P4 Implemented (P5 Pending)
**Context**: Market analysis of paid family chore app space (2026) + review of existing ChoreGami rewards implementation
**Depends On**: `rewards_system.md` (Jan 14 - DB schema + basic plan)
**Implementation**: [Balance, Rewards & Goals Milestone](../milestones/20260125_balance_rewards_goals_implementation.md)

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
  dollar_value_per_point: 1.00, // 1 point = $1.00 (default 1:1)
  weekly_allowance_cents: 500,  // Optional base $5/week per kid
  payout_requires_pin: true     // Parent PIN for cash out
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

## Hybrid Storage Architecture

**Decision**: Use JSONB for configuration, relational tables for transactions.

### Why Hybrid?

| Data Type | JSONB | Relational | Reasoning |
|-----------|-------|------------|-----------|
| **Rewards catalog** | ✅ | — | Small, family-specific, flexible schema |
| **Savings goals** | ✅ | — | Per-kid config, rarely queried across families |
| **Pending requests** | ✅ | — | Low volume, workflow state |
| **Purchases** | — | ✅ | Needs FK to transactions, audit trail |
| **Transactions** | — | ✅ | Core ledger, already exists |

### Storage Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JSONB (Configuration)                           │
├─────────────────────────────────────────────────────────────────────────┤
│ families.settings.apps.choregami.rewards.catalog[]                      │
│   → Parent-defined rewards (name, icon, pointCost, category, limits)    │
│                                                                         │
│ families.settings.apps.choregami.rewards.pending_requests[]             │
│   → Kid-initiated reward requests awaiting parent approval              │
│                                                                         │
│ family_profiles.preferences.apps.choregami.goals[]                      │
│   → Per-kid savings goals (name, target, current, icon)                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      Relational (Transactions)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ choretracker.chore_transactions                                         │
│   → All point changes (chore_completed, reward_redemption, etc.)        │
│   → FK: profile_id → family_profiles.id                                 │
│                                                                         │
│ choretracker.reward_purchases                                           │
│   → Purchase records linking rewards to transactions                    │
│   → FK: transaction_id → chore_transactions.id                          │
│   → FK: profile_id → family_profiles.id                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### JSONB Schema: Rewards Catalog

```jsonc
// families.settings.apps.choregami.rewards
{
  "catalog": [
    {
      "id": "uuid-1",           // Generated client-side
      "name": "Movie Night Pick",
      "description": "Choose the family movie",
      "icon": "🎬",
      "pointCost": 600,         // In points (converted to dollars in UI)
      "category": "entertainment",
      "isActive": true,
      "maxPerWeek": null,       // Optional limit
      "maxPerMonth": null,
      "createdAt": "2026-01-25T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "name": "Extra Gaming Time",
      "description": "1 hour of extra screen time",
      "icon": "🎮",
      "pointCost": 500,
      "category": "gaming",
      "isActive": true
    }
  ],
  "pending_requests": [
    {
      "id": "req-uuid-1",
      "requestedBy": "kid-profile-uuid",
      "rewardName": "Sleepover",
      "suggestedPointCost": 2000,
      "suggestedIcon": "🏠",
      "reason": "For getting all A's",
      "requestedAt": "2026-01-25T14:00:00Z",
      "status": "pending"       // pending | approved | rejected
    }
  ]
}
```

### JSONB Schema: Savings Goals

```jsonc
// family_profiles.preferences.apps.choregami.goals
{
  "goals": [
    {
      "id": "goal-uuid-1",
      "name": "Nintendo Game",
      "description": "Save for new Mario game",
      "targetAmount": 5000,     // Points
      "currentAmount": 2300,    // Updated on each contribution
      "icon": "🎮",
      "category": "gaming",
      "targetDate": "2026-03-01",
      "isAchieved": false,
      "achievedAt": null,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### Transaction Integration

Reward claims use the existing `TransactionService` (same pattern as chore completions):

```typescript
// lib/services/transaction-service.ts already supports reward_redemption

// When kid claims a reward:
await transactionService.createTransaction({
  profileId: kidProfileId,
  familyId,
  transactionType: "reward_redemption",  // Already in allowed types
  pointsChange: -reward.pointCost,        // Negative = deduction
  description: `Claimed: ${reward.name}`,
  metadata: {
    rewardId: reward.id,
    rewardIcon: reward.icon,
    rewardName: reward.name,
    category: reward.category
  }
});

// TransactionService automatically:
// 1. Updates family_profiles.current_points
// 2. Syncs to FamilyScore via notifyFamilyScore()
// 3. Creates audit trail in chore_transactions
```

### Purchase Record (Relational)

After transaction succeeds, record the purchase for history/fulfillment:

```typescript
// Insert into reward_purchases table
await supabase
  .schema("choretracker")
  .from("reward_purchases")
  .insert({
    family_id: familyId,
    profile_id: kidProfileId,
    reward_id: reward.id,           // References JSONB catalog item
    transaction_id: transactionId,  // FK to chore_transactions
    point_cost: reward.pointCost,
    status: "purchased",            // purchased | fulfilled | cancelled
    reward_snapshot: {              // Denormalized for history
      name: reward.name,
      icon: reward.icon,
      category: reward.category
    }
  });
```

### Why This Hybrid Works

| Benefit | Explanation |
|---------|-------------|
| **Flexible catalog** | Add new reward fields without migrations |
| **Per-family customization** | Each family defines their own rewards |
| **Transactional integrity** | Purchases tied to ledger via FK |
| **Audit trail** | All point changes in `chore_transactions` |
| **FamilyScore sync** | Existing TransactionService handles sync |
| **No cross-family queries** | Rewards are family-specific anyway |

### Migration Path

1. **Keep `reward_purchases` table** — already exists, handles transactions
2. **Deprecate `available_rewards` table** — move to JSONB catalog
3. **Deprecate `savings_goals` table** — move to JSONB preferences
4. **Deprecate `reward_requests` table** — move to JSONB pending_requests

**Note**: Tables remain in DB for historical data; new data goes to JSONB.

---

## Feature Priority (Effort-to-Value Ranked)

### Priority 1: Behavioral Insights (Highest Pareto)

**Why first**: Zero new tables, leverages existing `chore_transactions` data,
strongest "why parents pay" story.

**Status**: ✅ **IMPLEMENTED** (January 25, 2026)

**Features delivered**:
- 12-week consistency trend per kid (template-aware expected days)
- Streak with 1-day recovery (diffDays <= 2), prevents single-miss frustration
- Habit milestones: Building (7d) → Strengthening (14d) → Forming (21d) → Formed (30d)
- Morning vs evening routine breakdown (timezone-aware via profile preferences)
- Weekly digest enhanced with consistency % and recovery-based streaks
- Consistency-based insight one-liners in digest emails/SMS

**Template-aware logic**:
- Families with rotation templates: expected days from preset schedule config
- Manual-only families: expected days from `chore_assignments.assigned_date`
- All current presets (daily-basics, weekend-warrior, smart-rotation, dynamic-daily,
  school-year) assign 7 days/week, so daily streaks are valid for all template families

**Monetization story**: "See proof your approach is working. Ciku's morning
routine consistency went from 40% to 85% over 6 weeks."

**Implementation** (actual):
```
routes/parent/insights.tsx          # ~136 lines (server handler, new user detection)
islands/HabitInsights.tsx           # ~541 lines (Getting Started + full 12-week views)
lib/services/insights-service.ts    # ~546 lines (analytics engine + thisWeekActivity)
lib/services/insights-service_test.ts # 21 unit tests for date math, timezone, streaks, consistency
lib/services/email-digest.ts        # Enhanced: imports shared streak/consistency from insights-service
islands/ParentDashboard.tsx         # Added: "Habit Insights" link in actions
```

**New user experience** (January 25, 2026):
- Detects new users (< 7 days of activity) and shows "Getting Started" view
- Progress bar: "Day X of 7" with rationale ("to build enough data for meaningful trends")
- This Week view: Mon-Sun checkmarks for current week per kid
- Encouraging messages based on streak length ("🔥 2-day streak — keep it up!")
- Zero-activity kids see "✨ Ready when you are!" (not blank card)
- Auto-transitions to full 12-week view once user has 7+ days of data

**Navigation integration** (January 25, 2026):
- "🧠 Habit Insights" link added to left nav menu (parent-only)
- Insights page now has full AppHeader with consistent navigation
- Clearer menu labels: "👥 Switch User" and "⚙️ Settings"

**Shared utility exports** (insights-service.ts):
- `getLocalHour(isoTimestamp, timezone)` — extract hour (0-23) in family timezone
- `getLocalDate(isoTimestamp, timezone)` — extract YYYY-MM-DD in family timezone
- `calculateStreak(transactionDates)` — current streak with 1-day recovery
- `calculateConsistency(transactionDates, expectedPerWeek)` — template-aware 30-day %
- `getExpectedDaysForProfile(familySettings, profileId)` — expected days from rotation config

**Key design decisions**:
- **Single DB query**: `getInsights()` fetches 90 days of transactions once, passes in-memory data
  to all three compute methods. Reduces DB round-trips from 3-4 to 1-2.
- **Current-week accuracy**: Caps expected days to `Math.min(expected, daysSoFar)` for incomplete
  weeks so consistency % isn't artificially low early in the week.
- **Template-aware consistency** (both insights page AND email digest): Uses
  `getExpectedDaysForProfile()` to compute expected days from family rotation settings.
  Weekend Warrior (5d/week) families see accurate % in both views.
- **Timezone-aware trend calculation**: `getLocalDate()` converts UTC timestamps to family timezone
  before week bucketing, preventing off-by-one day errors around midnight.
- Pure CSS bars — no chart library dependency
- `Intl.DateTimeFormat` with `hourCycle: "h23"` for timezone-safe hour extraction
- Streak recovery: `diffDays <= 2` allows 1 gap day (aligned with gamification research)
- `getRotationConfig()` reads `families.settings.apps.choregami.rotation` JSONB
- Per-kid error handling: malformed data for one kid doesn't crash the whole page
- Typed interfaces (`TransactionRow`, `AssignmentRow`) replace `any[]` casts
- Single Supabase client: route reuses `InsightsService.getTimezone()` instead of creating a second client
- **No duplicate logic**: `email-digest.ts` imports streak/consistency functions from insights-service
  (single source of truth for all date math)

**Cross-references**:
- [Streak Brainstorm UX](20260114_streak_brainstorm_ux.md) — original design exploration
- [Weekly Digest Enhancement](../marketing/20260123_weekly_digest_enhancement.md) — digest integration
- [Weekly Patterns Analysis](../milestones/20260114_weekly_patterns_analysis.md) — 60-day heatmap (separate feature)
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) — `families.settings` structure

**Effort**: ~1220 lines (service + island + route + new user UX), 0 new tables
**Timeline dependency**: None, can ship independently

---

### Priority 2: Balance & Pay Out (Real Money Bridge)

**Status**: ✅ **IMPLEMENTED** (January 25, 2026)

**Why second**: This is the **moat**. Pay Out is the real-world bridge that makes
financial education tangible. "My kid earned $47 this month" is the outcome
parents will pay for. Without real money, it's just points/gamification.

**Strategic rationale**:
- Competitors (BusyKid, Greenlight) differentiate on real money outcomes
- Parents value tangible results over in-app rewards
- Establishes the money visibility that P3/P4 build upon
- Lower effort than Rewards (~200 lines vs ~360 lines)

**Features**:
- Per-kid balance view (points × `dollar_value_per_point` = dollars)
- Earnings breakdown: chore earnings vs weekly allowance (if enabled)
- Pay Out action (parent PIN required, proper modal)
- Transaction history (filtered view of `chore_transactions`)
- Optional: weekly allowance auto-deposit

**Key design decisions**:
- Pay Out is on Balance screen, NOT a reward catalog item
- Amount input is a styled modal, NOT browser `prompt()`
- Balance is a sub-view of parent dashboard, NOT a top-level tab
- Derive balance from `SUM(chore_transactions)` — no new column needed

**Implementation**:
```
routes/parent/balances.tsx     # ~60 lines (per-kid balance cards)
islands/BalanceCards.tsx       # ~80 lines (cards + pay out trigger)
islands/PayOutModal.tsx        # ~60 lines (amount input + PIN)
routes/api/payout.ts           # ~40 lines (TransactionService call)
```

**Transaction integration** (uses existing TransactionService):
```typescript
await transactionService.createTransaction({
  profileId: kidProfileId,
  familyId,
  transactionType: "payout",  // Already in allowed types
  pointsChange: -payoutPoints,
  description: `Paid out $${amount}`,
  metadata: { payoutAmountCents: amount * 100 }
});
```

**Effort**: ~240 lines, 0 new tables, 0 new columns
**Timeline dependency**: None, can ship independently

---

### Priority 3: Rewards Marketplace

**Status**: ✅ **IMPLEMENTED** (January 25, 2026)

**Why third**: In-app rewards are nice-to-have, not core value. Kids can spend
points on family-defined rewards, but real money (P2) is the differentiator.

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

#### Legacy Repo Reference

**Source**: `/Users/georgekariuki/repos/deno2/fresh-auth/`

| Legacy File | Lines | What to Extract |
|-------------|-------|-----------------|
| `migrations/chore-tracker-v2/015_create_rewards_system.sql` | 241 | Schema reference (tables exist in prod) |
| `lib/services/chore-tracker-v2/types.ts` | 342-446 | Type definitions for rewards |
| `lib/services/chore-tracker-v2/rewards.service.ts` | 916 | Core methods (simplify to ~50 lines) |
| `routes/api/chore-tracker-v2/rewards.ts` | 500 | API patterns |
| `islands/chore-tracker-v2/RewardsScreen.tsx` | — | UI patterns (redesign needed) |

#### Production Database Schema (Already Exists)

```sql
-- choretracker.available_rewards
id, family_id, name, description, icon, point_cost,
category (gaming|entertainment|food|activities|other),
is_active, max_per_week, max_per_month, created_at

-- choretracker.reward_purchases
id, family_id, profile_id, reward_id, transaction_id,
point_cost, status (purchased|fulfilled|cancelled),
fulfilled_at, fulfilled_by_profile_id, created_at

-- Also exists (for Priority 3):
-- choretracker.savings_goals
-- choretracker.reward_requests
```

#### Type Definitions to Copy

```typescript
// From legacy types.ts — simplified for 2026
interface AvailableReward {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  icon: string;           // Emoji, default '🎁'
  pointCost: number;
  category: "gaming" | "entertainment" | "food" | "activities" | "other";
  isActive: boolean;
  maxPerWeek?: number;
  maxPerMonth?: number;
}

interface RewardPurchase {
  id: string;
  profileId: string;
  rewardId: string;
  transactionId: string;  // Links to chore_transactions
  pointCost: number;
  status: "purchased" | "fulfilled" | "cancelled";
  rewardName?: string;    // Computed join
  rewardIcon?: string;    // Computed join
}

interface ClaimRewardPayload {
  rewardId: string;
  pointCost: number;
  profileId?: string;     // Kid claiming (defaults to session)
}
```

#### Service Methods to Implement

```typescript
// In lib/services/rewards-service.ts (~50 lines)
class RewardsService {
  // Fetch active rewards for family
  async getAvailableRewards(familyId: string): Promise<AvailableReward[]>

  // Validate points, create transaction, record purchase
  async claimReward(payload: ClaimRewardPayload): Promise<RewardPurchase>

  // Fetch last N purchases with reward names
  async getRecentPurchases(familyId: string, limit = 10): Promise<RewardPurchase[]>
}
```

#### Transaction Integration

Reward claims create `reward_redemption` transactions (type already exists):
```typescript
// Uses existing TransactionService
await transactionService.recordTransaction({
  familyId,
  profileId: kidProfileId,
  transactionType: "reward_redemption",  // Already in allowed types
  pointsChange: -pointCost,              // Negative = deduction
  description: `Claimed: ${reward.name}`,
  metadata: { rewardId: reward.id, rewardIcon: reward.icon }
});
```

#### UX Redesign (vs Legacy)

| Legacy Pattern | 2026 Redesign |
|----------------|---------------|
| Browser `prompt()` for amounts | Proper modal with balance display |
| "Buy" button with red `-$17.00` | "Claim" button, green confirmation |
| "Cash Out" in rewards catalog | Separate Pay Out action (Priority 4) |
| 5-tab navigation (Rewards tab) | Sub-route `/kid/rewards` from dashboard |
| 916-line service with all features | ~50 lines (just catalog + claim) |
| Complex status tracking | Simple: claimed → parent fulfills IRL |

#### UI Mockup

```
┌─────────────────────────────────────────────────┐
│ ← Back              Rewards Store               │
├─────────────────────────────────────────────────┤
│                                                 │
│ 💰 Your Balance: 107 pts ($107.00)              │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎬 Movie Night Pick                         │ │
│ │ Choose the family movie                     │ │
│ │                              $6.00  [Claim] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🍕 Pizza Night Choice                       │ │
│ │ Pick the family pizza toppings              │ │
│ │                              $8.00  [Claim] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎮 Extra Gaming Time                        │ │
│ │ 1 hour of extra screen time                 │ │
│ │                              $5.00  [Claim] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Note**: No "Cash Out" in catalog — that's a separate Pay Out action (Priority 4).

#### Psychological Framing

**Language guidelines** (positive framing for kids):

| Avoid (Negative) | Use Instead (Positive) |
|------------------|------------------------|
| "Spend" | "Claim" or "Redeem" |
| "Purchase" | "Reward Claimed" |
| "Cost" | "Value" or "Points" |
| "-$17.00" (red) | "$17.00 claimed" (green) |
| "Recent Purchases" | "Rewards Claimed" |
| "You spent" | "You earned and claimed" |

**Color coding**:

| Action | Color | Rationale |
|--------|-------|-----------|
| Points earned | Green | Positive reinforcement |
| Rewards claimed | Green or Blue | Achievement, not loss |
| Balance | Primary color | Neutral, informational |

**Never use red for spending** — it implies negativity and discourages healthy reward claiming.

#### Implementation Plan (Hybrid Architecture)

```
routes/kid/rewards.tsx              # ~80 lines (catalog page, reads JSONB)
islands/RewardsCatalog.tsx          # ~100 lines (grid + claim modal)
routes/api/rewards/claim.ts         # ~60 lines (TransactionService + purchase record)
routes/api/rewards/catalog.ts       # ~40 lines (CRUD for JSONB catalog)
lib/services/rewards-service.ts     # ~80 lines (JSONB helpers + claim logic)
```

**Storage**:
- **Catalog**: `families.settings.apps.choregami.rewards.catalog[]` (JSONB)
- **Purchases**: `choretracker.reward_purchases` (relational, keeps FK to transactions)
- **Transactions**: `choretracker.chore_transactions` (existing ledger)

**Claim Flow**:
```typescript
// 1. Validate reward exists in JSONB catalog
const catalog = family.settings.apps?.choregami?.rewards?.catalog || [];
const reward = catalog.find(r => r.id === rewardId && r.isActive);

// 2. Check balance
if (profile.current_points < reward.pointCost) throw new Error("Insufficient points");

// 3. Create transaction (uses existing TransactionService)
const txResult = await transactionService.createTransaction({
  profileId, familyId,
  transactionType: "reward_redemption",
  pointsChange: -reward.pointCost,
  description: `Claimed: ${reward.name}`,
  metadata: { rewardId: reward.id, rewardIcon: reward.icon }
});

// 4. Record purchase (relational, for history/fulfillment)
await supabase.schema("choretracker").from("reward_purchases").insert({
  family_id: familyId,
  profile_id: profileId,
  reward_id: reward.id,
  transaction_id: txResult.id,
  point_cost: reward.pointCost,
  status: "purchased",
  reward_snapshot: { name: reward.name, icon: reward.icon }
});
```

**Effort**: ~360 lines, 0 new tables, 0 migrations
**Timeline dependency**: None, can ship independently

---

### Savings Goals Implementation (P4 Reference)

**Context**: Detailed implementation guide for Priority 4 (Savings Goals).
Highest-value financial education feature. "I'm saving $40 for a game" is
concrete, motivating, and teaches delayed gratification.

**Features**:
- Kid creates a goal (name, target amount, optional deadline)
- Progress bar shows current vs target
- Auto-updates as points/dollars accumulate
- Celebration when goal achieved
- Parent can "boost" (contribute toward goal)

#### Hybrid Architecture (JSONB)

**Storage**: `family_profiles.preferences.apps.choregami.goals[]`

Per-kid savings goals stored in profile preferences (not family-level).
See [Hybrid Storage Architecture](#hybrid-storage-architecture) for rationale.

**JSONB Schema**:
```jsonc
// family_profiles.preferences.apps.choregami.goals
{
  "goals": [
    {
      "id": "goal-uuid-1",
      "name": "Nintendo Game",
      "description": "Save for new Mario game",
      "targetAmount": 5000,
      "currentAmount": 2300,
      "icon": "🎮",
      "category": "gaming",     // toys | electronics | experiences | books | other
      "targetDate": "2026-03-01",
      "isAchieved": false,
      "achievedAt": null,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

**Type Definition**:
```typescript
interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;           // Default '🎯'
  category: "toys" | "electronics" | "experiences" | "books" | "other";
  targetDate?: string;
  isAchieved: boolean;
  achievedAt?: string;
  createdAt: string;
}
```

**Key Operations**:
```typescript
// Get goals for a kid
const goals = profile.preferences?.apps?.choregami?.goals || [];

// Add to goal (JSONB update)
const updatedGoals = goals.map(g => {
  if (g.id !== goalId) return g;
  const newAmount = Math.min(g.currentAmount + points, g.targetAmount);
  const isAchieved = newAmount >= g.targetAmount;
  return {
    ...g,
    currentAmount: newAmount,
    isAchieved,
    achievedAt: isAchieved ? new Date().toISOString() : null
  };
});

await supabase.from("family_profiles")
  .update({ preferences: { ...prefs, apps: { ...apps, choregami: { ...cg, goals: updatedGoals }}}})
  .eq("id", profileId);
```

**Implementation**:
```
routes/kid/goals.tsx           # ~80 lines (goals page, reads JSONB)
islands/SavingsGoals.tsx       # ~100 lines (create/view goals)
islands/GoalProgress.tsx       # ~50 lines (progress bar + celebration)
routes/api/goals/index.ts      # ~60 lines (JSONB CRUD)
```

**DB**: JSONB in `family_profiles.preferences` (no new tables)

**Migration from legacy table**:
- `choretracker.savings_goals` table exists but will be deprecated
- New goals go to JSONB; existing data migrated on first access

**Effort**: ~290 lines, 0 new tables, 0 migrations
**Timeline dependency**: Rewards (Priority 2) should exist first so kids
understand their balance before setting goals

---

## UI Design Mockups (P2 & P3)

### Kid View: Rewards Catalog (`/kid/rewards`)

```
┌─────────────────────────────────────────────────┐
│ ← Back              Rewards                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  💰 Your Balance                                │
│  ┌─────────────────────────────────────────┐   │
│  │     247 pts                             │   │
│  │     ($247.00)                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🎁 Available Rewards                           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎬  Movie Night Pick                    │   │
│  │     Choose the family movie             │   │
│  │                                         │   │
│  │     50 pts          [  Claim  ]         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🍕  Pizza Topping Choice                │   │
│  │     Pick your favorite toppings         │   │
│  │                                         │   │
│  │     75 pts          [  Claim  ]         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎮  Extra Gaming Time                   │   │
│  │     1 hour of extra screen time         │   │
│  │                                         │   │
│  │     100 pts         [  Claim  ]         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🛒  Trip to Store                       │   │
│  │     Pick something under $10            │   │
│  │                                         │   │
│  │     500 pts     [ Not enough pts ]      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  💡 Want something else?                        │
│  [  Request a Reward  ]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Claim Confirmation Modal

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Claim this reward?                 │
│                                                 │
│         ┌───────────────────────┐              │
│         │                       │              │
│         │         🎬            │              │
│         │                       │              │
│         │   Movie Night Pick    │              │
│         │                       │              │
│         │      50 pts           │              │
│         │                       │              │
│         └───────────────────────┘              │
│                                                 │
│  Your balance: 247 pts                          │
│  After claim:  197 pts                          │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │            [  Yes, Claim!  ]            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [ Cancel ]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Claim Success Celebration

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│                    🎉                           │
│                                                 │
│              Reward Claimed!                    │
│                                                 │
│         ┌───────────────────────┐              │
│         │         🎬            │              │
│         │   Movie Night Pick    │              │
│         └───────────────────────┘              │
│                                                 │
│        Ask a parent to fulfill                 │
│             your reward!                        │
│                                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     New Balance: 197 pts ($197.00)      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│           [  Back to Rewards  ]                 │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Parent View: Manage Rewards (`/parent/rewards`)

```
┌─────────────────────────────────────────────────┐
│ ← Back           Family Rewards                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 Recent Claims                               │
│  ┌─────────────────────────────────────────┐   │
│  │ Ciku claimed 🎬 Movie Night Pick        │   │
│  │ Today at 3:42 PM              ○ Pending │   │
│  ├─────────────────────────────────────────┤   │
│  │ Mwangi claimed 🎮 Extra Gaming Time     │   │
│  │ Yesterday                     ✓ Done    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🎁 Rewards Catalog                [+ Add New]  │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎬  Movie Night Pick              50pts │   │
│  │     ✓ Active                     [Edit] │   │
│  ├─────────────────────────────────────────┤   │
│  │ 🍕  Pizza Topping Choice          75pts │   │
│  │     ✓ Active                     [Edit] │   │
│  ├─────────────────────────────────────────┤   │
│  │ 🎮  Extra Gaming Time            100pts │   │
│  │     ✓ Active                     [Edit] │   │
│  ├─────────────────────────────────────────┤   │
│  │ 🛒  Trip to Store                500pts │   │
│  │     ✓ Active                     [Edit] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📬 Pending Requests (1)                        │
│  ┌─────────────────────────────────────────┐   │
│  │ Ciku requested: "Sleepover"             │   │
│  │ Suggested: 200pts                       │   │
│  │ "For getting all A's"                   │   │
│  │                                         │   │
│  │ [  Approve  ]      [ Decline ]          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Add/Edit Reward Modal (Parent)

```
┌─────────────────────────────────────────────────┐
│ ✕                Add Reward                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Icon                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ [🎬] [🍕] [🎮] [📱] [🛒] [🎁] [🏖️] [🎪] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Name                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ Movie Night Pick                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Description (optional)                         │
│  ┌─────────────────────────────────────────┐   │
│  │ Choose the family movie                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Point Cost                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ 50                              pts     │   │
│  └─────────────────────────────────────────┘   │
│  = $50.00 at current exchange rate              │
│                                                 │
│  Category                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ Entertainment                     ▼     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Limits (optional)                              │
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Per week: __ │  │ Per month: __        │   │
│  └──────────────┘  └──────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │           [  Save Reward  ]             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Kid View: Savings Goals (`/kid/goals`)

```
┌─────────────────────────────────────────────────┐
│ ← Back              My Goals                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  💰 Available to save: 247 pts                  │
│                                                 │
│  🎯 Active Goals                                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎮  Nintendo Game                       │   │
│  │                                         │   │
│  │  ━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━  │   │
│  │                                         │   │
│  │  2,300 / 5,000 pts         46%         │   │
│  │  ($2,300 / $5,000)                      │   │
│  │                                         │   │
│  │  🗓️ Target: March 1, 2026               │   │
│  │                                         │   │
│  │  [  + Add Points  ]                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎸  Guitar Lessons                      │   │
│  │                                         │   │
│  │  ━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                         │   │
│  │  150 / 1,200 pts           12%         │   │
│  │  ($150 / $1,200)                        │   │
│  │                                         │   │
│  │  [  + Add Points  ]                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ✨ Completed Goals                             │
│  ┌─────────────────────────────────────────┐   │
│  │ ⭐ Lego Set               500pts  ✓    │   │
│  │    Achieved Jan 10, 2026               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [  + Create New Goal  ]                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Add Points to Goal Modal

```
┌─────────────────────────────────────────────────┐
│                                                 │
│            Add to your goal                     │
│                                                 │
│         ┌───────────────────────┐              │
│         │         🎮            │              │
│         │    Nintendo Game      │              │
│         │                       │              │
│         │   2,300 / 5,000 pts   │              │
│         └───────────────────────┘              │
│                                                 │
│  How much do you want to save?                  │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  [  50  ] [ 100 ] [ 200 ] [ All ]       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Or enter amount:                               │
│  ┌─────────────────────────────────────────┐   │
│  │ ___                             pts     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Your balance: 247 pts                          │
│  After saving: 147 pts                          │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         [  Save 100 pts  ]              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [ Cancel ]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Goal Achieved Celebration

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│                   🎉🎊🎉                        │
│                                                 │
│              GOAL ACHIEVED!                     │
│                                                 │
│         ┌───────────────────────┐              │
│         │         🎮            │              │
│         │    Nintendo Game      │              │
│         │                       │              │
│         │      5,000 pts        │              │
│         │      ($5,000)         │              │
│         └───────────────────────┘              │
│                                                 │
│       You saved for 47 days!                   │
│                                                 │
│       Ask a parent about getting              │
│            your reward!                         │
│                                                 │
│                                                 │
│           [  Back to Goals  ]                   │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Create New Goal Modal

```
┌─────────────────────────────────────────────────┐
│ ✕              Create a Goal                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  What are you saving for?                       │
│                                                 │
│  Icon                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ [🎮] [🎸] [📱] [👟] [🎨] [📚] [🏀] [🎁] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Name                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ Nintendo Game                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  How much do you need?                          │
│  ┌─────────────────────────────────────────┐   │
│  │ 5000                            pts     │   │
│  └─────────────────────────────────────────┘   │
│  = $5,000.00                                    │
│                                                 │
│  Target date (optional)                         │
│  ┌─────────────────────────────────────────┐   │
│  │ March 1, 2026                    📅     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          [  Create Goal  ]              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Navigation Integration

```
┌─────────────────────────────────────────────────┐
│  ☰  ChoreGami                    Ciku  👤      │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📋  My Chores                          │   │
│  │  🎁  Rewards               ← P2         │   │
│  │  🎯  My Goals              ← P3         │   │
│  │  🏆  Leaderboard                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### UI Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Positive framing** | "Claim" not "Buy", green success states |
| **Low cognitive load** | One action per screen, clear hierarchy |
| **Mobile-first** | Large tap targets (min 44px), card-based layout |
| **Encouraging** | Celebration animations, progress visualization |
| **Parent oversight** | Pending claims visible, fulfillment tracking |
| **Balance visibility** | Always show current points before actions |

---

### Priority 4: Savings Goals

**Status**: ✅ **IMPLEMENTED** (January 25, 2026)

**Why fourth**: Builds on P2's balance visibility. Kids see their real money
balance and naturally want to save toward concrete goals.

**Features**:
- Kid creates a goal (name, target amount, optional deadline)
- Progress bar shows current vs target
- Auto-updates as points/dollars accumulate
- Celebration when goal achieved
- Parent can "boost" (contribute toward goal)

See [Savings Goals Implementation](#savings-goals-implementation-p4-reference) for full
implementation details and JSONB schema.

**Effort**: ~290 lines, 0 new tables
**Timeline dependency**: P2 (Balance) for money visibility, P3 (Rewards) optional

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
**Timeline dependency**: P3 (Rewards catalog must exist)

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
| 2026-01-25 | Exchange rate in settings, not wizard | Old app's multi-screen Points Configuration is over-built; 2 fields in Settings suffice |
| 2026-01-25 | Skip special bonuses (Reading/Kindness) | Hardcoded categories are inflexible; existing manual bonus awards are more powerful |
| 2026-01-25 | Skip approval for savings goals | Kids setting goals is always positive behavior — don't gate it |
| 2026-01-25 | Green progress bars, not red | Red signals danger; savings progress is positive |

---

## Screenshot-Validated Insights (Old ChoreGami App)

### Validated: Savings Goals Have Real Usage

The old app shows real user data: "New Bike - Ciku $45.00 / $160.00" with
active progress. This confirms Priority 3 (Savings Goals) is worth building.
Kids engage with concrete targets.

**What works**: Dollar targets, progress visualization, per-kid attribution,
"+ Add Goal" button.

**What to fix**: Red progress bars (use green), tiny edit/delete icons
(use swipe or detail page), no completion celebration, no target dates,
duplicate entries possible (needs idempotency).

### Validated: Weekly Activity Summary

"This Week's Activity" card shows 3 numbers: $7.00 Earned | 7 Chores Done |
$0.00 Spent. High information density, parents check this daily.

**Port to 2026**: Add to parent dashboard as a summary card. Simple aggregate
query on chore_transactions for current week.

### Validated: Transaction Type Filtering

Filter dropdown shows: All Types / Chore Completed / Cash Out / Bonus /
Penalty / Adjustment. Maps cleanly to existing `transaction_type` enum.

**Mapping to ChoreGami 2026**:

| Old App Filter | 2026 `transaction_type` | Status |
|---------------|------------------------|--------|
| Chore Completed | `chore_completed` | Exists |
| Cash Out | `payout` | New |
| Bonus | `bonus_award` | Exists |
| Penalty | `manual_adjustment` (negative) | Exists |
| Adjustment | `manual_adjustment` | Exists |

Only `payout` transaction type needs adding.

### Validated: Points Configuration Exists

Old app has "Quick Points Setup" with exchange rate picker (25¢/50¢/$1) and
cash-out approval toggle. Also advanced mode with Payment Policy, Special
Bonuses, and granular Approval Settings.

**For 2026**: Reduce to 2 settings fields in Family Settings:

```typescript
// families.settings.apps.choregami.finance
{
  dollar_value_per_point: 1.00, // 1 point = $1 (can be 0.25, 0.50, 1.00)
  payout_requires_approval: true
}
```

No dedicated "Points Configuration" page needed.

---

## UX Fixes Catalog (Old App → 2026)

| Old App Pattern | Problem | 2026 Fix |
|----------------|---------|----------|
| `-$17.00` in red | Negative framing discourages | "Claimed: Book" in green/blue |
| Red progress bars on goals | Red = danger, not progress | Green/primary progress bars |
| Mixed pts/$ in same view | "174 pts" next to "$7.00" confuses | Show conversion or pick one per context |
| Browser `prompt()` for Pay Out | Janky, breaks mobile UX | Proper in-app modal |
| "Cash Out" in reward catalog | Withdrawal != purchase | Separate action on Balance screen |
| Tiny edit/delete icons | Touch targets too small (< 44px) | Swipe actions or detail page |
| "Buy" button on rewards | Spending language | "Claim" button |
| "Recent Purchases" header | Implies money lost | "Rewards Claimed" |
| Yellow star cards for transactions | Over-decorated | Simple list items with color-coded amounts |
| 5-tab navigation | Too complex for kid-facing app | 2-dashboard architecture with sub-routes |

---

## Pareto Principle vs Market Reality vs Moat

### The Balance

Building a product requires balancing three tensions:

| Principle | Says... | Risk if over-indexed |
|-----------|---------|---------------------|
| **Pareto (80/20)** | Ship minimum viable features first | Under-differentiated, lost in commodity space |
| **Market fit** | Build what competitors lack | Over-engineering, never ships |
| **Moat** | Invest in hard-to-copy advantages | Gold-plating features nobody needs yet |

### How We're Balancing

**Pareto applied correctly**:
- 0 new database tables (all exist)
- ~1350 total lines across 5 priorities
- Each priority is independently shippable
- Behavioral insights (P1) is literally just read queries on existing data
- Rewards (P2) reuses 2 existing tables + existing transaction service

**Market factors respected**:
- Dollar-denominated rewards (not abstract points) — financial education angle
- Savings goals — the feature competitors charge for
- Exchange rate flexibility — serves both "money families" and "gamification families"
- Positive framing — psychological differentiation from red-negative competitors

**Moat identified and invested in**:
- Real-time WebSocket gamification (FamilyScore) — NO competitor has this
- Behavioral insights (habit formation proof) — competitors show history, not trends
- Hybrid points+dollars — competitors are points-only OR money-only, not both
- No banking dependency — lower barrier than BusyKid/Greenlight, same educational outcome

### What We're NOT Building (Pareto says skip)

| Feature | Why Skip | Market Pressure |
|---------|----------|-----------------|
| Debit cards | Banking compliance, partnerships | BusyKid/Greenlight own this; can't compete |
| Offline-first | Architectural rework for edge case | Few families truly offline |
| Smart-home integration | Huge effort, fragmented ecosystem | No competitor has cracked this either |
| Co-parent split household | Auth/permissions rework | Real pain but too complex for MVP |
| Advanced approval workflows | Over-engineering | One toggle (approval on/off) covers 95% |
| Special bonus categories | Inflexible hardcoded list | Manual bonus awards already exist |
| Multi-screen config wizards | UX bloat | 2-3 fields in Settings suffice |

### The Moat Test

For each feature, ask: **"If a competitor copies our feature list tomorrow,
what still makes us better?"**

1. **Real-time updates** — requires WebSocket architecture + FamilyScore integration.
   Competitors can't retrofit this onto polling-based apps.

2. **Behavioral insights** — requires accumulated transaction history + smart queries.
   New apps have no data; existing apps haven't built the analytics layer.

3. **Hybrid points/dollars** — requires architectural flexibility in the transaction
   system. Competitors are locked into one currency model.

4. **Positive UX framing** — requires intentional design discipline.
   Competitors have shipped "spend/buy/negative" language for years; changing
   it means retraining their entire user base.

### Verdict

The current plan is correctly balanced:
- **Pareto**: Each priority is minimal viable (200-320 lines, 0 migrations)
- **Market**: Features address the "why pay $5/month?" question directly
- **Moat**: Real-time + insights + hybrid model = hard to replicate quickly

The one risk: shipping P1-P3 without validating willingness to pay.
Consider a beta cohort or waitlist before building P4-P5.

---

## References

- `docs/planned/rewards_system.md` — DB schema, API endpoints, Phase 1 plan
- `lib/services/rotation-service.ts` — Template activation pattern (for savings goal milestones)
- `routes/api/rotation/complete.ts` — Transaction recording pattern
- Old app reference: `/Users/georgekariuki/repos/deno2/fresh-auth/lib/services/chore-tracker-v2/rewards.service.ts`

---

## Deep Market Research (January 25, 2026)

### Competitor Deep Dive

#### BusyKid ($4/month, billed annually at $48/year)
- **Model**: Chore-to-payment with real Visa debit card
- **Key features**: Save/Spend/Share buckets, 4000+ stocks & ETFs, weekly
  "Payday" with parent approval, 60 vetted charities for donations, parent-set
  interest on savings
- **Strengths**: Cheapest with real card, strong work-to-earnings link, no
  commission stock trades
- **Weaknesses**: Utilitarian interface, limited gamification (just checkboxes),
  Plaid bank connection errors, requires more initial setup
- **Target**: Ages 5-17, families wanting direct chore-to-money connection

#### Greenlight ($5.99-$24.98/month, 4 tiers)
- **Model**: Family banking platform with chores as one feature
- **Key features**: FDIC-insured debit cards (up to 5 kids), savings rewards
  (1-5% by tier), ETF/stock investing from $1 fractional shares, flexible
  allowance (tied to chores or standalone), real-time purchase notifications
- **Scale**: 6 million+ users as of January 2025
- **Tiers**: Core ($5.99) → Max ($10.98) → Infinity ($15.98) → Family Shield ($24.98)
- **Strengths**: Most comprehensive, real banking, teen independence with oversight
- **Weaknesses**: Customer service issues, complex plan tiers, expensive at higher levels
- **Target**: Ages 6-18, families wanting full financial platform

#### S'moresUp ($7.99/month or $79.99/year)
- **Model**: AI-powered smart chore management with gamification
- **Key features**: ChoreAI (auto-assigns/reminds/rewards), smart home integration
  (Bosch, GE, Google, Amazon), Google Classroom integration, photo proof of
  completion, "Family Campfires" messaging, "Above and Beyond" values-based tasks
- **Claims**: Saves parents 8 hours/week via automation
- **Strengths**: Most tech-forward (AI + smart home + school), deepest gamification
- **Weaknesses**: Expensive, feature bloat, niche smart-home partnerships
- **Target**: Tech-forward families wanting automation

#### Homey ($4.99/month or $49.99/year)
- **Model**: Detailed allowance math with chore tracking
- **Key features**: Per-minute rates, savings jars with percentage allocation,
  bank account connection (US only), IOU tracking, responsibilities vs paid
  jobs distinction, interest/fines system
- **Strengths**: Most detailed financial modeling, "first app that got kids
  doing chores consistently"
- **Weaknesses**: Interface feels 2018, no offline support, too many options
  for younger kids, prone to crashing
- **Target**: Detail-oriented parents wanting precise allowance control

#### KiddiKash (Free tier available)
- **Model**: Points-and-rewards system integrated with chore tracking
- **Key features**: Chore engine woven into points/rewards/savings dashboard,
  positions itself as fixing competitor pain points
- **Strengths**: Free entry point, integrated experience
- **Weaknesses**: Limited third-party reviews, unclear paid tier features

---

### What Parents Actually Pay For (Research Findings)

#### Willingness to Pay Hierarchy

Based on app store reviews, parent forums, and comparison sites:

| Value Level | What Parents Pay For | Price Tolerance |
|-------------|---------------------|-----------------|
| **High** | Real money outcomes (debit card, investing, banking) | $5-25/month |
| **Medium-High** | Financial education (savings goals, budgets, compound interest) | $4-8/month |
| **Medium** | Automation (AI assignment, smart reminders, scheduling) | $5-8/month |
| **Low** | Gamification alone (points, badges, leaderboards) | $0-3/month |
| **Zero** | Basic chore checklist | Free expected |

#### Key Parent Quotes (from reviews)

- "I refuse to pay a monthly fee to use an app — I'm trying to teach my
  children responsible money practices here, and forgetting about yet another
  monthly subscription is irresponsible." — Bomad user
- "Has been the first app that got my kids doing chores consistently, and
  without me nagging." — Homey user (paying $4.99/mo)
- "BusyKid creates a crucial mental link between effort and reward — kids
  can't just receive money, they have to complete chores and request payment."
  — Parent review

#### Subscription Fatigue Drivers (Churn Causes)

1. **Paywalled features users expected free** — downloading "free" apps then
   hitting paywalls feels deceptive
2. **Feature bloat** — apps that try to be "family super-apps" get abandoned;
   parents use only 10% of features
3. **Gamification burnout** — novelty wears off, kids start asking "what do I
   get?" for everything, or disengage when points stop feeling exciting
4. **Doesn't solve the real problem** — apps that automate nagging instead of
   building intrinsic motivation get abandoned
5. **Interface not refreshed** — apps that "feel 2018" lose to fresh competitors
6. **No tangible outcome** — if parents can't point to a behavior change or
   financial skill learned, they cancel

---

### Gamification Research: What Actually Works

#### Evidence-Based Findings (2025)

| Finding | Source | Implication for ChoreGami |
|---------|--------|--------------------------|
| Social accountability increases completion by 65% | American Society of Training & Development | Family leaderboard is validated |
| Group participation → 95% more likely to complete goals | ASTD research | Cross-device family visibility matters |
| Simple check-ins beat complex tracking | App abandonment studies | Keep chore completion to 1 tap |
| Streak recovery prevents burnout | Habit tracking research | Don't erase weeks of progress for 1 miss |
| Start with 1-3 habits, master, then add | Behavior design | Onboarding should activate 1 template, not overwhelm |
| Celebrating small achievements boosts adherence 300% | BJ Fogg, Stanford | Celebration animations are NOT vanity — they're retention |
| Gamification works for some, annoys others | Meta-analysis | Must be opt-in/subtle, not forced |
| Tracking itself matters more than which app | 2018 Obesity study | Simple > complex |
| Money habits form by age 7 | Financial literacy research | Target 6-8 year olds before habits calcify |

#### Streak Best Practices

- **Do**: Show current streak, celebrate milestones (7 days, 21 days, 30 days)
- **Do**: Allow "streak recovery" — 1 missed day doesn't reset to zero
- **Don't**: Make streaks the primary motivation (they become stressful)
- **Don't**: Show negative states ("You broke your streak!")
- **Do**: Use streaks as proof of habit formation ("21 days = habit formed!")

---

### Smart Home & AI: Market Position

S'moresUp is the only competitor with smart home integration (Bosch dishwashers
trigger chores, GE/Google/Amazon integration). Their ChoreAI claims to save
parents 8 hours/week.

**Our position**: Skip. Smart home is:
- Fragmented ecosystem (no standard)
- Niche audience (families with specific Bosch/GE appliances)
- High engineering effort for small addressable market
- S'moresUp has first-mover advantage we can't overcome
- AI chore assignment is solvable with rotation templates (already built)

---

### Pricing Strategy Validation

| Competitor | Price | What You Get | ChoreGami Position |
|-----------|-------|-------------|-------------------|
| KiddiKash | Free | Points + basic chores | We offer free tier too |
| BusyKid | $4/mo | Debit card + investing | We're $1 more but no card needed |
| Homey | $4.99/mo | Detailed allowance + jars | Same price, fresher UX |
| Greenlight Core | $5.99/mo | Debit card + basic investing | We're cheaper, no card |
| S'moresUp | $7.99/mo | AI + smart home + gamification | We're cheaper, focused |
| Greenlight Max | $10.98/mo | Full investing + identity protection | Different category |

**$4.99/month is correctly positioned**: Above commodity (BusyKid) but below
platform (Greenlight). Justified by insights + rewards + savings goals without
banking complexity.

---

### Validated Strategy Adjustments

Based on research, these adjustments strengthen the plan:

1. **Streak recovery is essential** — Add to behavioral insights. Don't
   penalize single missed days. Show "consistency %" not just streak count.

2. **Celebration animations are retention, not vanity** — BJ Fogg's research
   (300% adherence boost) validates our celebration modals. Keep them.

3. **Free tier must be genuinely useful** — Parents are allergic to
   "paywalled basics." Core chore tracking + basic leaderboard must be free.

4. **Feature simplicity is competitive advantage** — Homey's "too many
   options" and S'moresUp's "feature bloat" are real churn drivers.
   Our 2-dashboard architecture is a feature, not a limitation.

5. **Savings goals are table stakes at $5/mo** — Every competitor at this
   price point has them. Priority 3 should potentially merge with Priority 2.

6. **"Habit formed" proof is genuinely novel** — No competitor surfaces
   "your kid has been consistent for 21 days, habit is forming." This is
   the strongest monetization justification.

7. **Parent independence concern** — Parents value apps that let kids
   develop independence WITH oversight. Kid-facing dashboard that "just
   works" without parent intervention is important.

---

### Sources

- [BusyKid Features](https://busykid.com/busykid-features/)
- [BusyKid Review 2025 - Kids' Money](https://www.kidsmoney.org/parents/money-management/busykid-review/)
- [Best Chore Apps 2025 - KiddiKash](https://www.kiddikash.com/blog/best-chore-apps-2025)
- [Best Allowance Apps 2025 - CoFinancially](https://cofinancially.com/best-allowance-apps-for-kids/)
- [Greenlight Chores & Allowance](https://greenlight.com/chores-and-allowance-app-for-kids)
- [Greenlight Plans Comparison](https://greenlight.com/plans)
- [Greenlight Review 2025 - Marriage Kids Money](https://marriagekidsandmoney.com/greenlight-review/)
- [S'moresUp Pricing](https://www.smoresup.com/pricing)
- [S'moresUp App - Google Play](https://play.google.com/store/apps/details?id=com.rotation5.smoresup)
- [Homey Pricing](https://www.homeyapp.net/pricing/)
- [Homey Reviews - Common Sense Media](https://www.commonsensemedia.org/app-reviews/homey-chores-and-allowance)
- [Best Free Chore Apps 2025 - MyChoreBoard](https://www.mychoreboard.com/blog/best-free-chore-apps-2025/)
- [Chore Apps MIT Technology Review](https://www.technologyreview.com/2022/05/10/1051954/chore-apps/)
- [Gamification Apps 2025 - Gamification+](https://gamificationplus.uk/which-gamified-habit-building-app-do-i-think-is-best-in-2025/)
- [Habit Tracker Comparison 2025 - Cohorty](https://www.cohorty.app/blog/habit-tracker-comparison-2025-12-apps-tested-free-vs-paid)
- [Habitica - Internet Matters](https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/habitica/)
- [Kids Finance Apps - PenFed](https://www.penfed.org/learn/best-kids-finance-apps-to-teach-money-management)
- [Money Apps for Kids - Bankrate](https://www.bankrate.com/personal-finance/best-money-apps-for-kids/)
- [Greenlight Review 2026 - FinanceBuzz](https://financebuzz.com/greenlight-review)

---

*Document created: January 25, 2026*
*Last updated: January 25, 2026 (P1-P4 implemented)*

**Related Documentation**:
- [Balance, Rewards & Goals Implementation](../milestones/20260125_balance_rewards_goals_implementation.md) — Implementation milestone for P2-P4
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) — Core JSONB patterns for `families.settings` and `family_profiles.preferences`
- [Transaction Service](../../lib/services/transaction-service.ts) — Existing service handling all point changes

*Status: P1-P4 shipped, P5 (Kid-Initiated Reward Requests) pending*
