-- Gift Codes Table and Generation
-- Format: GIFT-XXXX-XXXX-XXXX (like credit card numbers)
-- Codes are unique and cannot be regenerated (UUID-like uniqueness)

-- Table structure
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code TEXT PRIMARY KEY,              -- GIFT-XXXX-XXXX-XXXX format
  plan_type TEXT NOT NULL,            -- 'school_year' | 'summer' | 'full_year'
  purchased_by UUID NOT NULL,         -- user_id of purchaser/admin
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT,                       -- Optional gift message
  redeemed_by UUID,                   -- family_id (null until used)
  redeemed_at TIMESTAMPTZ,            -- When redeemed
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('school_year', 'summer', 'full_year'))
);

-- Index for faster redemption lookups
CREATE INDEX IF NOT EXISTS idx_gift_codes_unredeemed
  ON public.gift_codes (code)
  WHERE redeemed_by IS NULL;

-- Function to generate unique gift code (GIFT-XXXX-XXXX-XXXX format)
-- Uses characters that won't be confused: no O/0/I/1/L
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := 'GIFT-';
  i INTEGER;
  segment INTEGER;
BEGIN
  FOR segment IN 1..3 LOOP
    IF segment > 1 THEN
      result := result || '-';
    END IF;
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a gift code with retry on collision (extremely rare)
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

-- ============================================================
-- MANUAL CODE GENERATION (Phase 1)
-- Run these in Supabase SQL Editor to create gift codes
-- ============================================================

-- Create a single School Year gift code
-- SELECT create_gift_code('school_year', 'YOUR-ADMIN-USER-UUID', 'Welcome to ChoreGami!');

-- Create a Summer gift code
-- SELECT create_gift_code('summer', 'YOUR-ADMIN-USER-UUID', 'Enjoy your summer!');

-- Create a Full Year gift code
-- SELECT create_gift_code('full_year', 'YOUR-ADMIN-USER-UUID', 'Thanks for being a beta tester!');

-- Create multiple codes at once (batch)
-- SELECT create_gift_code('school_year', 'YOUR-ADMIN-USER-UUID', 'Beta tester reward')
-- FROM generate_series(1, 5);

-- View all unused gift codes
-- SELECT code, plan_type, message, purchased_at
-- FROM gift_codes
-- WHERE redeemed_by IS NULL
-- ORDER BY purchased_at DESC;

-- View redemption history
-- SELECT code, plan_type, redeemed_by, redeemed_at
-- FROM gift_codes
-- WHERE redeemed_by IS NOT NULL
-- ORDER BY redeemed_at DESC;

/*
The YOUR-ADMIN-USER-UUID should be your user ID from Supabase. You can get it from:

  Option 1: From auth.users table (your login user)
  SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

  Option 2: From family_profiles table (parent profile with user_id)
  SELECT fp.user_id, fp.name, u.email
  FROM family_profiles fp
  JOIN auth.users u ON u.id = fp.user_id
  WHERE fp.role = 'parent' AND fp.user_id IS NOT NULL;

  Option 3: Check your current session in Supabase Dashboard
  Go to Authentication → Users in the Supabase dashboard to see your user UUID.

  Once you have it, you can generate gift codes like:
  SELECT create_gift_code('school_year', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Welcome gift!');
*/