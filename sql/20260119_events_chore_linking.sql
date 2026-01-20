-- Events Calendar Integration: Chore Linking Migration
-- Date: January 19, 2026
-- Purpose: Link chores to family events for grouped "missions" display

-- 1. Add foreign key to link chores to events
-- (family_events table already exists from MealPlanner)
ALTER TABLE choretracker.chore_assignments
ADD COLUMN IF NOT EXISTS family_event_id UUID REFERENCES choretracker.family_events(id) ON DELETE SET NULL;

-- 2. Index for efficient event-based chore queries
CREATE INDEX IF NOT EXISTS idx_chore_assignments_family_event_id
ON choretracker.chore_assignments(family_event_id)
WHERE family_event_id IS NOT NULL;

-- 3. Optional: Explicit points mode setting on families
-- (Can also infer from usage - if ANY chore has points > 0, show points)
-- Uncomment if you want explicit control:
-- ALTER TABLE public.families
-- ADD COLUMN IF NOT EXISTS use_points BOOLEAN DEFAULT TRUE;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'choretracker'
  AND table_name = 'chore_assignments'
  AND column_name = 'family_event_id';
