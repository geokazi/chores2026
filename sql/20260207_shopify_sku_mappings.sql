-- Shopify SKU Mappings - Configurable product-to-plan mapping
-- Allows admins to add new SKUs without code deployment
-- Created: February 7, 2026

-- =============================================================================
-- Table: shopify_sku_mappings
-- =============================================================================
-- Stores the mapping between Shopify SKUs and ChoreGami plan types
-- Cached in memory by webhook handler, refreshed on admin updates

CREATE TABLE IF NOT EXISTS shopify_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,                    -- Shopify SKU (e.g., CG-3M-PASS)
  plan_type TEXT NOT NULL,                     -- ChoreGami plan type (summer, school_year, full_year)
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
-- Seed data: Current Shopify products
-- =============================================================================

INSERT INTO shopify_sku_mappings (sku, plan_type, duration_months, product_name, price_cents, description) VALUES
  ('CG-3M-PASS', 'summer', 3, 'ChoreGami Summer Pass (3 Months)', 2999, 'Summer season pass - great for school breaks'),
  ('CG-6M-PASS', 'school_year', 6, 'ChoreGami Family Pass (6 Months)', 4999, 'Half-year family plan'),
  ('CG-12M-PASS', 'full_year', 12, 'ChoreGami Full Year Pass (12 Months)', 7999, 'Best value - full year of family organization')
ON CONFLICT (sku) DO NOTHING;

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
COMMENT ON COLUMN shopify_sku_mappings.plan_type IS 'ChoreGami plan type: summer (3mo), school_year (6mo), full_year (12mo), or custom';
COMMENT ON COLUMN shopify_sku_mappings.duration_months IS 'How many months of access this SKU grants';
COMMENT ON COLUMN shopify_sku_mappings.is_active IS 'Set to false to disable SKU without deleting (e.g., seasonal products)';

-- =============================================================================
-- Useful queries for monitoring
-- =============================================================================

-- List all active SKU mappings:
-- SELECT sku, plan_type, duration_months, product_name, price_cents/100.0 as price
-- FROM shopify_sku_mappings WHERE is_active = true ORDER BY duration_months;

-- Check if a SKU exists:
-- SELECT * FROM shopify_sku_mappings WHERE sku = 'CG-3M-PASS' AND is_active = true;
