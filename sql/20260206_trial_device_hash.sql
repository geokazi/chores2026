-- Trial Device Hash - Fraud prevention for trial abuse
-- Created: February 6, 2026
-- See: docs/planned/20260206_stripe_checkout_unified_payments.md

-- ============================================================================
-- Add trial_device_hash column for O(1) fraud check
-- ============================================================================

-- Add column if not exists
ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS trial_device_hash TEXT;

-- Create unique index for O(1) lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_trial_device_hash
ON public.families(trial_device_hash)
WHERE trial_device_hash IS NOT NULL;

-- ============================================================================
-- Function to check if device hash exists
-- ============================================================================

CREATE OR REPLACE FUNCTION check_device_hash_exists(p_device_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.families
    WHERE trial_device_hash = p_device_hash
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Function to initialize trial for family (with device hash check)
-- Returns: 'success', 'device_exists', or 'already_has_trial'
-- ============================================================================

CREATE OR REPLACE FUNCTION init_family_trial(
  p_family_id uuid,
  p_device_hash text,
  p_trial_days int DEFAULT 15
)
RETURNS text AS $$
DECLARE
  current_settings jsonb;
  existing_plan jsonb;
  trial_end_date text;
BEGIN
  -- Check if device hash already exists (fraud prevention)
  IF check_device_hash_exists(p_device_hash) THEN
    RETURN 'device_exists';
  END IF;

  -- Get current settings
  SELECT settings INTO current_settings
  FROM public.families
  WHERE id = p_family_id
  FOR UPDATE;

  IF current_settings IS NULL THEN
    current_settings := '{}'::jsonb;
  END IF;

  -- Check if family already has a plan
  existing_plan := current_settings->'apps'->'choregami'->'plan';
  IF existing_plan IS NOT NULL AND existing_plan->>'type' IS NOT NULL THEN
    RETURN 'already_has_trial';
  END IF;

  -- Calculate trial end date
  trial_end_date := (CURRENT_DATE + (p_trial_days || ' days')::interval)::date::text;

  -- Update family with trial settings and device hash
  UPDATE public.families
  SET
    trial_device_hash = p_device_hash,
    settings = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(settings, '{}'),
          '{apps}',
          COALESCE(settings->'apps', '{}')
        ),
        '{apps,choregami}',
        COALESCE(settings->'apps'->'choregami', '{}')
      ),
      '{apps,choregami}',
      jsonb_build_object(
        'plan', jsonb_build_object(
          'type', 'trial',
          'expires_at', trial_end_date,
          'activated_at', NOW(),
          'source', 'trial'
        ),
        'trial', jsonb_build_object(
          'started_at', NOW(),
          'device_hash', p_device_hash
        )
      ) || COALESCE(settings->'apps'->'choregami', '{}')
    )
  WHERE id = p_family_id;

  RETURN 'success';
END;
$$ LANGUAGE plpgsql;
