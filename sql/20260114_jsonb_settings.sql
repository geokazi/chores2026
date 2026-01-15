 -- =============================================
  -- JSONB Settings Migration - Phase 1
  -- Run this in Supabase SQL Editor
  -- =============================================

  BEGIN;

  -- 1. Add settings JSONB to families table
  ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

  -- 2. Add preferences JSONB to family_profiles table
  ALTER TABLE public.family_profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

  -- 3. Create GIN indexes for fast JSON queries
  CREATE INDEX IF NOT EXISTS idx_families_settings_gin
  ON public.families USING GIN (settings);

  CREATE INDEX IF NOT EXISTS idx_family_profiles_preferences_gin
  ON public.family_profiles USING GIN (preferences);

  -- 4. Migrate existing values into settings JSONB
  UPDATE public.families
  SET settings = jsonb_build_object(
    'theme', 'fresh_meadow',
    'apps', jsonb_build_object(
      'choregami', jsonb_build_object(
        'points_per_dollar', COALESCE(points_per_dollar, 1),
        'children_pins_enabled', COALESCE(children_pins_enabled, false),
        'weekly_bonus_points', COALESCE(weekly_bonus_points, 5)
      )
    ),
    '_version', 1,
    '_migrated_at', NOW()
  )
  WHERE settings = '{}' OR settings IS NULL;

  COMMIT;

  -- Verify migration
  SELECT id, name, settings FROM public.families LIMIT 5;