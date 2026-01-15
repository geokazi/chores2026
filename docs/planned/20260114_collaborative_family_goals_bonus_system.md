# Collaborative Family Goals & Bonus System

**Date**: January 14, 2026
**Status**: ✅ **IMPLEMENTED**
**Priority**: High
**Effort**: ~130 lines planned → ~435 lines actual (robust error handling)

> **Implementation Complete**: See [Milestone Documentation](../milestones/20260114_collaborative_family_goals_bonus_system.md)

---

## Summary

Replace competitive rankings with a **collaborative family goal** where everyone works together toward a shared weekly target. When reached, **everyone gets a bonus**.

---

## Philosophy: Collaboration Over Competition

```
❌ COMPETITIVE (medals/rankings):
   🥇 Tonie!    $55    ← Winner
   🥈 Mom       $10
   🥉 Dad        $8
      Julia      $2    ← Feels like "loser"
      Cikū       $1    ← May give up

✅ COLLABORATIVE (family goal):
   🎯 Family Goal: $20/week

   $18 of $20  ████████████████████░░  90%

   💪 $2 more → everyone gets +$2!

   Who's helping?
   Tonie!  $10  ████████████████
   Mom      $4  ██████
   Dad      $2  ███
   Julia    $1  █
   Cikū     $1  █
```

**Key difference**: No rankings, no medals - just "Who's helping?" with bars showing contribution without judgment.

---

## Goal Configuration

### Recommended Settings

```
Goal: $20/week
Bonus: $2 per person

Math:
  3 kids × 5 chores × $1 = $15/week (kids)
  Parents chip in ~$5/week
  Total: ~$20/week achievable ✓

Bonus impact:
  Kid earns $5/week base
  + $2 bonus = $7/week (40% boost!)

  Meaningful motivation.
```

### Why Weekly?

| Frequency | Pros | Cons |
|-----------|------|------|
| **Weekly** ✓ | Fast feedback, 52 chances/year, kids stay engaged | Smaller bonus |
| Bi-weekly | Bigger bonus, catch-up time | Too long for young kids |
| Monthly | Big bonus feels significant | Way too long, loses motivation |

**Research**: Kids under 10 need rewards within 1 week for habit building.

---

## JSONB Settings (2 fields)

```jsonc
// families.settings.apps.choregami
{
  "points_per_dollar": 1,
  "children_pins_enabled": true,

  // NEW - just 2 fields
  "weekly_goal": 20,    // null = disabled
  "goal_bonus": 2       // $ per person when reached
}
```

That's it. No complex nested objects.

---

## Implementation (~130 lines total)

### 1. Goal Check Function (~50 lines)

Add to existing `lib/services/chore-service.ts`:

```typescript
/**
 * Check if family weekly goal reached and award bonus
 * Called after each chore completion
 */
async checkFamilyGoal(familyId: string): Promise<{
  achieved: boolean;
  bonus?: number;
  progress?: number;
  target?: number;
}> {
  // Get settings
  const { data: family } = await this.client
    .from("families")
    .select("settings")
    .eq("id", familyId)
    .single();

  const settings = family?.settings?.apps?.choregami || {};
  const goal = settings.weekly_goal;
  const bonus = settings.goal_bonus || 2;

  // No goal set = disabled
  if (!goal) {
    return { achieved: false };
  }

  // Get week earnings
  const weekStart = this.getWeekStart(new Date());
  const { data: txns } = await this.client
    .schema("choretracker")
    .from("chore_transactions")
    .select("points_change")
    .eq("family_id", familyId)
    .eq("transaction_type", "chore_completed")
    .gte("created_at", weekStart.toISOString())
    .gt("points_change", 0);

  const pointsPerDollar = settings.points_per_dollar || 1;
  const earned = Math.round(
    (txns?.reduce((sum, t) => sum + t.points_change, 0) || 0) / pointsPerDollar
  );

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

  // Goal reached and not yet awarded?
  if (earned >= goal && !awarded?.length) {
    // Award to all family members
    const members = await this.getFamilyMembers(familyId);
    const bonusPoints = bonus * pointsPerDollar;

    for (const member of members) {
      await this.transactionService.recordBonusAward(
        member.id,
        bonusPoints,
        "weekly_goal",
        familyId
      );
    }

    return { achieved: true, bonus, progress: earned, target: goal };
  }

  return { achieved: false, progress: earned, target: goal };
}

private getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}
```

### 2. Settings UI (~25 lines)

Add to existing `islands/FamilySettings.tsx`:

```tsx
// Add to state
const [weeklyGoal, setWeeklyGoal] = useState(settings?.weekly_goal || "");
const [goalBonus, setGoalBonus] = useState(settings?.goal_bonus || 2);

// Add to JSX (after PIN toggle)
<div style={{ marginTop: "1.5rem" }}>
  <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
    🎯 Weekly Family Goal
  </h3>

  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <span>Goal</span>
    <span>$</span>
    <input
      type="number"
      value={weeklyGoal}
      onChange={(e) => setWeeklyGoal(e.target.value)}
      placeholder="20"
      min="1"
      max="1000"
      style={{ width: "70px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ddd" }}
    />
    <span style={{ color: "#666" }}>/week</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
    <span>Bonus</span>
    <span>$</span>
    <input
      type="number"
      value={goalBonus}
      onChange={(e) => setGoalBonus(e.target.value)}
      placeholder="2"
      min="0"
      max="100"
      style={{ width: "70px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ddd" }}
    />
    <span style={{ color: "#666" }}>per person</span>
  </div>

  <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>
    Leave goal blank to disable
  </p>
</div>

// Add to save handler
weekly_goal: weeklyGoal ? parseInt(weeklyGoal) : null,
goal_bonus: parseInt(goalBonus) || 2,
```

### 3. Settings API (~10 lines)

Add to existing `routes/api/family/settings.ts`:

```typescript
// In POST handler, add to updates object:
if (body.weekly_goal !== undefined) {
  choregamiSettings.weekly_goal = body.weekly_goal;
}
if (body.goal_bonus !== undefined) {
  choregamiSettings.goal_bonus = body.goal_bonus;
}
```

### 4. Progress Display (~40 lines)

Add to existing `islands/FamilyReports.tsx`:

```tsx
// Add goal status to props (passed from route)
interface FamilyReportsProps {
  // ... existing
  goalStatus?: {
    enabled: boolean;
    target: number;
    progress: number;
    bonus: number;
    achieved: boolean;
  };
}

// Add before "Earned This" section
{goalStatus?.enabled && (
  <div class="card" style={{ marginBottom: "1.5rem" }}>
    <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>
      🎯 Family Goal This Week
    </h2>

    {/* Progress */}
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
      <span>${goalStatus.progress} of ${goalStatus.target}</span>
      <span>{Math.min(Math.round((goalStatus.progress / goalStatus.target) * 100), 100)}%</span>
    </div>

    {/* Bar */}
    <div style={{ height: "20px", background: "#e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.min((goalStatus.progress / goalStatus.target) * 100, 100)}%`,
        background: goalStatus.achieved ? "var(--color-success)" : "var(--color-primary)",
        borderRadius: "10px",
      }} />
    </div>

    {/* Message */}
    <p style={{ textAlign: "center", marginTop: "0.75rem", fontWeight: "500" }}>
      {goalStatus.achieved
        ? `🎉 Goal reached! Everyone got +$${goalStatus.bonus}!`
        : `💪 $${goalStatus.target - goalStatus.progress} more → everyone gets +$${goalStatus.bonus}!`
      }
    </p>
  </div>
)}
```

### 5. Chore Completion Hook (~5 lines)

Add to existing chore completion handler:

```typescript
// After recording chore completion
const goalResult = await choreService.checkFamilyGoal(familyId);

// Include in response
return Response.json({
  success: true,
  points_earned: points,
  // NEW
  goal_achieved: goalResult.achieved,
  goal_bonus: goalResult.bonus,
});
```

---

## UI Mockups

### Goal In Progress

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Family Goal This Week                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   $16 of $20                                          80%   │
│   ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                             │
│   💪 $4 more → everyone gets +$2!                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Goal Reached

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Family Goal This Week                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   $22 of $20                                         100%   │
│   ██████████████████████████████████████████████████████████│
│                                                             │
│   🎉 Goal reached! Everyone got +$2!                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Parent Settings

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Family Settings                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔐 Kid PINs                                                 │
│ [✓] Require PIN for kids                                    │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 🎯 Weekly Family Goal                                       │
│                                                             │
│ Goal   $[ 20 ] /week                                        │
│ Bonus  $[  2 ] per person                                   │
│                                                             │
│ (Leave goal blank to disable)                               │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 🎨 Theme                                                    │
│ ○ Fresh Meadow  ● Sunset Citrus  ○ Ocean Depth              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Goal Disabled (no goal set)

Shows regular "Earned This" without goal section.

---

## What We're NOT Building (Keep Simple)

| Feature | Status | Add Later? |
|---------|--------|------------|
| Multiple bonus modes | ❌ Skip | Maybe |
| Streak bonuses | ❌ Skip | Maybe |
| Goal achievement history | ❌ Skip | Maybe |
| Progress notifications | ❌ Skip | Maybe |
| Tiered goals | ❌ Skip | Maybe |
| Monthly/bi-weekly options | ❌ Skip | Maybe |
| Separate GoalService | ❌ Skip | No |
| New API endpoints | ❌ Skip | No |
| New UI components | ❌ Skip | No |

**Philosophy**: 20% effort → 80% value. Add complexity only when needed.

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `lib/services/chore-service.ts` | Add `checkFamilyGoal()` | +50 |
| `islands/FamilySettings.tsx` | Add goal inputs | +25 |
| `routes/api/family/settings.ts` | Handle goal fields | +10 |
| `islands/FamilyReports.tsx` | Add goal progress | +40 |
| `routes/api/chores/complete.ts` | Call goal check | +5 |
| **Total** | | **~130** |

**No new files. No new services. No new components.**

---

## Testing

| Scenario | Expected |
|----------|----------|
| No goal set | Goal section hidden |
| Goal not reached | Shows progress + incentive message |
| Goal just reached | Awards bonus to all, shows celebration |
| Goal already awarded | No duplicate bonus |
| Settings saved | JSONB updated, UI reflects |

---

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│ Collaborative Family Goal System                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Settings:     2 JSONB fields (weekly_goal, goal_bonus)      │
│ Logic:        ~50 lines in ChoreService                     │
│ UI:           ~65 lines in existing components              │
│ Total:        ~130 lines, 0 new files                       │
│                                                             │
│ Features:                                                   │
│ ✓ Configurable goal amount                                  │
│ ✓ Configurable bonus amount                                 │
│ ✓ Progress bar display                                      │
│ ✓ Auto-award when reached                                   │
│ ✓ Prevents duplicate awards                                 │
│ ✓ Uses existing TransactionService                          │
│                                                             │
│ Philosophy:                                                 │
│ • Collaboration over competition                            │
│ • Everyone wins together                                    │
│ • No rankings or medals                                     │
│ • Simple, extensible                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
