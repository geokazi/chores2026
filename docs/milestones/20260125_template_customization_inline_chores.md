# Template Customization: Inline Chores & Assignment Mode

**Date**: January 25, 2026
**Status**: Planned
**Priority**: P5
**Source**: Beta User Feedback

---

## Overview

Enhance the Smart Family Rotation template (and other rotation templates) to allow parents to:
1. **Add custom chores inline** directly within the template configuration
2. **Choose assignment mode**: Smart Rotation (automatic) vs I'll Choose (manual per-kid assignment)
3. **Hide/show chores** with collapsed section for disabled chores

This feature addresses beta user feedback requesting more flexibility in template customization while maintaining simplicity.

---

## Beta User Feedback (Verbatim)

> **Smart family rotation template:**
> - Add custom chores inline to a template. When saved, store in the family's settings so that the chores selected from the template and those added inline, all get added to the family's settings and appear in kids dashboard.
> - Optionally allow user to either a) specify which chores go to which kid or b) stick with default smart rotation.
> - Hide unchecked chores. Add a button to show hidden chores in case user later if/when parent wants to add any of the items to the family settings.

---

## User Problem

**Current State:**
- Templates are pre-defined with fixed chore lists
- Custom chores exist at family level but are separate from templates
- No way to assign specific chores to specific kids within a template

**Desired State:**
- Add custom chores directly in template configuration UI
- Option to manually assign chores to kids OR use automatic rotation
- Hide unused template chores without losing them

---

## Design Principles

| Principle | Application |
|-----------|-------------|
| **Pareto (80/20)** | Daily assignment covers 80% of use cases; skip per-day scheduling |
| **No Code Bloat** | Extend existing `RotationCustomizations` type; no new tables |
| **Reuse First** | Use existing `custom_chores[]` pattern and `chore_overrides` |
| **Low Cognitive Load** | Two clear modes: "Smart Rotation" vs "I'll Choose" |
| **Simplicity** | Checkboxes for assignment; collapsed hidden section |

---

## UI Mockups

### State 1: Default View (Smart Rotation Mode)

```
+---------------------------------------------------------------------+
| Smart Family Rotation                                               |
+---------------------------------------------------------------------+
|                                                                     |
| HOW SHOULD CHORES BE ASSIGNED?                                      |
| +------------------------------------------------------------------+|
| | * Smart Rotation                                                 ||
| |   Kids rotate through chores each week automatically             ||
| |                                                                  ||
| | o I'll Choose                                                    ||
| |   Assign specific chores to each kid                             ||
| +------------------------------------------------------------------+|
|                                                                     |
| ACTIVE CHORES                                                       |
| ------------------------------------------------------------------- |
|                                                                     |
| [x] Vacuum living room                              2 pts           |
| [x] Mop kitchen floor                               2 pts           |
| [x] Take out trash                                  1 pt            |
| [x] Feed pet                                        1 pt            |
| [x] Tidy bedroom                                    1 pt            |
|                                                                     |
| YOUR CUSTOM CHORES                                                  |
| ------------------------------------------------------------------- |
| [x] Feed the fish                               1 pt           [x]  |
|                                                                     |
| [+ Add Custom Chore]                                                |
|                                                                     |
| > Show 5 hidden chores                                              |
|                                                                     |
|                                          [Cancel]    [Save]         |
+---------------------------------------------------------------------+
```

### State 2: "I'll Choose" Mode (Assignment Grid)

```
+---------------------------------------------------------------------+
| Smart Family Rotation                                               |
+---------------------------------------------------------------------+
|                                                                     |
| HOW SHOULD CHORES BE ASSIGNED?                                      |
| +------------------------------------------------------------------+|
| | o Smart Rotation                                                 ||
| | * I'll Choose                                                    ||
| +------------------------------------------------------------------+|
|                                                                     |
| ASSIGN CHORES TO KIDS                          Ciku    Julia        |
| ------------------------------------------------------------------- |
|                                                                     |
| Vacuum living room              2 pts          [x]      [ ]         |
| Mop kitchen floor               2 pts          [ ]      [x]         |
| Take out trash                  1 pt           [x]      [x]         |
| Feed pet                        1 pt           [ ]      [x]         |
| Tidy bedroom                    1 pt           [x]      [x]         |
|                                                                     |
| YOUR CUSTOM CHORES                                                  |
| ------------------------------------------------------------------- |
| Feed the fish                   1 pt           [x]      [ ]     [x] |
|                                                                     |
| [+ Add Custom Chore]                                                |
|                                                                     |
| > Show 5 hidden chores                                              |
|                                                                     |
| ------------------------------------------------------------------- |
| DAILY POINTS                    Ciku: 5 pts    Julia: 5 pts         |
|                                                                     |
|                                          [Cancel]    [Save]         |
+---------------------------------------------------------------------+
```

### State 3: Adding Custom Chore (Inline Expansion)

```
+---------------------------------------------------------------------+
|                                                                     |
| [+ Add Custom Chore]                                                |
|                                                                     |
| + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - + |
|   NEW CUSTOM CHORE                                                  |
| |                                                                 | |
|   Icon   Name                                    Points             |
| | [v]    [Feed the fish_______________]         [1 v] pts         | |
|                                                                     |
| |                              [Cancel]   [Add Chore]             | |
| + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - + |
|                                                                     |
+---------------------------------------------------------------------+
```

### State 4: Hidden Chores Expanded

```
+---------------------------------------------------------------------+
|                                                                     |
| v HIDDEN CHORES (tap checkbox to re-enable)                         |
| +------------------------------------------------------------------+|
| | [ ] Vacuum bedroom                                2 pts          ||
| | [ ] Clean bathroom                                2 pts          ||
| | [ ] Dust surfaces                                 1 pt           ||
| | [ ] Water plants                                  1 pt           ||
| | [ ] Sort laundry                                  1 pt           ||
| +------------------------------------------------------------------+|
|                                                                     |
+---------------------------------------------------------------------+
```

### Mobile View (Stacked Layout for Assignment Mode)

```
+-----------------------------------+
| Smart Family Rotation             |
+-----------------------------------+
|                                   |
| o Smart Rotation                  |
| * I'll Choose                     |
|                                   |
| ASSIGN CHORES                     |
| --------------------------------- |
|                                   |
| Vacuum living room         2 pts  |
|    [x] Ciku   [ ] Julia           |
|                                   |
| Mop kitchen floor          2 pts  |
|    [ ] Ciku   [x] Julia           |
|                                   |
| Take out trash             1 pt   |
|    [x] Ciku   [x] Julia           |
|                                   |
| --------------------------------- |
| Ciku: 4 pts    Julia: 4 pts       |
|                                   |
| [Cancel]              [Save]      |
+-----------------------------------+
```

---

## Data Model

### Extended Types

```typescript
// lib/types/rotation.ts

interface RotationConfig {
  active_preset: string;
  start_date: string;
  child_slots: ChildSlotMapping[];
  customizations?: RotationCustomizations;
  assignment_mode?: 'rotation' | 'custom';  // NEW (default: 'rotation')
}

interface RotationCustomizations {
  // Existing: Override points or disable specific chores
  chore_overrides?: Record<string, {
    points?: number;
    enabled?: boolean;  // false = hidden from rotation
  }>;

  // NEW: Custom per-kid assignments (only when assignment_mode = 'custom')
  // Maps profileId -> choreKeys[] (chores appear daily for that kid)
  custom_assignments?: Record<string, string[]>;
}

// Existing family-level custom chores (reused)
// Stored at: settings.apps.choregami.custom_chores
interface CustomChore {
  key: string;      // e.g., "custom_1737849600000"
  name: string;     // e.g., "Feed the fish"
  points: number;   // e.g., 1
  icon?: string;    // e.g., "fish" (optional)
}
```

### JSONB Storage Example

```json
{
  "apps": {
    "choregami": {
      "rotation": {
        "active_preset": "smart_rotation",
        "start_date": "2026-01-25",
        "assignment_mode": "custom",
        "child_slots": [
          { "slot": "Child A", "profile_id": "uuid-ciku" },
          { "slot": "Child B", "profile_id": "uuid-julia" }
        ],
        "customizations": {
          "chore_overrides": {
            "vacuum_bedroom": { "enabled": false },
            "clean_bathroom": { "enabled": false },
            "dust_surfaces": { "enabled": false }
          },
          "custom_assignments": {
            "uuid-ciku": ["vacuum_living", "take_trash", "tidy_room", "custom_feed_fish"],
            "uuid-julia": ["mop_kitchen", "take_trash", "feed_pet", "tidy_room"]
          }
        }
      },
      "custom_chores": [
        { "key": "custom_feed_fish", "name": "Feed the fish", "points": 1, "icon": "fish" }
      ]
    }
  }
}
```

---

## Implementation Plan

### Files to Create/Modify

| File | Type | Changes | Est. Lines |
|------|------|---------|------------|
| `lib/types/rotation.ts` | Modify | Add `assignment_mode`, `custom_assignments` | +15 |
| `lib/services/rotation-service.ts` | Modify | Handle custom assignment in `getChoresForChild()` | +30 |
| `islands/TemplateCustomizer.tsx` | **New** | Customization UI component | ~220 |
| `routes/api/rotation/customize.ts` | **New** | Save customizations endpoint | ~50 |
| `islands/FamilySettings.tsx` | Modify | Import and use TemplateCustomizer | +15 |
| **Total** | | | ~330 |

### Service Logic

```typescript
// rotation-service.ts - extend getChoresForChild()

export function getChoresForChild(
  config: RotationConfig,
  childProfileId: string,
  date: Date = new Date(),
  familyCustomChores?: CustomChore[]
): PresetChore[] {
  const preset = getPresetByKey(config.active_preset);
  if (!preset) return [];

  const customizations = config.customizations;

  // CUSTOM MODE: Kid sees their assigned chores daily
  if (config.assignment_mode === 'custom') {
    const assignedKeys = customizations?.custom_assignments?.[childProfileId] || [];

    // Map keys to chore definitions (from preset + family custom)
    let chores = assignedKeys
      .map(key => findChoreByKey(preset, familyCustomChores, key))
      .filter((c): c is PresetChore => c !== undefined);

    // Apply point overrides
    chores = applyPointOverrides(chores, customizations);
    return chores;
  }

  // ROTATION MODE: Existing logic with hidden chores filtered
  // ... existing getChoresForChild logic ...

  // Filter out disabled chores
  let chores = getRotationChoresForDay(preset, config, childProfileId, date);
  chores = chores.filter(c =>
    customizations?.chore_overrides?.[c.key]?.enabled !== false
  );

  // Append family custom chores
  chores = appendFamilyCustomChores(chores, familyCustomChores);

  // Apply point overrides
  chores = applyPointOverrides(chores, customizations);

  return chores;
}

function findChoreByKey(
  preset: RotationPreset,
  familyCustomChores: CustomChore[] | undefined,
  key: string
): PresetChore | undefined {
  // Check preset chores first
  const presetChore = preset.chores.find(c => c.key === key);
  if (presetChore) return presetChore;

  // Check family custom chores
  const customChore = familyCustomChores?.find(c => c.key === key);
  if (customChore) {
    return {
      key: customChore.key,
      name: customChore.name,
      points: customChore.points,
      icon: customChore.icon || 'sparkles',
      minutes: 5,
      category: 'custom',
    };
  }

  return undefined;
}
```

### API Endpoint

```typescript
// routes/api/rotation/customize.ts

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || session.role !== "parent") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const { assignment_mode, chore_overrides, custom_assignments, custom_chores } = body;

    // Update family settings JSONB
    // settings.apps.choregami.rotation.assignment_mode
    // settings.apps.choregami.rotation.customizations
    // settings.apps.choregami.custom_chores (family-level)

    // ... implementation ...

    return new Response(JSON.stringify({ success: true }));
  },
};
```

---

## Key Simplifications (Pareto 80/20)

| Complexity Avoided | Simpler Alternative |
|--------------------|---------------------|
| Per-day custom assignments | Custom assignments appear **daily** |
| Drag & drop UI | Checkboxes + multi-select |
| Week type customization | Use rotation mode or switch templates |
| Separate "hidden chores" storage | Reuse existing `enabled: false` |
| New custom chore table | Reuse existing `custom_chores[]` JSONB |
| Complex validation | Simple presence check |

---

## What We're NOT Building

| Feature | Reason |
|---------|--------|
| Per-day assignment grid | Too complex; daily assignment covers 80% of needs |
| Drag & drop interface | High effort, low marginal value |
| Multi-week-type customization | Users can use rotation mode instead |
| Assignment history/undo | Over-engineering for MVP |
| Template duplication/forking | Can add later if needed |
| Point editing per-chore inline | Already exists in current customization |

---

## Testing Plan

| Test | Coverage |
|------|----------|
| `rotation-service.ts` | Custom mode returns assigned chores only |
| `rotation-service.ts` | Rotation mode filters hidden chores |
| `rotation-service.ts` | Family custom chores included in both modes |
| `rotation-service.ts` | Point overrides applied in both modes |
| `TemplateCustomizer.tsx` | Toggle between assignment modes |
| `TemplateCustomizer.tsx` | Add/remove custom chores |
| `TemplateCustomizer.tsx` | Hide/show chores via checkbox |
| `TemplateCustomizer.tsx` | Kid assignment checkboxes |
| `/api/rotation/customize` | Save customizations to JSONB |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Template customization usage | 30% of families using templates |
| Custom chores added | Avg 2-3 per family |
| Assignment mode usage | 20% using "I'll Choose" mode |
| Support tickets | < 5% related to template confusion |

---

## Cross-References

### Related Documentation
- [Chore Templates Design](../chore-templates-design.md) - Original template architecture
- [JSONB Schema Design](./20260115_chore-templates-jsonb-schema.md) - Storage patterns
- [Business Requirements](../business-requirements.md) - User stories and product goals
- [Balance, Rewards & Goals](./20260125_balance_rewards_goals_implementation.md) - Recent P2-P4 features

### Existing Code to Reuse
- `lib/types/rotation.ts` - Type definitions
- `lib/services/rotation-service.ts` - Chore lookup logic
- `lib/data/rotation-presets.ts` - Preset registry
- `islands/FamilySettings.tsx` - Settings modal patterns

---

## Implementation Order

1. **Types** (15 min) - Extend `RotationConfig` and `RotationCustomizations`
2. **Service** (30 min) - Add custom assignment logic to `getChoresForChild()`
3. **API** (30 min) - Create `/api/rotation/customize` endpoint
4. **UI** (2 hrs) - Build `TemplateCustomizer` island
5. **Integration** (30 min) - Wire into FamilySettings
6. **Testing** (1 hr) - Unit tests for service and component

**Total Estimated Effort**: ~4.5 hours

---

*Document Created*: January 25, 2026
*Source*: Beta User Feedback
*Author*: Claude Code AI Assistant
