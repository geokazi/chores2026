# Collaborative Family Goals & Bonus System

**Date**: January 14, 2026
**Status**: ✅ Complete
**Milestone**: Family Goal Achievement System
**Implementation**: ~180 lines across existing files + 1 new API endpoint

---

## Summary

Implemented a **collaborative family goal system** where families work together toward a shared weekly earnings target. When the goal is reached, **everyone automatically receives a bonus**.

This replaces competitive rankings with collaboration - no winners/losers, just shared family success.

---

## Features Implemented

### 1. Weekly Family Goal Settings
- Parents configure a weekly dollar goal (e.g., $20/week)
- Parents set bonus amount per person (e.g., $2)
- Settings stored in JSONB at `families.settings.apps.choregami`
- Leave goal blank to disable the feature

### 2. Goal Progress Display
- Progress bar on Family Reports page
- Shows current earnings vs target
- Percentage complete with visual indicator
- Motivational messages:
  - In progress: `💪 $4 more → everyone gets +$2!`
  - Achieved: `🎉 Goal reached! Everyone gets +$2!`

### 3. Automatic Bonus Distribution
- Triggered after each chore completion
- When goal reached, bonus automatically awarded to ALL family members
- Prevents duplicate awards (checks for existing weekly_goal bonus)
- Non-blocking - core functionality continues if bonus fails

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `lib/services/chore-service.ts` | Added `checkFamilyGoal()` and `getFamilyGoalStatus()` | +180 |
| `islands/FamilySettings.tsx` | Added goal settings UI section | +80 |
| `islands/FamilyReports.tsx` | Added goal progress bar display | +50 |
| `routes/reports.tsx` | Added goalStatus data fetching | +15 |
| `routes/api/chores/[chore_id]/complete.ts` | Hook goal check after completion | +10 |
| `routes/api/family/goal-settings.ts` | **New** - API for saving goal settings | ~100 |

**Total**: ~435 lines (actual implementation more than planned due to robust error handling)

---

## JSONB Settings Structure

```json
{
  "apps": {
    "choregami": {
      "points_per_dollar": 1,
      "children_pins_enabled": true,
      "weekly_goal": 20,      // null = disabled
      "goal_bonus": 2         // $ per person when reached
    }
  }
}
```

---

## UI Implementation

### Settings (FamilySettings.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Weekly Family Goal                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Set a weekly earnings goal. When reached, everyone gets     │
│ a bonus!                                                    │
│                                                             │
│ Goal   $[ 20 ] /week                                        │
│ Bonus  $[  2 ] per person                                   │
│                                                             │
│ Leave goal blank to disable. When goal is reached,          │
│ everyone gets the bonus!                                    │
│                                                             │
│ [ Save Goal Settings ]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reports (FamilyReports.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Family Goal This Week                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ $16 of $20                                            80%   │
│ ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                             │
│ 💪 $4 more → everyone gets +$2!                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### checkFamilyGoal() Logic

1. Fetch family JSONB settings
2. If no `weekly_goal` set, return early (feature disabled)
3. Calculate week start (Sunday)
4. Sum all `chore_completed` transactions since week start
5. Convert points to dollars using `points_per_dollar`
6. Check if `weekly_goal` bonus already awarded this week
7. If goal reached and not yet awarded:
   - Fetch all family members
   - Award bonus to each via `TransactionService.recordBonusAward()`
   - Description includes "weekly_goal" for duplicate prevention
8. Return goal status for UI display

### Duplicate Prevention

```typescript
// Check if already awarded this week
const { data: awarded } = await this.client
  .schema("choretracker")
  .from("chore_transactions")
  .select("id")
  .eq("family_id", familyId)
  .eq("transaction_type", "bonus_awarded")
  .gte("created_at", weekStart.toISOString())
  .ilike("description", "%weekly_goal%")
  .limit(1);
```

---

## Design Philosophy

### Why Collaborative Over Competitive?

| Competitive Issues | Collaborative Benefits |
|-------------------|------------------------|
| Creates winners/losers | Everyone wins together |
| Discourages lower earners | Any contribution helps |
| Unfair age comparisons | Age-appropriate participation |
| Individual focus | Team motivation |

### Goal Amount Rationale

```
Family Math:
  3 kids × 5 chores/week × $1 = $15/week (kids)
  Parents contribute ~$5/week
  Total: ~$20/week achievable ✓

Bonus Impact:
  Kid earns $5/week base
  + $2 bonus = $7/week (40% boost!)

  Meaningful motivation without being excessive.
```

---

## UX Decision: Bonus Display in Savings Section

### Question Considered

Should the Savings section show potential bonus amounts if the family goal is met?

### Options Evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| **Inline Potential** | Show `+$2` faded next to each person's balance | ❌ Too subtle |
| **Projected Balance** | Show `107 pts → 109 pts` with arrow | ❌ Confusing |
| **Footer Summary** | Add `🎯 +$2 each when goal reached` below savings | 🔄 If users ask |
| **Context Header** | Add `→ +$2 each` to Savings header | ❌ Redundant |
| **No Change** | Keep current separation of concerns | ✅ **Chosen** |

### Decision: No Change

The Family Goal section already communicates the bonus effectively:

```
🎯 Family Goal This Week
$16 of $20                                 80%
████████████████████████████░░░░░░░░░░░░
💪 $4 more → everyone gets +$2!      ← This is sufficient
```

### Rationale

1. **Goal section already explains bonus** - Message clearly states `everyone gets +$2!`
2. **Separation of concerns** - Goals = progress tracking, Savings = current balances
3. **Cognitive load** - Adding bonus preview to savings creates visual noise
4. **Kids understand** - The motivational message is clear and actionable
5. **Less code to maintain** - Zero changes means zero bugs
6. **20/80 principle** - No additional value from duplicating information

### When to Reconsider

If users report confusion about:
- What the bonus means
- Who receives the bonus
- How bonus affects their balance

Then implement Option 3 (footer summary) as minimal viable addition:

```tsx
// Only show when goal exists and NOT yet achieved
{goalStatus && !goalStatus.achieved && goalStatus.bonus > 0 && (
  <div style={{ fontSize: "0.8rem", color: "var(--color-text-light)" }}>
    🎯 +${goalStatus.bonus} each when goal reached
  </div>
)}
```

### Decision Date

January 14, 2026

---

## Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| No goal set | Goal section hidden on reports |
| Goal not reached | Progress bar shows percentage, motivational message |
| Goal just reached | Bonus awarded to all, celebration message |
| Goal already awarded | No duplicate bonus, shows "achieved" state |
| Settings saved | JSONB updated, UI reflects new values |

---

## Related Documentation

- **Planning**: [UX Variations Considered](../planned/20260114_family_reports_ux_variations.md)
- **Settings Architecture**: [JSONB Settings](../20260114_JSONB_settings_architecture.md)
- **Reports Implementation**: [Family Reports Analytics](../20260114_family_reports_analytics_implementation.md)

---

## Future Considerations

These features were intentionally deferred (20/80 principle):

- Multiple bonus modes
- Streak bonuses for consecutive weeks
- Goal achievement history
- Progress notifications
- Tiered goals (bronze/silver/gold)
- Monthly/bi-weekly goal options

---

*Implemented: January 14, 2026*
*Philosophy: Collaboration over competition - everyone wins together*
