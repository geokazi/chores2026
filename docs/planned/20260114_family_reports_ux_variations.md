# Family Reports UX Variations - Earned This Section

**Date**: January 14, 2026
**Status**: ✅ **Variation 7 Implemented**
**Recommendation**: **Variation 7 (Collaborative Goal)** - See [Milestone](../milestones/20260114_collaborative_family_goals_bonus_system.md)

---

## Current State

```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Earned This                                              │
├─────────────────────────────────────────────────────────────┤
│              Week     Month      YTD      All Time          │
│                                                             │
│ Cikū          $1        $6        $6       $123             │
│ Julia         $2        $3        $3       $119             │
│ Tonie!       $55       $57       $57        $95             │
│ Mom          $10       $20       $20        $24             │
│ Dad           $8        $8        $8        $13             │
│                                                             │
│ Family       $76       $94       $94       $374             │
│ Total                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Variations Considered

### 1. Progress Bars + Rank Badges

```
🥇 Tonie!    $55  ████████████████████████████████  (58%)
🥈 Mom       $10  ██████████░░░░░░░░░░░░░░░░░░░░░░  (15%)
🥉 Dad        $8  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░  (9%)
```

❌ **Rejected**: Creates winners/losers, discourages lower performers

### 2. Period-Focused Cards

```
[ Week ]   Month    YTD    All Time
──────
🏆 Tonie!  $55
   Mom     $10
   ...
```

⚪ Neutral: Cleaner but requires clicks

### 3. Trends + Sparklines

```
Tonie!  $55  ▲ +$23 (+72%)  ╱╲_╱▔
```

❌ **Rejected**: Too complex, requires historical data

### 4. Kid-Friendly Large Numbers

```
🔥 Tonie!
┌─────────────────────┐
│        $55          │
│   ★ TOP EARNER ★    │
└─────────────────────┘
```

❌ **Rejected**: Still competitive, singles out one person

### 5. Horizontal Bar Chart

```
Tonie! ████████████████████████████████████████████ $55 🏆
Mom    ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $10
```

❌ **Rejected**: Highlights disparity, competitive

### 6. Compact Table + Highlights

```
Tonie!   ⭐  $55   ← LEADER
Julia        $2
Cikū         $1   ← SAVER

💡 Julia & Cikū: Big savers!
```

⚪ Neutral: Better but still has "leader" concept

### 7. Collaborative Family Goal ✅ RECOMMENDED

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
├─────────────────────────────────────────────────────────────┤
│   Who's helping?                                            │
│                                                             │
│   Tonie!     $10  ████████████████                          │
│   Mom         $4  ██████                                    │
│   Dad         $2  ███                                       │
│   Julia       $1  █                                         │
│   Cikū        $1  █                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

✅ **Recommended**: Collaborative, no rankings, everyone wins together

---

## Why Variation 7?

### Competition Problems

| Issue | Impact |
|-------|--------|
| Winners and losers | Resentment between siblings |
| Unfair comparison | Younger kids can't compete |
| Discouragement | Kids who are always "last" give up |
| Individual focus | Misses family teamwork opportunity |

### Collaboration Benefits

| Benefit | How |
|---------|-----|
| Everyone contributes | Any chore helps the family |
| No "losers" | Everyone wins when goal reached |
| Team motivation | Kids help each other |
| Bonus incentive | Real reward for reaching goal |

---

## Summary

| Variation | Collaborative? | Recommended |
|-----------|---------------|-------------|
| 1. Ranks + Medals | ❌ Competitive | |
| 2. Period Cards | ⚪ Neutral | |
| 3. Trends | ❌ Complex | |
| 4. Kid-Friendly | ❌ Competitive | |
| 5. Bar Chart | ❌ Competitive | |
| 6. Highlights | ⚪ Neutral | |
| 7. Family Goal | ✅ Collaborative | ✅ **YES** |

---

## Implementation

See: **[Collaborative Family Goals & Bonus System](./20260114_collaborative_family_goals_bonus_system.md)**

- ~130 lines total
- 0 new files
- 2 JSONB settings
- Uses existing TransactionService
