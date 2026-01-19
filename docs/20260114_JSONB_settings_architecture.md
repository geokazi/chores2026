# JSONB Settings Architecture

**Date**: January 14, 2026
**Status**: ✅ Implemented
**Migration**: [`sql/20260114_jsonb_settings.sql`](../sql/20260114_jsonb_settings.sql)

## Problem Statement

### Immediate Issue
The `families.theme` column doesn't exist, causing login failures after session caching optimization attempted to query it.

### Architectural Issue
Multiple apps share the same family data but need app-specific settings:
- **ChoreGami 2026** (`/Users/georgekariuki/repos/deno2/chores2026/`)
- **Choregami Meal Planner** (`/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/`)
- **FamilyScore** (`/Users/georgekariuki/repos/elixir/famscorepoc/`)
- **Fresh Auth (Choregami v1)** (`/Users/georgekariuki/repos/deno2/fresh-auth/`)

Currently, adding new settings requires:
1. Database migration (ALTER TABLE)
2. Update all apps that query the table
3. Handle column existence across environments

---

## Solution: JSONB Settings Columns

Add flexible JSONB columns that allow schema-less settings storage with namespacing per app.

### Design Principles

1. **No migrations for new settings** - Add keys to JSON, not columns
2. **App isolation** - Each app has its own namespace
3. **Inheritance** - Member preferences override family defaults
4. **Backwards compatible** - Old apps ignore new keys
5. **Type-safe defaults** - Always provide fallbacks in application code

---

## Schema Design

### Option 1: Family-Level Settings Only

```sql
ALTER TABLE public.families
ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';
```

**Pros**: Simple, single source of truth
**Cons**: No per-member customization

### Option 2: Per-Member Preferences Only

```sql
ALTER TABLE public.family_profiles
ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}';
```

**Pros**: Individual customization
**Cons**: No family-wide defaults, duplication

### Option 3: Both (Recommended)

```sql
-- Family-wide settings (defaults, app configs, feature flags)
ALTER TABLE public.families
ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';

-- Per-member preferences (overrides, personal UI prefs)
ALTER TABLE public.family_profiles
ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}';
```

**Pros**:
- Family defaults with member overrides
- Clean separation of concerns
- Flexible inheritance pattern

**Cons**:
- Slightly more complex queries
- Need to handle merge logic in app code

---

## JSON Structure Specification

### families.settings

```jsonc
{
  // Global family settings
  "theme": "fresh_meadow",           // Default theme for all members
  "timezone": "America/New_York",    // Family timezone
  "locale": "en-US",                 // Language/locale preference
  "currency": "USD",                 // Currency for money display

  // App-specific configurations (namespaced)
  "apps": {
    "choregami": {
      "points_per_dollar": 1,
      "children_pins_enabled": true,
      "weekly_bonus_points": 5,
      "perfect_week_bonus": 10,
      "require_photo_proof": false,
      "auto_approve_under_points": 0
    },
    "mealplanner": {
      "default_servings": 4,
      "dietary_restrictions": ["vegetarian", "nut-free"],
      "preferred_cuisines": ["italian", "mexican"],
      "grocery_store": "Whole Foods",
      "budget_per_week": 200
    },
    "familyscore": {
      "leaderboard_enabled": true,
      "streak_notifications": true,
      "public_profile": false,
      "sync_interval_minutes": 5
    }
  },

  // Feature flags (for A/B testing, beta features)
  "feature_flags": {
    "beta_reports": true,
    "dark_mode_enabled": false,
    "ai_suggestions": false,
    "gamification_v2": true
  },

  // Metadata
  "_version": 1,                     // Schema version for migrations
  "_updated_at": "2026-01-14T10:30:00Z"
}
```

### family_profiles.preferences

```jsonc
{
  // Personal overrides (null = use family default)
  "theme": "ocean_depth",            // Override family theme
  "locale": null,                    // Use family default

  // Personal display settings
  "avatar_emoji": "🦊",
  "display_name_override": "CikuBear",
  "compact_view": true,
  "animations_enabled": true,

  // Notification preferences
  "notifications": {
    "chore_reminders": true,
    "points_earned": true,
    "weekly_summary": false,
    "family_activity": true,
    "push_enabled": false,
    "email_enabled": true
  },

  // App-specific personal preferences
  "apps": {
    "choregami": {
      "show_dollar_values": true,
      "default_chore_view": "today",   // "today" | "week" | "all"
      "celebration_sounds": true
    },
    "mealplanner": {
      "show_nutrition_info": false,
      "portion_size": "regular"        // "small" | "regular" | "large"
    }
  },

  // Accessibility
  "accessibility": {
    "high_contrast": false,
    "large_text": false,
    "reduce_motion": false
  },

  // Metadata
  "_version": 1,
  "_updated_at": "2026-01-14T10:30:00Z"
}
```

---

## Inheritance & Resolution Pattern

When retrieving a setting, use this priority order:

```
1. Member preference (if set and not null)
2. Family setting (if set)
3. Application default (hardcoded fallback)
```

### TypeScript Helper

```typescript
/**
 * Resolve a setting with inheritance: member -> family -> default
 */
export function resolveSetting<T>(
  memberPrefs: Record<string, any> | null,
  familySettings: Record<string, any> | null,
  path: string,
  defaultValue: T
): T {
  // Try member preference first
  const memberValue = getNestedValue(memberPrefs, path);
  if (memberValue !== null && memberValue !== undefined) {
    return memberValue as T;
  }

  // Fall back to family setting
  const familyValue = getNestedValue(familySettings, path);
  if (familyValue !== null && familyValue !== undefined) {
    return familyValue as T;
  }

  // Use application default
  return defaultValue;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// Usage:
const theme = resolveSetting(
  member.preferences,
  family.settings,
  'theme',
  'fresh_meadow'
);

const pointsPerDollar = resolveSetting(
  member.preferences,
  family.settings,
  'apps.choregami.points_per_dollar',
  1
);
```

### SQL Helper Function

```sql
-- Create a function to resolve settings with inheritance
CREATE OR REPLACE FUNCTION resolve_setting(
  member_prefs JSONB,
  family_settings JSONB,
  setting_path TEXT[],
  default_value JSONB
) RETURNS JSONB AS $$
DECLARE
  member_val JSONB;
  family_val JSONB;
BEGIN
  -- Try member preference
  member_val := member_prefs #> setting_path;
  IF member_val IS NOT NULL AND member_val != 'null'::jsonb THEN
    RETURN member_val;
  END IF;

  -- Try family setting
  family_val := family_settings #> setting_path;
  IF family_val IS NOT NULL AND family_val != 'null'::jsonb THEN
    RETURN family_val;
  END IF;

  -- Return default
  RETURN default_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage:
SELECT resolve_setting(
  fp.preferences,
  f.settings,
  ARRAY['theme'],
  '"fresh_meadow"'::jsonb
)::text as theme
FROM family_profiles fp
JOIN families f ON f.id = fp.family_id
WHERE fp.id = '...';
```

---

## Query Patterns

### Get All Settings for Session (Optimized)

```sql
-- Single query to get family + member + resolved settings
SELECT
  fp.id as profile_id,
  fp.name as profile_name,
  fp.role,
  fp.current_points,
  fp.preferences,
  f.id as family_id,
  f.name as family_name,
  f.settings,
  -- Pre-resolve common settings for convenience
  COALESCE(
    fp.preferences->>'theme',
    f.settings->>'theme',
    'fresh_meadow'
  ) as effective_theme,
  COALESCE(
    (f.settings->'apps'->'choregami'->>'points_per_dollar')::int,
    1
  ) as points_per_dollar,
  COALESCE(
    (f.settings->'apps'->'choregami'->>'children_pins_enabled')::boolean,
    false
  ) as children_pins_enabled
FROM family_profiles fp
JOIN families f ON f.id = fp.family_id
WHERE fp.user_id = $1 AND fp.is_deleted = false;
```

### Update App-Specific Setting

```sql
-- Update a nested setting without overwriting others
UPDATE families
SET settings = jsonb_set(
  COALESCE(settings, '{}'),
  '{apps,choregami,points_per_dollar}',
  '10'::jsonb
)
WHERE id = $1;
```

### Add New Feature Flag

```sql
-- Safe upsert of feature flag
UPDATE families
SET settings = jsonb_set(
  jsonb_set(
    COALESCE(settings, '{}'),
    '{feature_flags}',
    COALESCE(settings->'feature_flags', '{}')
  ),
  '{feature_flags,new_feature}',
  'true'::jsonb
)
WHERE id = $1;
```

### Query Families with Specific Feature

```sql
-- Find families with beta_reports enabled
SELECT id, name
FROM families
WHERE settings->'feature_flags'->>'beta_reports' = 'true';
```

---

## Migration Plan

### Phase 1: Add Columns (Non-Breaking)

```sql
-- Migration: 001_add_jsonb_settings.sql
-- Safe to run: adds columns with defaults, doesn't affect existing queries

BEGIN;

-- Add settings column to families
ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- Add preferences column to family_profiles
ALTER TABLE public.family_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_families_settings_gin
ON public.families USING GIN (settings);

CREATE INDEX IF NOT EXISTS idx_family_profiles_preferences_gin
ON public.family_profiles USING GIN (preferences);

COMMIT;
```

### Phase 2: Migrate Existing Columns

```sql
-- Migration: 002_migrate_existing_settings.sql
-- Move existing column values into JSONB structure

BEGIN;

-- Migrate families columns to settings JSONB
UPDATE public.families
SET settings = jsonb_build_object(
  'apps', jsonb_build_object(
    'choregami', jsonb_build_object(
      'points_per_dollar', COALESCE(points_per_dollar, 1),
      'children_pins_enabled', COALESCE(children_pins_enabled, false),
      'weekly_bonus_points', COALESCE(weekly_bonus_points, 5)
    )
  ),
  'theme', COALESCE(theme, 'fresh_meadow'),
  '_version', 1,
  '_migrated_at', NOW()
)
WHERE settings = '{}';

COMMIT;
```

### Phase 3: Update Application Code

Update session.ts to read from JSONB:

```typescript
// Before
.select("id, name, points_per_dollar, children_pins_enabled, theme")

// After
.select("id, name, settings")

// Then in code:
const settings = familyInfo.settings || {};
const choregamiSettings = settings.apps?.choregami || {};

return {
  family: {
    id: familyInfo.id,
    name: familyInfo.name,
    points_per_dollar: choregamiSettings.points_per_dollar || 1,
    children_pins_enabled: choregamiSettings.children_pins_enabled || false,
    theme: settings.theme || 'fresh_meadow',
    settings, // Pass full settings for app-specific access
  }
};
```

### Phase 4: Deprecate Old Columns (Optional)

```sql
-- Migration: 003_deprecate_old_columns.sql
-- Only run after all apps are updated to use JSONB

-- Add comments marking columns as deprecated
COMMENT ON COLUMN public.families.points_per_dollar IS
  'DEPRECATED: Use settings->apps->choregami->points_per_dollar';
COMMENT ON COLUMN public.families.children_pins_enabled IS
  'DEPRECATED: Use settings->apps->choregami->children_pins_enabled';

-- Optionally drop after verification period
-- ALTER TABLE public.families DROP COLUMN points_per_dollar;
-- ALTER TABLE public.families DROP COLUMN children_pins_enabled;
```

---

## Application Integration

### Session.ts Update

```typescript
export interface FamilySettings {
  theme?: string;
  timezone?: string;
  locale?: string;
  apps?: {
    choregami?: {
      points_per_dollar?: number;
      children_pins_enabled?: boolean;
      weekly_bonus_points?: number;
    };
    mealplanner?: Record<string, any>;
    familyscore?: Record<string, any>;
  };
  feature_flags?: Record<string, boolean>;
}

export interface ChoreGamiSession {
  user: { ... } | null;
  family: {
    id: string;
    name: string;
    settings: FamilySettings;
    members: FamilyMember[];
  } | null;
  // Convenience getters (resolved from settings)
  effectiveTheme: string;
  pointsPerDollar: number;
  childrenPinsEnabled: boolean;
}
```

### Settings Service

```typescript
// lib/services/settings-service.ts

export class SettingsService {
  constructor(private client: SupabaseClient) {}

  /**
   * Get a family setting with default fallback
   */
  getFamilySetting<T>(
    settings: FamilySettings,
    path: string,
    defaultValue: T
  ): T {
    const value = this.getNestedValue(settings, path);
    return value ?? defaultValue;
  }

  /**
   * Update a family setting (merges, doesn't overwrite)
   */
  async updateFamilySetting(
    familyId: string,
    path: string,
    value: any
  ): Promise<void> {
    const pathArray = path.split('.');

    await this.client
      .from('families')
      .update({
        settings: this.client.rpc('jsonb_set_nested', {
          target: 'settings',
          path: pathArray,
          value: JSON.stringify(value)
        })
      })
      .eq('id', familyId);
  }

  /**
   * Get app-specific settings with defaults
   */
  getChoreGamiSettings(settings: FamilySettings): ChoreGamiAppSettings {
    const appSettings = settings?.apps?.choregami || {};
    return {
      pointsPerDollar: appSettings.points_per_dollar ?? 1,
      childrenPinsEnabled: appSettings.children_pins_enabled ?? false,
      weeklyBonusPoints: appSettings.weekly_bonus_points ?? 5,
      perfectWeekBonus: appSettings.perfect_week_bonus ?? 10,
      requirePhotoProof: appSettings.require_photo_proof ?? false,
    };
  }
}
```

---

## Cross-App Compatibility

### App Registration Pattern

Each app should register its settings schema:

```typescript
// shared/settings-schema.ts (could be in a shared package)

export const APP_SETTINGS_SCHEMAS = {
  choregami: {
    version: 1,
    defaults: {
      points_per_dollar: 1,
      children_pins_enabled: false,
      weekly_bonus_points: 5,
    }
  },
  mealplanner: {
    version: 1,
    defaults: {
      default_servings: 4,
      dietary_restrictions: [],
    }
  },
  familyscore: {
    version: 1,
    defaults: {
      leaderboard_enabled: true,
      sync_interval_minutes: 5,
    }
  }
};
```

### Reading Other App's Settings

Apps can read (but shouldn't write) other apps' settings:

```typescript
// ChoreGami reading FamilyScore sync status
const familyScoreSettings = settings.apps?.familyscore || {};
const isSyncEnabled = familyScoreSettings.leaderboard_enabled ?? true;
```

---

## Validation & Type Safety

### Zod Schema (Optional)

```typescript
import { z } from 'zod';

const ChoreGamiSettingsSchema = z.object({
  points_per_dollar: z.number().min(1).max(10000).default(1),
  children_pins_enabled: z.boolean().default(false),
  weekly_bonus_points: z.number().min(0).max(1000).default(5),
});

const FamilySettingsSchema = z.object({
  theme: z.string().default('fresh_meadow'),
  apps: z.object({
    choregami: ChoreGamiSettingsSchema.optional(),
  }).optional(),
  feature_flags: z.record(z.boolean()).optional(),
});

// Validate on read
const validatedSettings = FamilySettingsSchema.parse(rawSettings);
```

---

## Immediate Fix (Before Full Migration)

To unblock login NOW, update session.ts to not query the non-existent `theme` column:

```typescript
// Temporary fix - remove 'theme' from query
const { data: familyInfo } = await supabase
  .from("families")
  .select("id, name, points_per_dollar, children_pins_enabled")  // No 'theme'
  .eq("id", profileData.family_id)
  .single();

// Use default theme
theme: "fresh_meadow",  // Hardcoded until JSONB migration
```

---

## Implementation Checklist

- [x] **Phase 1**: Apply immediate fix (remove `theme` from query)
- [x] **Phase 2**: Run migration to add `settings` JSONB column
- [x] **Phase 3**: Run migration to add `preferences` JSONB column
- [x] **Phase 4**: Update session.ts to read from JSONB
- [x] **Phase 5**: Migrate existing column values into JSONB
- [ ] **Phase 6**: Update settings UI to write to JSONB
- [ ] **Phase 7**: Update other apps to use shared settings
- [ ] **Phase 8**: (Optional) Deprecate old columns

---

## References

- PostgreSQL JSONB Documentation: https://www.postgresql.org/docs/current/datatype-json.html
- JSONB Operators: https://www.postgresql.org/docs/current/functions-json.html
- Supabase JSONB: https://supabase.com/docs/guides/database/json

### Related Files

| Repo | File | Purpose |
|------|------|---------|
| chores2026 | `sql/20260114_jsonb_settings.sql` | Migration script |
| chores2026 | `lib/auth/session.ts` | Session with settings |
| chores2026 | `routes/parent/settings.tsx` | Settings UI |
| fresh-auth | `utils/familyContext.ts` | Cache pattern reference |
| mealplanner | `lib/performance/cache-manager.ts` | Cache pattern reference |

### Planned Extensions

- [Template Gating & Gift Codes](./planned/20260118_template_gating_gift_codes.md) - Uses JSONB `settings.apps.choregami.plan` for Family Plan storage
- [Gift Codes Table](../sql/20260118_gift_codes.sql) - Companion table for gift code redemption tracking
