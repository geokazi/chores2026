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
-- 3. Record Referral Conversion (Atomic with FOR UPDATE lock)
-- Called when a referred user signs up and creates their family
-- Enforces 6-month cap on referral rewards atomically
-- Returns: 'success', 'cap_reached', 'duplicate', or 'not_found'
-- ============================================================================

CREATE OR REPLACE FUNCTION record_referral_conversion(
  p_referrer_family_id uuid,
  p_new_family_id uuid,
  p_new_family_name text,
  p_new_user_id uuid,
  p_source text DEFAULT NULL,
  p_campaign text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  current_referral jsonb;
  current_months int;
  new_conversion jsonb;
  row_updated boolean;
BEGIN
  -- Lock the row to prevent race conditions (FOR UPDATE)
  SELECT settings->'apps'->'choregami'->'referral'
  INTO current_referral
  FROM families
  WHERE id = p_referrer_family_id
  FOR UPDATE;

  -- Family not found
  IF current_referral IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Check 6-month cap atomically (under lock)
  current_months := COALESCE((current_referral->>'reward_months_earned')::int, 0);
  IF current_months >= 6 THEN
    RETURN 'cap_reached';
  END IF;

  -- Check for duplicate conversion (same family already referred)
  IF current_referral->'conversions' @> jsonb_build_object('family_id', p_new_family_id) THEN
    RETURN 'duplicate';
  END IF;

  -- Build new conversion entry with optional attribution
  new_conversion := jsonb_build_object(
    'family_id', p_new_family_id,
    'family_name', p_new_family_name,
    'user_id', p_new_user_id,
    'converted_at', NOW(),
    'attribution', jsonb_build_object(
      'source', COALESCE(p_source, 'direct'),
      'campaign', p_campaign
    )
  );

  -- Atomic update with cap check in WHERE clause (double protection)
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        settings,
        '{apps,choregami,referral,conversions}',
        COALESCE(current_referral->'conversions', '[]'::jsonb) || new_conversion
      ),
      '{apps,choregami,referral,reward_months_earned}',
      to_jsonb(current_months + 1)
    ),
    '{apps,choregami,referral,last_conversion_at}',
    to_jsonb(NOW())
  )
  WHERE id = p_referrer_family_id
    AND COALESCE((settings->'apps'->'choregami'->'referral'->>'reward_months_earned')::int, 0) < 6;

  -- Check if update succeeded (FOUND is set by UPDATE)
  IF NOT FOUND THEN
    RETURN 'cap_reached';  -- Race condition caught by WHERE clause
  END IF;

  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Refresh Referral Code
-- Generates a new code while preserving conversion history
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_referral_code(p_family_id uuid, p_new_code text)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      settings,
      '{apps,choregami,referral,code}',
      to_jsonb(p_new_code)
    ),
    '{apps,choregami,referral,code_refreshed_at}',
    to_jsonb(NOW())
  )
  WHERE id = p_family_id
    AND settings->'apps'->'choregami'->'referral' IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
