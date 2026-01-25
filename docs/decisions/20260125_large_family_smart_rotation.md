# Decision: Large Family Smart Rotation Template

**Date**: January 25, 2026
**Status**: Proposed (Future Paid Template)
**Priority**: P6 (Nice to Have)

---

## Context

The current Smart Family Rotation template supports 2-4 kids using static slot-based schedules (`Child A`, `Child B`, `Child C`, `Child D`). Each slot has hand-tuned daily chore assignments for both cleaning and non-cleaning weeks.

Beta feedback and market analysis suggest demand for supporting larger families (5-12 kids) while maintaining the popular biweekly cleaning/non-cleaning cycle.

---

## Decision

**Create a new "Large Family Smart Rotation" template** for families with 5-12 kids, using the dynamic distribution approach rather than static slots.

### Why Two Templates (Not One Unified)

| Consideration | Two Templates | Unified Dynamic |
|---------------|---------------|-----------------|
| Breaking changes | None | Existing users lose predictable schedules |
| Small family UX | Hand-tuned, predictable "Child A = vacuum Monday" | Less predictable rotation |
| Large family UX | Auto-scaling fairness | Same |
| Maintenance | Two templates | One template |
| User choice | Clear: pick by family size | Simpler |

**Recommendation**: Two templates provides best UX for both segments without breaking existing users.

---

## Proposed Specification

```typescript
{
  key: 'large_family_smart_rotation',
  name: 'Large Family Smart Rotation',
  description: 'Biweekly cleaning cycle that scales to large families. Chores rotate fairly among all kids.',
  icon: '👨‍👩‍👧‍👦',
  color: '#8b5cf6',  // Purple (differentiate from green Smart Rotation)
  preset_category: 'everyday',
  difficulty: 'beginner',
  min_children: 5,
  max_children: 12,
  min_age: 6,
  cycle_type: 'biweekly',
  week_types: ['cleaning', 'non-cleaning'],
  is_dynamic: true,  // Key difference: uses distribution tags
  chores: [
    // Cleaning week - heavier chores rotate
    { key: 'vacuum_living', distribution: 'rotate', ... },
    { key: 'mop_kitchen', distribution: 'rotate', ... },
    { key: 'clean_bathroom', distribution: 'rotate', ... },
    // Daily chores - everyone
    { key: 'tidy_room', distribution: 'all', ... },
    // Maintenance - rotate
    { key: 'take_trash', distribution: 'rotate', ... },
    { key: 'feed_pet', distribution: 'rotate', ... },
  ],
  schedule: {},  // Empty - generated dynamically at runtime
}
```

---

## Technical Approach

### Dynamic Distribution (Already Implemented)

The `getDynamicChoresForChild()` function in `rotation-service.ts` already handles this:

```typescript
// 'all' chores: Everyone does daily
// 'rotate' chores: Round-robin based on (dayOfYear + choreIndex) % numKids
```

### Week Type Handling

Extend dynamic logic to respect `week_types`:
- **Cleaning week**: Include heavy cleaning chores in rotation
- **Non-cleaning week**: Only light maintenance chores rotate

This requires minor enhancement to `getDynamicChoresForChild()` to filter chores by week type.

---

## Implementation Estimate

| Task | Effort |
|------|--------|
| Create preset file with dynamic chores | 1 hour |
| Extend `getDynamicChoresForChild()` for week types | 1 hour |
| Add to preset registry | 15 min |
| Plan gate as paid template | 15 min |
| Testing | 1 hour |
| **Total** | ~3.5 hours |

---

## Alternatives Considered

### 1. Extend Smart Rotation to 12 Static Slots

- Add `Child E` through `Child L` with hardcoded schedules
- **Rejected**: 200+ lines of schedule entries, difficult to balance fairly

### 2. Single Unified Dynamic Template (2-12 kids)

- Replace Smart Rotation entirely with dynamic version
- **Rejected**: Loses hand-tuned predictability for small families, breaking change

### 3. Smart Rotation with Dynamic Fallback at 5+ Kids

- Same template, switches behavior internally
- **Rejected**: Hidden complexity, confusing UX

---

## Open Questions

1. **Overlap range?** Should both templates be available for 4-5 kid families?
   - *Leaning*: Yes, let users choose predictability vs auto-scaling

2. **Deprecate existing `large_family` preset?**
   - *Leaning*: Keep for now, different use case (weekly vs biweekly)

3. **Naming alternatives?**
   - "Large Family Smart Rotation" (recommended)
   - "Smart Rotation XL"
   - "Smart Rotation (5+ Kids)"

---

## Plan Gating

**Paid template** (Family Plan required)

Rationale:
- Targets niche segment (large families)
- Premium feature differentiator
- Free tier already has `dynamic_daily` for large families wanting basic rotation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Adoption by 5+ kid families | 40% of large families on paid plan |
| Template switching (4→5 kids) | Smooth transition, <5% support tickets |
| Chore fairness complaints | <2% of large family users |

---

## Cross-References

- [Chore Templates Design](../chore-templates-design.md) - Template architecture
- [Template Customization](../milestones/20260125_template_customization_inline_chores.md) - "I'll Choose" mode works with any family size
- [Smart Rotation Preset](../../lib/data/presets/smart-rotation.ts) - Current 2-4 kid implementation
- [Dynamic Daily Preset](../../lib/data/presets/dynamic-daily.ts) - Reference for distribution tags

---

*Decision Proposed*: January 25, 2026
*Author*: Claude Code AI Assistant
