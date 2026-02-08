-- Shopify Order Idempotency Table
-- Tracks processed orders to prevent duplicate gift code generation on webhook retries
-- Created: February 7, 2026

CREATE TABLE IF NOT EXISTS shopify_orders (
  shopify_order_id BIGINT PRIMARY KEY,  -- Shopify order ID (idempotency key)
  customer_email TEXT NOT NULL,
  gift_code TEXT NOT NULL,
  plan_type TEXT NOT NULL,              -- summer, school_year, full_year
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries by email
CREATE INDEX IF NOT EXISTS idx_shopify_orders_email ON shopify_orders(customer_email);

-- Index for looking up orders by gift code
CREATE INDEX IF NOT EXISTS idx_shopify_orders_code ON shopify_orders(gift_code);

-- Index for time-based analytics
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created ON shopify_orders(created_at);

COMMENT ON TABLE shopify_orders IS 'Tracks Shopify orders to prevent duplicate gift code generation on webhook retries';
COMMENT ON COLUMN shopify_orders.shopify_order_id IS 'Shopify order ID - primary key for O(1) duplicate detection';
