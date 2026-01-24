# Streak System - UX Brainstorm & Implementation Plan

**Date**: January 14, 2026
**Status**: ✅ Partially Implemented (January 25, 2026)
**Priority**: Phase 2 (after core features stable)
**Estimated Effort**: ~70-150 lines depending on scope

---

> **Implementation Note (2026-01-25)**: Core streak analytics implemented as part
> of [Behavioral Insights (Priority 1)](20260125_rewards_market_strategy.md#priority-1-behavioral-insights-highest-pareto).
> Includes: streak with 1-day recovery, habit milestones (7/14/21/30d),
> template-aware 30-day consistency %, and weekly digest integration.
> See: `lib/services/insights-service.ts`, `islands/HabitInsights.tsx`
>
> **Architecture** (2026-01-25): Single 90-day DB query shared across all
> analytics methods (trend, streaks, routines). Per-kid error isolation.
> Typed interfaces (`TransactionRow`, `AssignmentRow`). Template-aware expected
> days via `getExpectedDaysForProfile()` — consistent between insights page and digest.
>
> **Not yet implemented from this doc**: kid-facing streak UI, celebration
> animations on milestone, daily streak notifications, perfect day streaks.

---

## Overview

A streak system to encourage consistent chore completion through visual feedback and gamification. Streaks create psychological investment and drive daily engagement.

---

## Streak Types Analysis

| Type | Definition | Complexity | Value |
|------|------------|------------|-------|
| **Daily Streak** | Consecutive days with ≥1 chore completed | Low | High |
| **Perfect Day** | Days with ALL assigned chores done | Medium | Medium |
| **Chore Streak** | Consecutive completions of same chore | Medium | Low |
| **Weekly Goal** | Weeks meeting point threshold | High | Medium |

**Recommendation**: Start with **Daily Streak** (simplest, most motivating).

---

## UX Options

### Option 1: Dashboard Header Badge (Recommended)
**Minimal - shows on Kid Dashboard**

```
┌─────────────────────────────────────────────────┐
│ ← Back           Cikū's Chores                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  💰 107 pts        🔥 12 day streak             │
│                                                 │
│  TODAY'S CHORES                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Make bed                    +5 pts    │   │
│  └─────────────────────────────────────────┘   │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Zero extra clicks, always visible
- Immediate motivation on dashboard load
- Minimal UI footprint

**Cons**:
- Takes header space
- No historical context

**Implementation**: ~20 lines in `KidDashboard.tsx`

---

### Option 2: Streak Card on Dashboard
**Slightly more detail with personal best**

```
┌─────────────────────────────────────────────────┐
│  TODAY'S CHORES                                 │
│  ...                                           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  🔥 12 Day Streak!                      │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │  Best: 21 days    Keep it going!        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Shows personal best (goal to beat)
- Progress bar adds visual appeal
- Motivational messaging

**Cons**:
- Extra visual element
- Could be scrolled past/ignored

**Implementation**: ~30 lines as separate component

---

### Option 3: Streak Section in Reports
**Add to existing `/reports` page for family comparison**

```
┌─────────────────────────────────────────────────┐
│ 💰 SAVINGS                                      │
│ ───────────────────────────────────────────────│
│ ⭐ Cikū        107 pts  ($107.00)              │
│    Tonie!       37 pts   ($37.00)              │
│    ...                                          │
│                                                 │
│ 🔥 STREAKS                                      │
│ ───────────────────────────────────────────────│
│ ⭐ Cikū           12 days  (Best: 21)          │
│    Tonie!          8 days  (Best: 15)          │
│    Dad             3 days  (Best: 7)           │
│    Mom             5 days  (Best: 12)          │
│                                                 │
│ 📈 EARNED THIS   Week  Month   YTD   All Time  │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Fits existing reports pattern
- Family comparison drives competition
- Shows current AND best streaks
- No new routes needed

**Cons**:
- Not visible on daily dashboard
- Requires navigating to reports

**Implementation**: ~40 lines in `FamilyReports.tsx` + service method

---

### Option 4: Celebration Modal Enhancement
**Show streak increment on chore completion**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🎉 Great Job! 🎉                   │
│                                                 │
│              +10 points earned!                 │
│                                                 │
│           ┌─────────────────────┐              │
│           │  🔥 13 Day Streak!  │              │
│           │    Keep going!      │              │
│           └─────────────────────┘              │
│                                                 │
│         New Balance: 117 pts ($117)            │
│                                                 │
│              [ Back to Chores ]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Reinforces streak at moment of achievement
- High emotional impact
- Zero extra navigation

**Cons**:
- Only seen after completion
- Transient visibility

**Implementation**: ~10 lines in `CelebrationModal.tsx`

---

### Option 5: Visual Calendar Streak
**Shows activity pattern over time**

```
┌─────────────────────────────────────────────────┐
│  🔥 YOUR STREAK                                 │
│                                                 │
│   M   T   W   T   F   S   S                    │
│  ✓   ✓   ✓   ✓   ✓   ✓   ✓   ← Last week      │
│  ✓   ✓   ✓   ✓   ✓   •   •   ← This week      │
│                      ↑                          │
│                   Today                         │
│                                                 │
│  12 days and counting!                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Visual history satisfying to see
- Shows consistency patterns
- GitHub-contribution-graph appeal

**Cons**:
- Higher complexity
- Takes significant space
- Requires date-range query

**Implementation**: ~80 lines (new component + service method)

---

### Option 6: Streak Milestone Badges
**Gamification with unlockable achievements**

```
┌─────────────────────────────────────────────────┐
│  🏆 STREAK BADGES                               │
│                                                 │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐       │
│  │ 🔥 │  │ 🔥 │  │ 🔥 │  │ ⬜ │  │ ⬜ │       │
│  │ 3  │  │ 7  │  │ 14 │  │ 30 │  │ 60 │       │
│  └────┘  └────┘  └────┘  └────┘  └────┘       │
│   ✓       ✓       ✓                            │
│                                                 │
│  Current: 12 days  →  Next: 14 days (2 to go!) │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Clear goals to work toward
- Milestone psychology (3, 7, 14, 30, 60, 100)
- Unlocking feels rewarding

**Cons**:
- Most complex to implement
- Needs badge storage/tracking
- May require separate UI section

**Implementation**: ~100 lines (badges component + storage)

---

## 20/80 Analysis

| Option | Effort | Value | Include? |
|--------|--------|-------|----------|
| **1. Header Badge** | ~20 lines | High | ✅ Phase 1 |
| **3. Reports Section** | ~40 lines | High | ✅ Phase 1 |
| **4. Celebration Modal** | ~10 lines | Medium | ✅ Phase 1 |
| 2. Dashboard Card | ~30 lines | Medium | 🔄 Phase 2 |
| 5. Calendar Visual | ~80 lines | Medium | 🔄 Phase 2 |
| 6. Milestone Badges | ~100 lines | Low | ❌ Phase 3 |

**Total Phase 1: ~70 lines** (within 20/80 principle)

---

## Recommended Implementation

### Combined Approach (Options 1 + 3 + 4)

```
Location              Display
─────────────────────────────────────────────────
Kid Dashboard:        🔥 12 day streak (header)
Chore Completion:     🔥 13 Day Streak! (modal)
Family Reports:       Full family streak comparison with personal bests
```

This provides:
1. **Daily reminder** on dashboard load
2. **Immediate reinforcement** on completion
3. **Family competition** in reports

---

## Data Model

### Streak Calculation Logic

**Definition**: A streak is the count of consecutive calendar days where the user completed at least one chore.

**Edge Cases**:
- Streak resets at midnight (local time)
- Today counts if ≥1 chore completed today
- Yesterday required for streak to continue
- Weekends count (no "skip days")

### Database Query Approach

**SQL (for reference)**:
```sql
-- Get consecutive days with at least one completion
WITH daily_completions AS (
  SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as completion_date
  FROM choretracker.chore_transactions
  WHERE profile_id = $1
    AND family_id = $2
    AND transaction_type = 'chore_completed'
    AND points_change > 0
  ORDER BY completion_date DESC
),
streaks AS (
  SELECT
    completion_date,
    completion_date - (ROW_NUMBER() OVER (ORDER BY completion_date DESC))::int AS streak_group
  FROM daily_completions
)
SELECT COUNT(*) as current_streak
FROM streaks
WHERE streak_group = (
  SELECT streak_group FROM streaks WHERE completion_date = CURRENT_DATE
  UNION ALL
  SELECT streak_group FROM streaks WHERE completion_date = CURRENT_DATE - 1
  LIMIT 1
);
```

**JavaScript Approach (Recommended)**:
```typescript
// lib/services/chore-service.ts

interface StreakData {
  current: number;
  best: number;
  lastActivityDate: string | null;
}

async getStreak(familyId: string, profileId: string): Promise<StreakData> {
  // 1. Query all completion dates for profile
  const { data: transactions } = await this.client
    .schema("choretracker")
    .from("chore_transactions")
    .select("created_at")
    .eq("family_id", familyId)
    .eq("profile_id", profileId)
    .eq("transaction_type", "chore_completed")
    .gt("points_change", 0)
    .order("created_at", { ascending: false });

  if (!transactions || transactions.length === 0) {
    return { current: 0, best: 0, lastActivityDate: null };
  }

  // 2. Extract unique dates
  const uniqueDates = [...new Set(
    transactions.map(t => new Date(t.created_at).toISOString().split('T')[0])
  )].sort().reverse();

  // 3. Calculate current streak
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = uniqueDates[0] === today ? today :
                  uniqueDates[0] === yesterday ? yesterday : null;

  if (checkDate) {
    for (const date of uniqueDates) {
      if (date === checkDate) {
        currentStreak++;
        checkDate = new Date(new Date(checkDate).getTime() - 86400000)
          .toISOString().split('T')[0];
      } else {
        break;
      }
    }
  }

  // 4. Calculate best streak (iterate through all dates)
  let bestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000;

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

  return {
    current: currentStreak,
    best: bestStreak,
    lastActivityDate: uniqueDates[0] || null,
  };
}

// For family-wide streaks (reports page)
async getFamilyStreaks(familyId: string): Promise<Array<{
  profileId: string;
  name: string;
  current: number;
  best: number;
}>> {
  // Get all family members, then calculate streaks for each
}
```

---

## UI Implementation

### Phase 1 Files to Modify

```
islands/KidDashboard.tsx       # EDIT - Add streak to header (~10 lines)
islands/CelebrationModal.tsx   # EDIT - Show streak on completion (~10 lines)
islands/FamilyReports.tsx      # EDIT - Add Streaks section (~30 lines)
lib/services/chore-service.ts  # EDIT - Add getStreak() method (~50 lines)
routes/reports.tsx             # EDIT - Fetch streak data (~5 lines)
```

**Total: ~105 lines of changes**

### Kid Dashboard Header

```tsx
// islands/KidDashboard.tsx (addition to header)
<div style={{ display: "flex", justifyContent: "space-between", padding: "1rem" }}>
  <span>💰 {currentPoints} pts</span>
  {streak.current > 0 && (
    <span style={{ color: "var(--color-accent)" }}>
      🔥 {streak.current} day streak
    </span>
  )}
</div>
```

### Celebration Modal

```tsx
// islands/CelebrationModal.tsx (addition)
{streak > 0 && (
  <div style={{
    background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    color: "white",
    fontWeight: "600",
  }}>
    🔥 {streak} Day Streak!
  </div>
)}
```

### Reports Streak Section

```tsx
// islands/FamilyReports.tsx (new section)
<div class="card">
  <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>
    <span>🔥</span> Streaks
  </h2>
  {streaks.map((member) => (
    <div key={member.profileId} style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "0.5rem 0",
      borderBottom: "1px solid var(--color-border)",
    }}>
      <span>{topStreak?.profileId === member.profileId && "⭐ "}{member.name}</span>
      <span>
        <span style={{ fontFamily: "monospace" }}>{member.current} days</span>
        <span style={{ color: "var(--color-text-light)", marginLeft: "0.5rem" }}>
          (Best: {member.best})
        </span>
      </span>
    </div>
  ))}
</div>
```

---

## Psychological Considerations

### Positive Framing

| Avoid | Use Instead |
|-------|-------------|
| "Streak lost" | "Start a new streak!" |
| "0 day streak" | Don't show (or "Build your streak") |
| "You broke your streak" | "Great job yesterday! Keep going today" |

### Motivation Mechanics

1. **Loss aversion**: Don't want to lose streak → complete chore
2. **Progress visualization**: Seeing number grow feels rewarding
3. **Social comparison**: Family leaderboard creates healthy competition
4. **Milestone goals**: Working toward 7, 14, 30 days gives purpose

### Streak Reset UX

When streak resets, don't shame - encourage:
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Starting fresh! 🌱                             │
│                                                 │
│  Your best streak: 21 days                      │
│  Can you beat it?                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Future Enhancements (Phase 2+)

### Streak Freeze (Planned Feature)
Allow one "skip day" per week without breaking streak:
- Costs points (e.g., 10 pts)
- Limited quantity (1/week)
- Shows as different icon in calendar view

### Streak Milestones
Award bonus points at milestones:
- 7 days: +10 bonus points
- 14 days: +25 bonus points
- 30 days: +50 bonus points
- 100 days: +100 bonus points

### Family Streak
Combined family streak where ALL members complete at least one chore:
- Harder to maintain
- Encourages family cooperation
- Separate from individual streaks

---

## Success Criteria

1. **Visibility**: Streak shown in ≤1 tap from dashboard
2. **Accuracy**: Streak count matches actual consecutive days
3. **Performance**: Streak calculation <100ms
4. **Motivation**: Kids mention streaks when completing chores
5. **No shame**: Zero negative messaging when streak breaks

---

## Not Implementing (Explicitly Deferred)

1. **Streak freeze** - Adds complexity, may reduce motivation
2. **Chore-specific streaks** - Too granular, cognitive overload
3. **Weekly goal streaks** - Hard to explain to kids
4. **Streak rewards/bonuses** - Separate feature, not core streak UX
5. **Calendar heatmap** - Nice but high effort for marginal value

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-14 | Start with daily streak only | Simplest to understand and implement |
| 2026-01-14 | Show in 3 places (header, modal, reports) | Maximum visibility without new routes |
| 2026-01-14 | JavaScript calculation over SQL | More flexible, easier to test |
| 2026-01-14 | Track personal best | Gives goal to work toward |
| 2026-01-14 | Defer milestone badges | Phase 3 - adds complexity |

---

## References

- **Duolingo streak system**: Industry gold standard for streak UX
- **GitHub contribution graph**: Visual streak calendar inspiration
- **Headspace meditation streaks**: Positive framing without shame

---

*Document created: January 14, 2026*
*Status: Brainstorm complete, awaiting implementation priority*
