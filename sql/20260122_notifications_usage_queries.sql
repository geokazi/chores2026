-- =============================================================
-- Notifications Usage Tracking - Runtime Queries & Validation
-- File: sql/20260122_notifications_usage_queries.sql
-- Date: January 22, 2026
--
-- NOTE: No ALTER TABLE needed. Uses existing:
--   - family_profiles.preferences JSONB column (added 20260114)
--   - idx_family_profiles_preferences_gin index (added 20260114)
--
-- These are runtime queries used by the application code,
-- not schema migrations. Saved here for reference and testing.
-- =============================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. VALIDATION: Confirm infrastructure exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verify preferences column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'family_profiles'
  AND column_name = 'preferences';

-- Verify GIN index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'family_profiles'
  AND indexname = 'idx_family_profiles_preferences_gin';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. GLOBAL BUDGET CAP: Total digests sent this month
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Used by sendWeeklyDigests() to check global cap before sending
SELECT COALESCE(SUM(
  (preferences->'notifications'->'usage'->>'this_month_digests')::int
), 0) AS total_digests_this_month
FROM public.family_profiles
WHERE role = 'parent'
  AND preferences->'notifications'->>'weekly_summary' = 'true';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. UPGRADE CANDIDATES: Parents who hit SMS limit
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  fp.id,
  fp.name,
  fp.preferences->'notifications'->>'digest_channel' AS channel,
  (fp.preferences->'notifications'->'usage'->>'this_month_digests')::int AS this_month,
  (fp.preferences->'notifications'->'usage'->>'total_digests_sent')::int AS all_time,
  fp.preferences->'notifications'->>'sms_limit_hit' AS limit_hit
FROM public.family_profiles fp
WHERE fp.role = 'parent'
  AND fp.preferences->'notifications'->>'sms_limit_hit' = 'true';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. ENGAGEMENT ANALYTICS: Usage across all parents
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  COUNT(*) FILTER (WHERE preferences->'notifications'->>'weekly_summary' = 'true') AS opted_in,
  COUNT(*) FILTER (WHERE preferences->'notifications'->>'digest_channel' = 'sms') AS sms_users,
  COUNT(*) FILTER (WHERE preferences->'notifications'->>'digest_channel' = 'email') AS email_users,
  COALESCE(SUM((preferences->'notifications'->'usage'->>'total_digests_sent')::int), 0) AS lifetime_digests,
  COALESCE(SUM((preferences->'notifications'->'usage'->>'total_ics_sent')::int), 0) AS lifetime_ics,
  COALESCE(SUM((preferences->'notifications'->'usage'->>'total_badges_sent')::int), 0) AS lifetime_badges,
  COALESCE(AVG((preferences->'notifications'->'usage'->>'this_month_digests')::int), 0)::numeric(4,1) AS avg_monthly_digests
FROM public.family_profiles
WHERE role = 'parent';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. CRON HELPER: Parents eligible for digest this cycle
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Used by sendWeeklyDigests() to get opted-in parents
-- who haven't been sent this cycle (idempotency check)
-- $1 = last Sunday 6pm ISO timestamp
SELECT
  fp.id,
  fp.name,
  fp.user_id,
  fp.preferences->'notifications'->>'digest_channel' AS channel,
  fp.preferences->'notifications'->>'last_sent_at' AS last_sent_at,
  (fp.preferences->'notifications'->'usage'->>'this_month_digests')::int AS this_month_digests
FROM public.family_profiles fp
WHERE fp.role = 'parent'
  AND fp.user_id IS NOT NULL
  AND fp.preferences->'notifications'->>'weekly_summary' = 'true'
  AND (
    fp.preferences->'notifications'->>'last_sent_at' IS NULL
    OR fp.preferences->'notifications'->>'last_sent_at' < $1
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. ATOMIC INCREMENT: Update usage counters in one call
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Increment digest counters + record last_sent_at for a specific profile
-- (App code does this via Supabase client, shown here for reference)
-- $1 = profile_id
UPDATE public.family_profiles
SET preferences = jsonb_set(
  jsonb_set(
    jsonb_set(
      preferences,
      '{notifications,usage,total_digests_sent}',
      to_jsonb(COALESCE((preferences->'notifications'->'usage'->>'total_digests_sent')::int, 0) + 1)
    ),
    '{notifications,usage,this_month_digests}',
    to_jsonb(COALESCE((preferences->'notifications'->'usage'->>'this_month_digests')::int, 0) + 1)
  ),
  '{notifications,last_sent_at}',
  to_jsonb(NOW()::text)
)
WHERE id = $1;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. MONTHLY RESET: Clear this_month_* counters
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- App code handles this in incrementUsage() when cycle_start month differs.
-- This query can be used for manual reset or verification.
UPDATE public.family_profiles
SET preferences = jsonb_set(
  jsonb_set(
    jsonb_set(
      preferences,
      '{notifications,usage,this_month_digests}',
      '0'::jsonb
    ),
    '{notifications,usage,this_month_ics}',
    '0'::jsonb
  ),
  '{notifications,usage,cycle_start}',
  to_jsonb(NOW()::text)
)
WHERE role = 'parent'
  AND preferences->'notifications'->'usage'->>'cycle_start' IS NOT NULL
  AND DATE_TRUNC('month', (preferences->'notifications'->'usage'->>'cycle_start')::timestamp)
    < DATE_TRUNC('month', NOW());
