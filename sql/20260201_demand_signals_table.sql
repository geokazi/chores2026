-- Demand Signals Table
-- Date: February 1, 2026
-- Purpose: Track anonymous demand signals for unreleased features (Roommates, Just Me)
-- Design: Reuses family_activity pattern - minimal schema with JSONB payload
-- Schema: public (no family_id FK - anonymous tracking, no auth required)

-- 1. Create the demand_signals table
CREATE TABLE IF NOT EXISTS public.demand_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  data jsonb NOT NULL
);

-- 2. Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_demand_signals_created
ON public.demand_signals(created_at DESC);

-- 3. Optional: GIN index for JSONB feature queries (uncomment if needed for analytics)
-- CREATE INDEX IF NOT EXISTS idx_demand_signals_feature
-- ON public.demand_signals USING GIN ((data->'feature'));

-- 4. Grant permissions (public endpoint, no auth required)
GRANT INSERT ON public.demand_signals TO anon;
GRANT SELECT, INSERT, DELETE ON public.demand_signals TO service_role;

-- 5. Add comment for documentation
COMMENT ON TABLE public.demand_signals IS
'Anonymous demand signals for unreleased features. JSONB data column contains: v (schema version), feature, email?, session_id?, user_agent?. Reuses family_activity pattern.';

-- JSONB Data Schema (v1):
-- {
--   "v": 1,                     -- Schema version for future migrations
--   "feature": "roommates",     -- 'roommates' | 'just_me'
--   "email": "user@example.com", -- Optional early access signup
--   "session_id": "uuid",       -- Anonymous session tracking
--   "user_agent": "Mozilla/..." -- Browser context
-- }

-- Verify table was created
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'demand_signals'
ORDER BY ordinal_position;
