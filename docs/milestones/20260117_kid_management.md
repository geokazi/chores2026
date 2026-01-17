# Kid Management Feature

**Date**: January 17, 2026
**Status**: Complete

## Overview

Added ability to manage kids (add, edit, remove) directly from Family Settings page.

## Features

### Add Kids
- Maximum 8 kids per family
- "+ Add Kid" button in Family Members section
- Simple modal with name input

### Edit Kid Names
- Pencil icon (✏️) next to each kid
- Modal with pre-filled name
- Updates immediately on save

### Remove Kids
- Trash icon (🗑️) next to each kid
- **If kid has points**: Confirmation dialog first
- **Always**: Requires parent PIN verification
- **Soft delete**: Sets `is_deleted=true`, preserves all data

## UI

```
👨‍👩‍👧‍👦 Family Members (3/8 kids)
├── Ciku      107 points  [✏️][🗑️]
├── Julia      43 points  [✏️][🗑️]
├── Tonie!     37 points  [✏️][🗑️]
├── Mom        20 points
└── Dad        12 points
         [+ Add Kid]
```

## API

**Endpoint**: `POST /api/family/manage-kid`

```typescript
// Add kid
{ action: "add", name: "Kid Name" }

// Edit kid
{ action: "edit", kid_id: "uuid", name: "New Name" }

// Remove kid (soft delete)
{ action: "remove", kid_id: "uuid" }
```

## Files Modified

| File | Purpose |
|------|---------|
| `lib/services/chore-service.ts` | `addKid`, `updateKidName`, `softDeleteKid`, `getKidCount` |
| `routes/api/family/manage-kid.ts` | NEW - Single endpoint for all actions |
| `islands/FamilySettings.tsx` | UI: buttons, modals, handlers |
| `tests/kid-management.test.ts` | NEW - 5 tests covering all scenarios |

## Database

Uses existing `family_profiles` table:
- `role = 'child'` for kids
- `is_deleted = true` for soft-deleted kids
- Soft-deleted kids excluded from all queries via `.eq("is_deleted", false)`

## Security

- Session-based authentication (no GUIDs in URLs)
- Kid must belong to authenticated family
- Remove action requires parent PIN verification
- Confirmation dialog if removing kid with points > 0

## Tests

```bash
deno test --allow-env --allow-net --allow-read tests/kid-management.test.ts
```

5 tests:
1. `getKidCount` - returns correct count
2. `addKid` - adds kid, respects max limit
3. `updateKidName` - updates name
4. `softDeleteKid` - marks as deleted
5. `addKid` - enforces max 8 limit
