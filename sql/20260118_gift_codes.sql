-- ONLY table needed
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  purchased_by UUID NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT,
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ
);
