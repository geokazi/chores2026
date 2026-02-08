-- Shopify SKU Mappings - Configurable product-to-plan mapping
-- Allows admins to add new SKUs without code deployment
-- Created: February 7, 2026
-- Updated: Competitive pricing strategy based on market research

-- =============================================================================
-- Table: shopify_sku_mappings
-- =============================================================================
-- Stores the mapping between Shopify SKUs and ChoreGami plan types
-- Cached in memory by webhook handler, refreshed on admin updates

CREATE TABLE IF NOT EXISTS shopify_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,                    -- Shopify SKU (e.g., CG-3M-PASS)
  plan_type TEXT NOT NULL,                     -- ChoreGami plan type (trial, summer, school_year, full_year)
  duration_months INTEGER NOT NULL,            -- Duration in months (1, 3, 6, 12)
  product_name TEXT NOT NULL,                  -- Display name for admin UI
  price_cents INTEGER,                         -- Price in cents (for reference, not enforced)
  description TEXT,                            -- Optional description/notes
  is_active BOOLEAN DEFAULT true,              -- Soft disable without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active SKU lookups (webhook handler)
CREATE INDEX IF NOT EXISTS idx_sku_mappings_active ON shopify_sku_mappings(sku) WHERE is_active = true;

-- Index for admin listing
CREATE INDEX IF NOT EXISTS idx_sku_mappings_created ON shopify_sku_mappings(created_at DESC);

-- =============================================================================
-- Seed data: Competitive pricing strategy (Feb 2026)
-- Based on market research: Homey $4.99, Chap $5.99, Chorly $9
-- Goal: Remove price objection, maximize acquisition, validate product
-- =============================================================================

INSERT INTO shopify_sku_mappings (sku, plan_type, duration_months, product_name, price_cents, description) VALUES
  -- $4.99 Monthly Trial - "Less than a latte" impulse purchase
  ('CG-1M-TRIAL', 'trial', 1, 'ChoreGami Monthly Trial', 499,
   'Low-barrier entry point. Matches competitor monthly pricing ($4.99-$5.99). Goal: remove price objection.'),

  -- $14.99 Summer Pass (3 months) - Effective $5/mo
  ('CG-3M-PASS', 'summer', 3, 'ChoreGami Summer Pass (3 Months)', 1499,
   'Summer season pass. Effective $5/mo. Tagline: "Conquer summer chaos"'),

  -- $24.99 School Year Pass (6 months) - Effective $4.17/mo - MOST POPULAR
  ('CG-6M-PASS', 'school_year', 6, 'ChoreGami School Year Pass (6 Months)', 2499,
   'MOST POPULAR tier. Effective $4.17/mo. Matches Chap/Chorly annual pricing. Badge: "SAVE 17%"'),

  -- $39.99 Full Year Pass (12 months) - Effective $3.33/mo - BEST VALUE
  ('CG-12M-PASS', 'full_year', 12, 'ChoreGami Full Year Pass (12 Months)', 3999,
   'Best value tier. Effective $3.33/mo. Tagline: "A full year of family harmony". Badge: "SAVE 33%"')

ON CONFLICT (sku) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  duration_months = EXCLUDED.duration_months,
  product_name = EXCLUDED.product_name,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =============================================================================
-- Function: Update timestamp trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_sku_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_sku_mapping_updated ON shopify_sku_mappings;
CREATE TRIGGER trigger_sku_mapping_updated
  BEFORE UPDATE ON shopify_sku_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_mapping_timestamp();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE shopify_sku_mappings IS 'Maps Shopify product SKUs to ChoreGami plan types. Admin-configurable without code deployment.';
COMMENT ON COLUMN shopify_sku_mappings.sku IS 'Shopify SKU - must match exactly what is configured in Shopify product variants';
COMMENT ON COLUMN shopify_sku_mappings.plan_type IS 'ChoreGami plan type: trial (1mo), summer (3mo), school_year (6mo), full_year (12mo)';
COMMENT ON COLUMN shopify_sku_mappings.duration_months IS 'How many months of access this SKU grants';
COMMENT ON COLUMN shopify_sku_mappings.is_active IS 'Set to false to disable SKU without deleting (e.g., seasonal products)';

-- =============================================================================
-- Pricing Strategy Reference (for admins)
-- =============================================================================
--
-- COMPETITIVE LANDSCAPE (Feb 2026):
-- - Homey: $4.99/mo, $49.99/year ($4.17/mo effective)
-- - Chap: $5.99/mo, $39.99/year ($3.33/mo effective)
-- - Chorly: $9/mo, $49/year ($4.08/mo effective)
-- - Hire & Fire: $4.99/mo
--
-- OUR STRATEGY:
-- 1. Match market at $4.99 to remove price objection
-- 2. Value ladder with clear savings at each tier
-- 3. Goal: 100+ active families to validate product
-- 4. After validation: raise to $9.99+ monthly tier
--
-- FUTURE SKU IDEAS (add via admin UI):
-- - CG-RESET: "30-Day Family Reset Challenge" ($4.99) with PDF guide
-- - CG-BUNDLE: "Complete Family Launch Kit" with printables
-- - CG-GIFT-25: $25 gift card denomination
-- - CG-GIFT-50: $50 gift card denomination

-- =============================================================================
-- Useful queries for monitoring
-- =============================================================================

-- List all active SKU mappings with effective monthly rate:
-- SELECT sku, plan_type, duration_months, product_name,
--        price_cents/100.0 as price_dollars,
--        ROUND((price_cents/100.0) / duration_months, 2) as effective_monthly
-- FROM shopify_sku_mappings WHERE is_active = true ORDER BY duration_months;

-- Compare to competitors:
-- SELECT sku, ROUND((price_cents/100.0) / duration_months, 2) as our_monthly,
--        4.99 as homey_monthly, 5.99 as chap_monthly, 9.00 as chorly_monthly
-- FROM shopify_sku_mappings WHERE is_active = true ORDER BY duration_months;
