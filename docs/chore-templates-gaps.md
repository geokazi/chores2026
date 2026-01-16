# Chore Templates - Implementation Gaps & Completion Plan

**Document Created**: January 15, 2026
**Status**: ✅ **COMPLETE** - All gaps implemented
**Architecture Decision**: Virtual (Compute on Load) + Direct Transaction Recording
**Completed**: January 15, 2026

---

## Executive Summary

The chore templates feature is **100% complete**. All gaps have been implemented:

- ✅ Static preset definitions (3 templates)
- ✅ Rotation service with schedule lookups
- ✅ Apply/Delete/Status API endpoints
- ✅ FamilySettings UI for template selection
- ✅ Completion API for rotation chores (`/api/rotation/complete`)
- ✅ Kid dashboard UI integration (merged chore display)
- ✅ TransactionService connection (backwards-compatible)

**Implementation commits:**
- `198c2be` 📝 Document chore templates gaps & add status endpoint
- `99d3327` ✅ Add tests for rotation API endpoints
- `59e8a50` ✨ Implement rotation chores end-to-end (Gap 0-4)

---

## Template Tracking & Routing Decision

### Where Is The Active Template Stored?

```
families.settings (JSONB)
└── apps
    └── choregami
        └── rotation
            ├── active_preset: "smart_rotation" | "weekend_warrior" | "daily_basics"
            ├── start_date: "2026-01-15"
            └── child_slots: [{ slot: "Child A", profile_id: "uuid" }, ...]
```

### How Do We Read It?

```typescript
// lib/services/rotation-service.ts
export function getRotationConfig(familySettings: Record<string, unknown>): RotationConfig | null {
  const apps = familySettings?.apps;
  const choregami = apps?.choregami;
  const rotation = choregami?.rotation;
  return rotation ?? null;  // null = no template active, use chore_assignments only
}
```

### Routing Decision: Manual vs Rotation Chores

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTING DECISION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Read family.settings via getRotationConfig()                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ rotation = getRotationConfig(family.settings)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ├─── rotation === null ─────────────────────────────────▶ │
│       │                                                         │
│       │    USE EXISTING FLOW ONLY:                              │
│       │    • Query choretracker.chore_assignments               │
│       │    • Query choretracker.chore_templates                 │
│       │    • Complete via ChoreService.completeChore()          │
│       │    • No rotation chores displayed                       │
│       │                                                         │
│       └─── rotation !== null ─────────────────────────────────▶ │
│                                                                 │
│            USE BOTH FLOWS (merged):                             │
│            ┌───────────────────────────────────────────────┐   │
│            │ MANUAL CHORES (from DB)                       │   │
│            │ • choretracker.chore_assignments              │   │
│            │ • Complete via ChoreService.completeChore()   │   │
│            └───────────────────────────────────────────────┘   │
│                            +                                    │
│            ┌───────────────────────────────────────────────┐   │
│            │ ROTATION CHORES (computed)                    │   │
│            │ • getPresetByKey(rotation.active_preset)      │   │
│            │   → "smart_rotation" | "weekend_warrior"      │   │
│            │     | "daily_basics"                          │   │
│            │ • getChoresForChild(rotation, profileId)      │   │
│            │ • Complete via /api/rotation/complete (NEW)   │   │
│            └───────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Which Template Schedule To Use?

The `active_preset` field determines which schedule:

```typescript
// When rotation.active_preset === "smart_rotation"
const preset = getPresetByKey("smart_rotation");
// → SMART_ROTATION_PRESET: biweekly (cleaning/non-cleaning weeks)

// When rotation.active_preset === "weekend_warrior"
const preset = getPresetByKey("weekend_warrior");
// → WEEKEND_WARRIOR_PRESET: light weekdays, heavy weekends

// When rotation.active_preset === "daily_basics"
const preset = getPresetByKey("daily_basics");
// → DAILY_BASICS_PRESET: same chores every day
```

---

## UI: Where To Change Active Template

### Location: `/parent/settings` → FamilySettings Island

**File**: `islands/FamilySettings.tsx` (lines 459-496, 816-891)

### Current UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE SELECTION UI                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Parent navigates to: /parent/settings                          │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ "📋 Chore Rotation" section (line 459)                  │   │
│  │                                                         │   │
│  │ IF activeRotation exists:                               │   │
│  │   ┌───────────────────────────────────────────────────┐ │   │
│  │   │ 🎯 Smart Family Rotation                          │ │   │
│  │   │ Started 2026-01-15                                │ │   │
│  │   │ [Change Template] [Remove]                        │ │   │
│  │   └───────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │ IF no activeRotation:                                   │   │
│  │   [Set Up Chore Rotation] button                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       │ Click "Set Up" or "Change Template"                     │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MODAL: "📋 Choose Chore Template" (line 816)            │   │
│  │                                                         │   │
│  │ ○ 🎯 Smart Family Rotation                              │   │
│  │     Two-week cycle balancing cleaning intensity...      │   │
│  │                                                         │   │
│  │ ○ ⚡ Weekend Warrior                                     │   │
│  │     Light weekday chores, intensive weekend...          │   │
│  │                                                         │   │
│  │ ○ 🌱 Daily Basics                                       │   │
│  │     Simple, consistent daily routine...                 │   │
│  │                                                         │   │
│  │ ─────────────────────────────────────────────────────   │   │
│  │ Assign Kids to Slots:                                   │   │
│  │ Child A → [Emma ▼]                                      │   │
│  │ Child B → [Noah ▼]                                      │   │
│  │                                                         │   │
│  │ [Activate Template] [Cancel]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       │ Click "Activate Template"                               │
│       ▼                                                         │
│  POST /api/rotation/apply                                       │
│  { preset_key: "smart_rotation", child_slots: [...] }           │
│       │                                                         │
│       ▼                                                         │
│  Updates families.settings.apps.choregami.rotation              │
│       │                                                         │
│       ▼                                                         │
│  Page reloads → activeRotation now shows selected template      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Code References

| Action | Location | Code |
|--------|----------|------|
| Read active rotation | Line 67 | `const activeRotation = getRotationConfig(settings \|\| {});` |
| Open modal | Line 225-236 | `openRotationModal()` |
| Apply rotation | Line 238-275 | `handleApplyRotation()` → POST `/api/rotation/apply` |
| Remove rotation | Line 277-289 | `handleRemoveRotation()` → DELETE `/api/rotation/apply` |
| Preset radio buttons | Line 821-845 | Radio inputs with `ROTATION_PRESETS` |
| Child slot mapping | Line 847-871 | Dropdown selects per slot |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/rotation/apply` | Set active_preset + child_slots |
| DELETE | `/api/rotation/apply` | Remove rotation config |
| GET | `/api/rotation/status` | Get current rotation state |

---

## Gap 0: Routing Logic Not Implemented in Kid Dashboard

### Current State

- ✅ `getRotationConfig()` function exists
- ✅ `getChoresForChild()` function exists
- ❌ Kid dashboard/API does NOT call these functions
- ❌ No code checks `rotation !== null` to merge both chore sources

### Required Implementation

```typescript
// In kid chores API or dashboard data fetching

async function getKidChores(profileId: string, familyId: string, familySettings: any) {
  // 1. ALWAYS get manual chores from database
  const manualChores = await choreService.getTodaysChores(profileId, familyId);

  // 2. CHECK if rotation template is active
  const rotationConfig = getRotationConfig(familySettings);

  // 3. CONDITIONALLY get rotation chores
  let rotationChores: PresetChore[] = [];
  if (rotationConfig) {
    // Template IS active - compute virtual rotation chores
    rotationChores = getChoresForChild(rotationConfig, profileId, new Date());
  }
  // If rotationConfig is null, rotationChores stays empty []

  // 4. MERGE both lists (manual always included, rotation only if active)
  return {
    manual: manualChores,
    rotation: rotationChores,
  };
}
```

---

## Architecture Decision: Virtual + Direct Recording

### Chosen Approach

| Decision | Choice | Rationale |
|--------|--------|-----------|
| **Chore Loading** | Virtual (compute on load) | No daily jobs, no stale data, 80/20 principle |
| **Completion Tracking** | Direct TransactionService | Simpler, no assignment records needed |

### Why NOT Materialized Assignments

```
❌ REJECTED: Create chore_assignments daily

Reasons:
• Requires cron job / scheduled task
• Stale assignments if template changed mid-day
• More code, more maintenance
• Violates 80/20 principle
```

### Chosen Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIRTUAL + DIRECT RECORDING                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Kid opens dashboard                                         │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ getChoresForChild(config, profileId, today)             │   │
│  │ → Returns PresetChore[] (computed from static data)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       │  NO database query for rotation chores                  │
│       │  Merged with manual chores from chore_assignments       │
│       │                                                         │
│       ▼                                                         │
│  2. Kid taps "I Did This!" on rotation chore                    │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /api/rotation/complete                             │   │
│  │ { preset_key, chore_key, date }                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ TransactionService.recordChoreCompletion()              │   │
│  │ • Synthetic ID: rotation_{preset}_{chore}_{date}        │   │
│  │ • Points from preset definition                         │   │
│  │ • Full FamilyScore integration                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       │  NO chore_assignment record created                     │
│       │  Transaction is the source of truth                     │
│       │                                                         │
│       ▼                                                         │
│  3. Completion tracked via chore_transactions table             │
│     • transaction_type: "chore_completed"                       │
│     • chore_assignment_id: NULL (rotation chores)               │
│     • metadata.rotation_preset: preset_key                      │
│     • metadata.rotation_chore: chore_key                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gap 1: Completion API (Missing)

### Current State
No endpoint exists to complete rotation chores.

### Required: `/api/rotation/complete.ts`

```typescript
// routes/api/rotation/complete.ts (~80 lines)

interface CompleteRequest {
  preset_key: string;
  chore_key: string;
  date: string;  // YYYY-MM-DD (for idempotency)
}

// Endpoint responsibilities:
// 1. Validate preset exists and is active for family
// 2. Validate chore_key exists in preset
// 3. Validate chore is scheduled for this profile on this date
// 4. Check for duplicate completion (same chore, same date)
// 5. Call TransactionService.recordChoreCompletion()
// 6. Return success with points awarded
```

### TransactionService Integration

```typescript
// Direct recording - no assignment record needed
await transactionService.recordChoreCompletion(
  null,  // No chore_assignment_id for rotation chores
  chore.points,
  chore.name,
  profileId,
  familyId,
  {
    // Metadata for audit trail
    rotation_preset: preset_key,
    rotation_chore: chore_key,
    rotation_date: date,
    source: "rotation_template"
  }
);
```

### Idempotency Check

```typescript
// Prevent double-completion of same rotation chore on same day
const existingCompletion = await supabase
  .schema("choretracker")
  .from("chore_transactions")
  .select("id")
  .eq("family_id", familyId)
  .eq("profile_id", profileId)
  .eq("transaction_type", "chore_completed")
  .contains("metadata", {
    rotation_preset: preset_key,
    rotation_chore: chore_key,
    rotation_date: date
  })
  .single();

if (existingCompletion.data) {
  return Response.json({ error: "Chore already completed today" }, { status: 409 });
}
```

---

## Gap 2: Kid Dashboard UI Integration (Missing)

### Current State
- `getChoresForChild()` exists in `rotation-service.ts`
- Kid dashboard does NOT call it
- Rotation chores are not displayed

### Required Changes

#### 2a. Data Fetching Route

Either modify existing `/api/kid/chores.ts` or create `/api/rotation/today.ts`:

```typescript
// Option A: Extend existing chores API
// In routes/api/kid/chores.ts

import { getRotationConfig, getChoresForChild } from "../../lib/services/rotation-service.ts";

// After fetching manual chores, also get rotation chores:
const rotationConfig = getRotationConfig(family.settings);
const rotationChores = rotationConfig
  ? getChoresForChild(rotationConfig, profileId, new Date())
  : [];

// Merge and return both
return Response.json({
  manual_chores: manualChores,
  rotation_chores: rotationChores.map(c => ({
    ...c,
    source: "rotation",
    preset_key: rotationConfig.active_preset
  }))
});
```

#### 2b. Kid Dashboard Island Changes

```typescript
// In islands/KidDashboard.tsx or similar

// 1. Fetch rotation chores along with manual chores
const [manualChores, setManualChores] = useState([]);
const [rotationChores, setRotationChores] = useState([]);

// 2. Merge for display
const allChores = [
  ...manualChores.map(c => ({ ...c, source: "manual" })),
  ...rotationChores.map(c => ({ ...c, source: "rotation" }))
];

// 3. Sort by priority (see design doc)
allChores.sort((a, b) => {
  // Manual with due_time first
  if (a.due_time && !b.due_time) return -1;
  if (!a.due_time && b.due_time) return 1;
  // Then rotation by points (highest first)
  if (a.source === "rotation" && b.source === "rotation") {
    return b.points - a.points;
  }
  return 0;
});

// 4. Different completion handlers
const handleComplete = async (chore) => {
  if (chore.source === "rotation") {
    await fetch("/api/rotation/complete", {
      method: "POST",
      body: JSON.stringify({
        preset_key: chore.preset_key,
        chore_key: chore.key,
        date: new Date().toISOString().split("T")[0]
      })
    });
  } else {
    // Existing manual chore completion
    await fetch(`/api/chores/${chore.id}/complete`, { method: "POST" });
  }
};
```

#### 2c. Visual Differentiation

```tsx
// Rotation chore card
<div class="chore-card">
  {chore.source === "rotation" && <span class="rotation-badge">🔄</span>}
  <span class="chore-icon">{chore.icon}</span>
  <div class="chore-details">
    <strong>{chore.name}</strong>
    {chore.source === "rotation" && (
      <span class="chore-source">From: {presetName}</span>
    )}
  </div>
  <span class="chore-points">+{chore.points} pts</span>
  <button onClick={() => handleComplete(chore)}>✨ I Did This!</button>
</div>
```

---

## Gap 3: TransactionService Modification (Minor)

### Current State
`recordChoreCompletion()` requires `choreAssignmentId` as first parameter.

### Required: Support Null Assignment ID

```typescript
// In lib/services/transaction-service.ts

async recordChoreCompletion(
  choreAssignmentId: string | null,  // Allow null for rotation chores
  pointValue: number,
  choreName: string,
  profileId: string,
  familyId: string,
  metadata?: Record<string, unknown>  // NEW: Optional metadata
): Promise<void> {
  // ... existing logic ...

  const transactionData = {
    family_id: familyId,
    profile_id: profileId,
    chore_assignment_id: choreAssignmentId,  // Can be null
    transaction_type: "chore_completed",
    points_change: pointValue,
    balance_after_transaction: balanceAfterTransaction,
    description: `Chore completed: ${choreName} (+${pointValue} pts)`,
    week_ending: weekEnding,
    metadata: {
      source: "chores2026",
      timestamp: new Date().toISOString(),
      ...metadata  // Spread additional metadata
    },
    // ...
  };
}
```

---

## Gap 4: Completion Status Tracking (Missing)

### Problem
How do we know which rotation chores are already completed today?

### Solution: Query Transactions

```typescript
// In API or rotation-service.ts

async function getCompletedRotationChores(
  familyId: string,
  profileId: string,
  date: string
): Promise<Set<string>> {
  const { data } = await supabase
    .schema("choretracker")
    .from("chore_transactions")
    .select("metadata")
    .eq("family_id", familyId)
    .eq("profile_id", profileId)
    .eq("transaction_type", "chore_completed")
    .contains("metadata", { rotation_date: date });

  const completedKeys = new Set<string>();
  for (const tx of data || []) {
    if (tx.metadata?.rotation_chore) {
      completedKeys.add(tx.metadata.rotation_chore);
    }
  }
  return completedKeys;
}

// Usage in kid chores API:
const completedToday = await getCompletedRotationChores(familyId, profileId, today);
const rotationChores = getChoresForChild(config, profileId).map(chore => ({
  ...chore,
  completed: completedToday.has(chore.key)
}));
```

---

## Implementation Checklist

### Summary of All Gaps

| Gap | Description | Status | Actual |
|-----|-------------|--------|--------|
| **Gap 0** | Routing logic (check `getRotationConfig()` in kid API) | ✅ Complete | `routes/api/kids/chores.ts` |
| **Gap 1** | Completion API (`/api/rotation/complete`) | ✅ Complete | `routes/api/rotation/complete.ts` |
| **Gap 2** | Kid dashboard UI integration | ✅ Complete | `islands/ChoreList.tsx` |
| **Gap 3** | TransactionService null assignment support | ✅ Complete | Backwards-compatible change |
| **Gap 4** | Completion status tracking query | ✅ Complete | `routes/api/rotation/today.ts` |

### New Files Created

| File | Lines | Purpose | Gap |
|------|-------|---------|-----|
| `routes/api/rotation/complete.ts` | 137 | Complete rotation chore + idempotency | Gap 1 |
| `routes/api/rotation/today.ts` | 134 | Get today's rotation chores with status | Gap 0, 4 |

### Existing Files Modified

| File | Changes | Gap |
|------|---------|-----|
| `lib/services/transaction-service.ts` | Allow null `choreAssignmentId`, add metadata param | Gap 3 |
| `islands/ChoreList.tsx` | Handle rotation completion, show 🔄 badge | Gap 2 |
| `routes/api/kids/chores.ts` | Merge manual + rotation chores in response | Gap 0 |

### Actual Code Added

```
New files:
  routes/api/rotation/complete.ts    137 lines
  routes/api/rotation/today.ts       134 lines
                                    ─────────
                                     271 lines

Modifications:
  transaction-service.ts             +10 lines
  ChoreList.tsx                      +35 lines
  routes/api/kids/chores.ts          +70 lines
                                    ─────────
                                    +115 lines

TOTAL: ~416 lines added
```

---

## Backwards Compatibility: TransactionService (Gap 3)

The `recordChoreCompletion` method was modified to support rotation chores **without breaking existing callers**.

### Change Summary

**Before:**
```typescript
async recordChoreCompletion(
  choreAssignmentId: string,      // Required string
  pointValue: number,
  choreName: string,
  profileId: string,
  familyId: string,
): Promise<void>
```

**After:**
```typescript
async recordChoreCompletion(
  choreAssignmentId: string | null,  // Now accepts null
  pointValue: number,
  choreName: string,
  profileId: string,
  familyId: string,
  metadata?: Record<string, unknown>, // NEW: Optional metadata
): Promise<void>
```

### Why It's Backwards Compatible

1. **Type Widening**: `string` is assignable to `string | null`
   - Existing callers passing a UUID string still work
   - TypeScript allows passing a narrower type where a wider type is expected

2. **Optional Parameter**: `metadata?` uses the `?` suffix
   - Existing callers don't need to pass it
   - Defaults to `undefined` which spreads as no-op in the metadata object

3. **Internal Handling Already Existed**:
   - `createTransaction` already used `choreAssignmentId ?? null`
   - The database column `chore_assignment_id` already allowed NULL

### Existing Caller (Unchanged)

```typescript
// routes/api/chores/[chore_id]/complete.ts:119
await transactionService.recordChoreCompletion(
  choreId,           // string ✓ (assignable to string | null)
  chore.point_value,
  chore.chore_template?.name || "Chore",
  userId,
  user.family_id,
  // no metadata ✓ (parameter is optional)
);
```

### New Rotation Caller

```typescript
// routes/api/rotation/complete.ts:110
await transactionService.recordChoreCompletion(
  null,              // null ✓ (rotation chores have no assignment)
  chore.points,
  chore.name,
  profileId,
  familyId,
  {                  // metadata ✓ (for idempotency tracking)
    rotation_preset: config.active_preset,
    rotation_chore: chore_key,
    rotation_date: date,
    source: "rotation_template"
  }
);
```

### Metadata Usage

The optional metadata is merged into the transaction record:

```typescript
// In createTransaction()
metadata: {
  source: "chores2026",
  timestamp: new Date().toISOString(),
  ...request.metadata,  // Spread custom metadata (no-op if undefined)
},
```

This allows rotation chores to be identified and queried for idempotency:

```typescript
// Check if rotation chore already completed today
.contains("metadata", {
  rotation_preset: preset_key,
  rotation_chore: chore_key,
  rotation_date: date
})
```

---

## Testing Plan

### Manual Testing

1. **Apply template** via FamilySettings → verify config saved
2. **Kid dashboard** → verify rotation chores appear
3. **Complete rotation chore** → verify points awarded
4. **Refresh dashboard** → verify completed chore shows as done
5. **Parent dashboard** → verify completion appears in activity feed
6. **Next day** → verify same chores available again (daily cycle)

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Complete same chore twice | 409 Conflict - "Already completed" |
| Complete chore not scheduled today | 400 Bad Request |
| Complete after template removed | 400 Bad Request - "No active rotation" |
| Complete for wrong child slot | 400 Bad Request - "Not assigned to you" |

---

## References

- [Main Design Document](./chore-templates-design.md)
- [JSONB Schema Design](./chore-templates-jsonb-schema.md)
- [TransactionService](../lib/services/transaction-service.ts)
- [Rotation Service](../lib/services/rotation-service.ts)
