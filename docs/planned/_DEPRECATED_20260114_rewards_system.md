# Rewards System - Future Implementation Plan

> **⚠️ DEPRECATED (January 25, 2026)**
>
> This document has been superseded by the comprehensive rewards strategy:
> **[Rewards & Financial Education Strategy](./20260125_rewards_market_strategy.md)**
>
> The strategy doc includes:
> - Market research and competitor analysis
> - 5-priority roadmap (Insights → Rewards → Goals → Payouts → Requests)
> - Hybrid points/dollars model decision
> - Detailed legacy repo references
> - UI mockup and psychological framing (merged from this doc)
>
> **This file is kept for historical reference only.**

---

**Date**: January 14, 2026
**Status**: ~~Planned~~ → **DEPRECATED** (superseded by strategy doc)
**Priority**: Phase 2 (after core features stable)
**Estimated Effort**: ~250 lines total

---

## Overview

A rewards system allowing kids to redeem earned points for family-defined rewards. Separates the "store" experience from the analytics dashboard while maintaining positive psychological framing.

---

## Current State

### What We Have Now

| Feature | Location | Status |
|---------|----------|--------|
| Goals Achieved | `/reports` | ✅ Implemented |
| Point earning | `/kid/dashboard` | ✅ Implemented |
| Point tracking | `chore_transactions` | ✅ Implemented |
| Reward purchases | `reward_purchases` table | ✅ DB Ready |
| Available rewards | `available_rewards` table | ✅ DB Ready |

### Data Already Available

The `fresh-auth` repo has a fully-implemented `RewardsService`:
- **Location**: `/Users/georgekariuki/repos/deno2/fresh-auth/lib/services/chore-tracker-v2/rewards.service.ts`
- **Lines**: ~915 lines (full CRUD, too complex for our needs)

---

## Proposed Architecture

### Route Structure

```
/rewards                 → Reward catalog + claim interface
/rewards/history         → Detailed purchase history (optional, Phase 3)
```

### Why Separate from `/reports`?

| Aspect | `/reports` | `/rewards` |
|--------|------------|------------|
| Purpose | Analytics (backward-looking) | Actions (forward-looking) |
| Mental Model | "How did I do?" | "What can I get?" |
| User Goal | Review progress | Spend points |
| Interaction | Read-only | Transactional |

**Mixing these violates single responsibility and increases cognitive load.**

---

## Database Schema (Already Exists)

### `choretracker.available_rewards`

```sql
CREATE TABLE choretracker.available_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  point_cost INTEGER NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  max_per_week INTEGER,        -- Optional limit
  max_per_month INTEGER,       -- Optional limit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);
```

### `choretracker.reward_purchases`

```sql
CREATE TABLE choretracker.reward_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id),
  profile_id UUID REFERENCES public.family_profiles(id),
  reward_id UUID REFERENCES choretracker.available_rewards(id),
  transaction_id UUID REFERENCES choretracker.chore_transactions(id),
  point_cost INTEGER NOT NULL,
  status TEXT DEFAULT 'purchased',  -- purchased, fulfilled, cancelled
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by_profile_id UUID,
  fulfillment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);
```

### `choretracker.savings_goals` (Optional Future)

```sql
CREATE TABLE choretracker.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id),
  profile_id UUID REFERENCES public.family_profiles(id),
  goal_name TEXT NOT NULL,
  description TEXT,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER DEFAULT 0,
  icon TEXT DEFAULT '🎯',
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMPTZ,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);
```

---

## Implementation Plan

### Phase 1: `/rewards` Route (~150 lines)

**File Structure:**
```
routes/rewards.tsx           → Server handler + page (~80 lines)
islands/RewardsCatalog.tsx   → Interactive catalog (~70 lines)
```

**Features:**
1. Display available rewards for family
2. Show current user's point balance
3. "Claim" button for each reward
4. Success/error feedback
5. Link back to dashboard

**UI Mockup:**
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
│ ┌─────────────────────────────────────────────┐ │
│ │ 💵 Cash Out                                 │ │
│ │ Convert points to real money                │ │
│ │                             $20.00  [Claim] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Positive Framing:**
- Button says "Claim" not "Buy" or "Spend"
- Shows dollar value (motivating) not just points
- Balance prominent at top (encourages saving)

### Phase 2: Service Methods (~50 lines)

Add to existing `ChoreService`:

```typescript
// lib/services/chore-service.ts

/**
 * Get available rewards for family
 */
async getAvailableRewards(familyId: string): Promise<AvailableReward[]> {
  const { data, error } = await this.client
    .schema("choretracker")
    .from("available_rewards")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("point_cost", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Claim a reward (creates transaction + purchase record)
 */
async claimReward(
  familyId: string,
  profileId: string,
  rewardId: string,
  pointCost: number,
  rewardName: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check balance
  // 2. Create negative transaction
  // 3. Create purchase record
  // 4. Return success
}
```

### Phase 3: `/rewards/history` (Optional, ~100 lines)

**Only if users request it.** Current "Goals Achieved" in `/reports` may be sufficient.

**Features:**
1. Detailed purchase history
2. Filter by date range
3. Filter by reward type
4. Export capability (future)

---

## Psychological Framing

### Language Guidelines

| Avoid (Negative) | Use Instead (Positive) |
|------------------|------------------------|
| "Spend" | "Claim" or "Redeem" |
| "Purchase" | "Reward Claimed" |
| "Cost" | "Value" or "Points" |
| "-$17.00" (red) | "$17.00 claimed" (green) |
| "Recent Purchases" | "Rewards Claimed" or "Earnings Invested" |
| "You spent" | "You earned and claimed" |

### Color Coding

| Action | Color | Rationale |
|--------|-------|-----------|
| Points earned | Green | Positive reinforcement |
| Rewards claimed | Green or Blue | Achievement, not loss |
| Balance | Primary color | Neutral, informational |

**Never use red for spending** - it implies negativity and discourages healthy reward claiming.

---

## API Endpoints (If Needed)

### `POST /api/rewards/claim`

```typescript
// Request
{
  rewardId: string;
  profileId: string;  // Who is claiming
}

// Response
{
  success: boolean;
  newBalance?: number;
  error?: string;
}
```

### `GET /api/rewards` (Optional)

```typescript
// Response
{
  rewards: AvailableReward[];
  balance: number;
}
```

---

## Integration Points

### With Existing Systems

| System | Integration |
|--------|-------------|
| Session | Use `session.family.points_per_dollar` for conversion |
| TransactionService | Reuse for point deductions |
| FamilyScore | Sync reward claims via existing sync |
| WebSocket | Broadcast balance updates to family |

### With `/reports`

- Keep "Goals Achieved" section as-is
- No changes needed to reports
- Rewards is a separate user journey

---

## 20/80 Analysis

| Feature | Effort | Value | Include? |
|---------|--------|-------|----------|
| Reward catalog display | 50 lines | High | ✅ Yes |
| Claim button + transaction | 50 lines | High | ✅ Yes |
| Balance display | 10 lines | High | ✅ Yes |
| Success feedback | 20 lines | Medium | ✅ Yes |
| Purchase history | 100 lines | Low | ❌ Phase 3 |
| Savings goals | 150 lines | Low | ❌ Phase 4 |
| Reward requests | 200 lines | Low | ❌ Phase 5 |

**Total Phase 1: ~150 lines** (within 500-line limit)

---

## Success Criteria

1. **Kid can claim reward** in under 3 taps
2. **Balance updates instantly** via existing WebSocket
3. **Parents see claims** in activity feed
4. **No confusion** between reports and rewards
5. **Positive experience** - kids feel rewarded, not depleted

---

## Reference Implementation

See full implementation (more complex than we need):
- `/Users/georgekariuki/repos/deno2/fresh-auth/lib/services/chore-tracker-v2/rewards.service.ts`

Key methods to adapt:
- `getAvailableRewards()` (lines 56-74)
- `purchaseReward()` (lines 464-554)
- `getRecentPurchases()` (lines 559-613)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-14 | Keep rewards separate from reports | Different mental models, single responsibility |
| 2026-01-14 | Use positive framing ("Claim" vs "Spend") | Better child psychology |
| 2026-01-14 | Phase implementation | 20/80 principle - catalog first |
| 2026-01-14 | Defer savings goals | Low priority, adds complexity |

---

## Files to Create (When Implementing)

```
routes/rewards.tsx              # NEW - ~80 lines
islands/RewardsCatalog.tsx      # NEW - ~70 lines
lib/services/chore-service.ts   # EDIT - +50 lines
```

**Total: ~200 lines of new code**

---

## Not Implementing (Explicitly Deferred)

1. **Reward requests** - Kids requesting new rewards (complex workflow)
2. **Savings goals** - Long-term saving targets (nice-to-have)
3. **Purchase limits** - Max per week/month (edge case)
4. **Fulfillment tracking** - Parent marking rewards as delivered (overkill)
5. **Reward categories** - Filtering by type (premature optimization)

These features exist in `fresh-auth` but violate our 20/80 principle.

---

*Document created: January 14, 2026*
*Status: Planning complete, awaiting implementation priority*
