-- Family Activity Feed Table
-- Date: January 20, 2026
-- Purpose: Track all family activities (events, chores, prep tasks) for activity feed
-- Design: Minimal schema with JSONB payload for flexibility

-- 1. Create the family_activity table
CREATE TABLE IF NOT EXISTS choretracker.family_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  data jsonb NOT NULL
);

-- 2. Index for efficient family + time queries
CREATE INDEX IF NOT EXISTS idx_family_activity_lookup
ON choretracker.family_activity(family_id, created_at DESC);

-- 3. Optional: GIN index for JSONB queries (uncomment if needed)
-- CREATE INDEX IF NOT EXISTS idx_family_activity_data_type
-- ON choretracker.family_activity USING GIN ((data->'type'));

-- 4. Enable RLS (Row Level Security)
ALTER TABLE choretracker.family_activity ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Users can only see their family's activity
CREATE POLICY "Users can view own family activity"
ON choretracker.family_activity FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_profiles
    WHERE user_id = auth.uid()
  )
);

-- 6. RLS Policy: Service role can insert (used by API)
CREATE POLICY "Service role can insert activity"
ON choretracker.family_activity FOR INSERT
WITH CHECK (true);

-- 7. Grant permissions
GRANT SELECT, INSERT ON choretracker.family_activity TO authenticated;
GRANT SELECT, INSERT, DELETE ON choretracker.family_activity TO service_role;

-- 8. Add comment for documentation
COMMENT ON TABLE choretracker.family_activity IS
'Activity feed for families. JSONB data column contains: type, actor_id, actor_name, icon, title, target, points, meta. Schema version in data.v field.';

-- Verify table was created
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'choretracker'
  AND table_name = 'family_activity'
ORDER BY ordinal_position;
