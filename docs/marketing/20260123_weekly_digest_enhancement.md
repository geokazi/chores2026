# Weekly Digest Enhancement: Personalized Family Scorecard

**Date**: January 23, 2026
**Status**: ✅ Implemented
**Related**: [Notifications: Calendar + Email + Badges](../milestones/20260122_notifications_calendar_email_badges.md)

---

## Executive Summary

Transform the existing "Week Ahead" email digest from a simple event list into a comprehensive **personalized family scorecard** — the weekly engagement email that no competitor offers. This creates a defensible moat by delivering unique value that users can't get from any calendar app or chore tracker.

---

## Competitive Analysis

### What Competitors Offer

| App | Weekly Email | Content | Personalization |
|-----|-------------|---------|-----------------|
| **OurHome** | None | — | — |
| **Homey** | None | — | — |
| **S'moresUp** | None | — | — |
| **Greenlight** (finance) | Weekly spending summary | Transaction list | Per-child spending |
| **Strava** | Weekly recap | Distance, pace, PRs | Segment performance |
| **Duolingo** | Streak reminders | "Don't lose your streak!" | Streak-focused only |

### Key Insight

**No family chore app sends a personalized weekly scorecard email.**

Strava's weekly recap is the gold standard for engagement emails — it combines stats, achievements, and social comparison to drive re-engagement. We can replicate this pattern for family chores.

### The Moat

A personalized weekly digest creates switching cost because:
1. **Historical context**: "You've earned $45 over 6 weeks" — can't replicate in a new app
2. **Family comparison**: Leaderboard position is family-specific
3. **Trend data**: Week-over-week improvement is unique to the household
4. **Anticipation**: Parents look forward to Sunday morning family stats

---

## Current Digest (Before)

```
Subject: Week Ahead for the Kariuki Family

- This Week's Events (3 items)
- Last Week's Highlights:
  - Chores completed: 18/22 (82%)
  - Top earner: Julia (45 pts)
```

**Problems**: Generic, no engagement hook, doesn't showcase app value.

---

## Enhanced Digest (After)

### 7 Sections (Pareto-ordered by engagement value)

| # | Section | Data Source | Value |
|---|---------|-------------|-------|
| 1 | Weekly Scorecard | `chore_transactions` | Completion % + delta vs last week |
| 2 | Family Leaderboard | `family_profiles.current_points` | All members ranked |
| 3 | Top Earner Spotlight | `chore_transactions` (weekly sum) | Who earned most THIS week |
| 4 | Streak Status | `chore_transactions` (consecutive days) | Active streaks + encouragement |
| 5 | Family Earnings | `chore_transactions` (weekly sum) | Total $ earned this week |
| 6 | Family Goal Progress | `families.settings` JSONB | Progress toward weekly goal |
| 7 | Upcoming Events | `family_events` | Next 7 days (existing) |

### Insight One-Liners

Personalized observations generated from data patterns:

| Condition | Insight |
|-----------|---------|
| Completion > 90% | "Your family crushed it this week!" |
| Week-over-week improvement > 20% | "Up X% from last week — great momentum!" |
| New streak started | "[Name] started a new streak — 3 days and counting!" |
| Goal reached | "Family goal reached! Everyone earned the bonus!" |
| Perfect week (100%) | "PERFECT WEEK! Every single chore completed!" |
| Top earner change | "[Name] takes the lead this week!" |
| Longest streak in family | "[Name] has the longest streak at X days!" |

### Visual Email Template

```
Subject: Your Family Scorecard — Kariuki Family

Hi Dad! Here's your family's weekly scorecard.

WEEKLY SCORECARD
━━━━━━━━━━━━━━━━━━━━
✅ 18/22 chores completed (82%)
📈 Up 15% from last week!

FAMILY LEADERBOARD
━━━━━━━━━━━━━━━━━━━━
🥇 Julia         320 pts  🔥 5 days
🥈 Ciku          285 pts  🔥 3 days
🥉 Tonie Tones   190 pts

TOP EARNER THIS WEEK
━━━━━━━━━━━━━━━━━━━━
⭐ Julia earned 45 pts this week!

FAMILY EARNINGS
━━━━━━━━━━━━━━━━━━━━
💰 $95 earned this week (all members combined)

FAMILY GOAL
━━━━━━━━━━━━━━━━━━━━
🎯 $18 / $20 weekly goal (90%)
   Almost there! 1 more chore to unlock the bonus!

UPCOMING EVENTS
━━━━━━━━━━━━━━━━━━━━
Mon Jan 27  🏀 Basketball Practice  6:30 PM
Wed Jan 29  🎹 Piano Lesson         4:00 PM
Sat Feb 01  🎂 Julia's Birthday     2:00 PM

💡 INSIGHT
━━━━━━━━━━━━━━━━━━━━
Julia takes the lead this week with a 5-day streak!

—
ChoreGami • Manage in Settings → Notifications
```

---

## Technical Implementation

### Enhanced DigestContent Interface

```typescript
interface DigestContent {
  familyName: string;
  parentName: string;
  events: Array<{ date: string; title: string; time?: string; emoji?: string }>;
  stats: {
    choresCompleted: number;
    choresTotal: number;
    prevWeekCompleted: number;
    prevWeekTotal: number;
    topEarner?: { name: string; points: number };
  };
  leaderboard: Array<{ name: string; points: number; streak: number }>;
  weeklyEarnings: number;
  goalProgress?: {
    target: number;
    current: number;
    achieved: boolean;
    bonus: number;
  };
  insights: string[];
}
```

### Data Queries (Additional)

1. **Previous week transactions** — for week-over-week delta
2. **All family members with current_points** — leaderboard
3. **Weekly earnings per member** — from `chore_transactions` this week
4. **Goal settings** — from `families.settings` JSONB
5. **Streak calculation** — consecutive days from `chore_transactions`

### Streak Calculation (Server-Side)

For the digest, calculate actual daily streaks:
```typescript
// Group transactions by profile_id and date
// Count consecutive days ending at today or yesterday
// A streak ends when there's a gap day with no completions
```

---

## SMS Template (Enhanced)

```
📊 Kariuki Family Scorecard

✅ 18/22 chores (82%) ↑15%
🥇 Julia 320pts 🔥5d
🥈 Ciku 285pts 🔥3d
💰 $95 earned
🎯 Goal: $18/$20 (90%)

📅 Mon: 🏀 Basketball 6:30PM
📅 Wed: 🎹 Piano 4PM
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Open rate | >60% | Resend analytics |
| Re-engagement | +20% Monday logins | Compare opted-in vs non-opted families |
| Retention | -30% weekly churn | Track opt-in families vs control |
| Feature awareness | 80% know about digest | In-app survey (future) |

---

## Updates

### January 25, 2026 — Behavioral Insights Integration

The digest was enhanced as part of [Priority 1: Behavioral Insights](../planned/20260125_rewards_market_strategy.md):

- **Streak recovery**: `calculateStreak()` now uses `diffDays <= 2` (allows 1 gap day)
  instead of strict `diffDays === 1`. Prevents single-miss frustration.
- **Template-aware consistency %**: `calculateConsistency(dates, expectedPerWeek)` computes
  30-day consistency as `activeDays / Math.round(expectedPerWeek * 30/7)`. Uses
  `getExpectedDaysForProfile()` from insights-service to derive expected days from
  the family's rotation template (e.g., Weekend Warrior = 5d/week, Daily Basics = 7d/week).
  Ensures consistency % matches the Habit Insights page exactly.
- **Leaderboard type updated**: `{ name, totalPoints, weeklyPoints, streak, consistency }`
- **Email template**: Shows consistency % alongside streak badge in leaderboard rows.
- **SMS template**: Appends consistency % after streak count.
- **Insight one-liner**: High consistency (80%+) generates "habit forming!" insight.

**January 25, 2026 — Shared Utility Consolidation**

- **No duplicate code**: `email-digest.ts` now imports `calculateStreak`, `calculateConsistency`,
  and `getExpectedDaysForProfile` from `insights-service.ts` instead of defining local copies.
  Single source of truth for all date math — if the streak algorithm changes, it updates
  everywhere automatically.
- **Unit tests**: 21 tests in `insights-service_test.ts` cover the shared utilities,
  including edge cases for timezone conversion, gap-day recovery, and deduplication.

---

## Cross-References

- **Implementation**: [Notifications: Calendar + Email + Badges](../milestones/20260122_notifications_calendar_email_badges.md) — Base digest service
- **Behavioral Insights**: [Rewards Market Strategy (P1)](../planned/20260125_rewards_market_strategy.md) — Consistency % and streak recovery
- **Family Goals**: [Collaborative Family Goals](../milestones/20260114_collaborative_family_goals_bonus_system.md) — Goal progress data
- **Reports**: [Family Reports & Analytics](../20260114_family_reports_analytics_implementation.md) — Savings/earnings calculations
- **Weekly Patterns**: [Weekly Patterns Analysis](../milestones/20260114_weekly_patterns_analysis.md) — Streak insights
- **JSONB Settings**: [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) — preferences storage

---

*Created: January 23, 2026*
*Author: Claude Code AI Assistant*
