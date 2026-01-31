-- Referral "Share ChoreGami" Feature
-- Created: January 31, 2026
-- See: docs/planned/20260130_referral_share_feature.md

-- ============================================================================
-- GIN Index for O(1) referral code lookup
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_families_settings_gin
ON families USING GIN (settings);

-- ============================================================================
-- 1. Initialize Referral for Family (idempotent)
-- Uses COALESCE pattern from invite functions for safe JSONB path creation
-- ============================================================================

CREATE OR REPLACE FUNCTION init_family_referral(p_family_id uuid, p_code text)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'),
        '{apps}',
        COALESCE(settings->'apps', '{}')
      ),
      '{apps,choregami}',
      COALESCE(settings->'apps'->'choregami', '{}')
    ),
    '{apps,choregami,referral}',
    jsonb_build_object(
      'code', p_code,
      'created_at', NOW(),
      'conversions', '[]'::jsonb,
      'reward_months_earned', 0,
      'reward_months_redeemed', 0,
      'last_conversion_at', NULL
    )
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Find Family by Referral Code (O(1) via GIN containment query)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_family_by_referral_code(p_code text)
RETURNS TABLE(family_id uuid, family_name text, referral jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.settings->'apps'->'choregami'->'referral'
  FROM families f
  WHERE f.settings @> jsonb_build_object(
    'apps', jsonb_build_object(
      'choregami', jsonb_build_object(
        'referral', jsonb_build_object('code', p_code)
      )
    )
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. Record Referral Conversion
-- Called when a referred user signs up and creates their family
-- ============================================================================

CREATE OR REPLACE FUNCTION record_referral_conversion(
  p_referrer_family_id uuid,
  p_new_family_id uuid,
  p_new_family_name text,
  p_new_user_id uuid
)
RETURNS void AS $$
DECLARE
  current_referral jsonb;
  new_conversion jsonb;
BEGIN
  -- Get current referral data
  SELECT settings->'apps'->'choregami'->'referral'
  INTO current_referral
  FROM families
  WHERE id = p_referrer_family_id;

  -- Build new conversion entry
  new_conversion := jsonb_build_object(
    'family_id', p_new_family_id,
    'family_name', p_new_family_name,
    'user_id', p_new_user_id,
    'converted_at', NOW()
  );

  -- Update referral with new conversion
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        settings,
        '{apps,choregami,referral,conversions}',
        COALESCE(current_referral->'conversions', '[]'::jsonb) || new_conversion
      ),
      '{apps,choregami,referral,reward_months_earned}',
      to_jsonb(COALESCE((current_referral->>'reward_months_earned')::int, 0) + 1)
    ),
    '{apps,choregami,referral,last_conversion_at}',
    to_jsonb(NOW())
  )
  WHERE id = p_referrer_family_id;
END;
$$ LANGUAGE plpgsql;
