-- Fix gift_codes table for Shopify integration
-- Makes purchased_by nullable and adds new plan types
-- Run this in Supabase SQL Editor
-- Created: February 8, 2026

-- 1. Make purchased_by nullable (Shopify purchases don't have a user ID)
ALTER TABLE public.gift_codes
  ALTER COLUMN purchased_by DROP NOT NULL;

-- 2. Drop the old plan_type constraint and add new one with all plan types
ALTER TABLE public.gift_codes
  DROP CONSTRAINT IF EXISTS valid_plan_type;

ALTER TABLE public.gift_codes
  ADD CONSTRAINT valid_plan_type
  CHECK (plan_type IN ('trial', 'month_pass', 'summer', 'school_year', 'full_year'));

-- 3. Add source column to track where the code came from (optional, for analytics)
ALTER TABLE public.gift_codes
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

COMMENT ON COLUMN public.gift_codes.source IS 'Where the code was generated: manual, admin, shopify, stripe';

-- 4. Update the create_gift_code function to handle null purchased_by
CREATE OR REPLACE FUNCTION create_gift_code(
  p_plan_type TEXT,
  p_purchased_by UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := generate_gift_code();
    BEGIN
      INSERT INTO public.gift_codes (code, plan_type, purchased_by, message)
      VALUES (new_code, p_plan_type, p_purchased_by, p_message);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique code after 10 attempts';
      END IF;
      -- Loop and try again
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'gift_codes'
  AND column_name = 'purchased_by';
