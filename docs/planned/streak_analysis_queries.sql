-- ============================================================================
-- STREAK SYSTEM - DATA ANALYSIS QUERIES
-- Run these in Supabase SQL Editor to understand current activity patterns
-- ============================================================================

-- SUMMARY QUERY: Quick Overview
-- Run this first to get a high-level view
-- ============================================================================
SELECT 
  COUNT(DISTINCT fp.id) as total_kids,
  COUNT(DISTINCT DATE(ct.created_at)) as total_active_days_across_all,
  COUNT(*) as total_chore_completions,
  SUM(ct.points_change) as total_points_earned,
  MIN(DATE(ct.created_at)) as system_first_activity,
  MAX(DATE(ct.created_at)) as system_last_activity,
  CURRENT_DATE - MAX(DATE(ct.created_at)) as days_since_last_activity
FROM public.family_profiles fp
LEFT JOIN choretracker.chore_transactions ct 
  ON fp.id = ct.profile_id 
  AND ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
WHERE fp.role = 'child';


-- Query 1: Daily Activity Overview
-- Shows how many days each family member has completed chores
-- ============================================================================
SELECT 
  fp.name,
  fp.id as profile_id,
  COUNT(DISTINCT DATE(ct.created_at)) as total_active_days,
  MIN(DATE(ct.created_at)) as first_activity,
  MAX(DATE(ct.created_at)) as last_activity,
  COUNT(*) as total_completions
FROM public.family_profiles fp
LEFT JOIN choretracker.chore_transactions ct 
  ON fp.id = ct.profile_id 
  AND ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
WHERE fp.role = 'child'
GROUP BY fp.name, fp.id
ORDER BY total_active_days DESC;


-- Query 2: Recent Activity Pattern (Last 30 Days)
-- Shows daily completion counts to identify consistency
-- ============================================================================
SELECT 
  fp.name,
  DATE(ct.created_at) as activity_date,
  COUNT(*) as chores_completed,
  SUM(ct.points_change) as points_earned
FROM public.family_profiles fp
JOIN choretracker.chore_transactions ct 
  ON fp.id = ct.profile_id
WHERE ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
  AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND fp.role = 'child'
GROUP BY fp.name, DATE(ct.created_at)
ORDER BY fp.name, activity_date DESC;


-- Query 3: Current Streak Calculation (Per User)
-- Calculates actual current streak for each family member
-- ============================================================================
WITH daily_activity AS (
  SELECT 
    fp.id as profile_id,
    fp.name,
    DATE(ct.created_at) as activity_date
  FROM public.family_profiles fp
  JOIN choretracker.chore_transactions ct 
    ON fp.id = ct.profile_id
  WHERE ct.transaction_type = 'chore_completed'
    AND ct.points_change > 0
    AND fp.role = 'child'
  GROUP BY fp.id, fp.name, DATE(ct.created_at)
),
ranked_dates AS (
  SELECT 
    profile_id,
    name,
    activity_date,
    activity_date - (ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY activity_date DESC))::int AS streak_group
  FROM daily_activity
),
current_streaks AS (
  SELECT 
    profile_id,
    name,
    COUNT(*) as streak_length,
    MIN(activity_date) as streak_start,
    MAX(activity_date) as streak_end
  FROM ranked_dates
  WHERE streak_group = (
    SELECT streak_group 
    FROM ranked_dates rd2 
    WHERE rd2.profile_id = ranked_dates.profile_id
      AND (rd2.activity_date = CURRENT_DATE OR rd2.activity_date = CURRENT_DATE - 1)
    LIMIT 1
  )
  GROUP BY profile_id, name
)
SELECT 
  name,
  profile_id,
  streak_length as current_streak,
  streak_start,
  streak_end,
  CASE 
    WHEN streak_end = CURRENT_DATE THEN '✅ Active today'
    WHEN streak_end = CURRENT_DATE - 1 THEN '⚠️ Last active yesterday'
    ELSE '❌ Streak broken'
  END as status
FROM current_streaks
ORDER BY streak_length DESC;


-- Query 4: Best Streak Ever (Historical Maximum)
-- Finds the longest streak each user has achieved
-- ============================================================================
WITH daily_activity AS (
  SELECT 
    fp.id as profile_id,
    fp.name,
    DATE(ct.created_at) as activity_date
  FROM public.family_profiles fp
  JOIN choretracker.chore_transactions ct 
    ON fp.id = ct.profile_id
  WHERE ct.transaction_type = 'chore_completed'
    AND ct.points_change > 0
    AND fp.role = 'child'
  GROUP BY fp.id, fp.name, DATE(ct.created_at)
),
all_streaks AS (
  SELECT 
    profile_id,
    name,
    activity_date,
    activity_date - (ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY activity_date))::int AS streak_group
  FROM daily_activity
),
streak_lengths AS (
  SELECT 
    profile_id,
    name,
    streak_group,
    COUNT(*) as streak_length,
    MIN(activity_date) as streak_start,
    MAX(activity_date) as streak_end
  FROM all_streaks
  GROUP BY profile_id, name, streak_group
)
SELECT 
  name,
  profile_id,
  MAX(streak_length) as best_streak,
  (SELECT streak_start FROM streak_lengths sl2 
   WHERE sl2.profile_id = streak_lengths.profile_id 
   AND sl2.streak_length = MAX(streak_lengths.streak_length) 
   LIMIT 1) as best_streak_start,
  (SELECT streak_end FROM streak_lengths sl2 
   WHERE sl2.profile_id = streak_lengths.profile_id 
   AND sl2.streak_length = MAX(streak_lengths.streak_length) 
   LIMIT 1) as best_streak_end
FROM streak_lengths
GROUP BY name, profile_id
ORDER BY best_streak DESC;


-- Query 5: Streak Value Analysis
-- Shows if users with longer streaks earn more points
-- ============================================================================
WITH user_stats AS (
  SELECT 
    fp.id as profile_id,
    fp.name,
    COUNT(DISTINCT DATE(ct.created_at)) as active_days,
    COUNT(*) as total_chores,
    SUM(ct.points_change) as total_points,
    ROUND(SUM(ct.points_change)::numeric / COUNT(DISTINCT DATE(ct.created_at)), 1) as avg_points_per_day
  FROM public.family_profiles fp
  JOIN choretracker.chore_transactions ct 
    ON fp.id = ct.profile_id
  WHERE ct.transaction_type = 'chore_completed'
    AND ct.points_change > 0
    AND fp.role = 'child'
  GROUP BY fp.id, fp.name
)
SELECT 
  name,
  active_days,
  total_chores,
  total_points,
  avg_points_per_day,
  CASE 
    WHEN active_days >= 20 THEN '🔥 High consistency'
    WHEN active_days >= 10 THEN '⚡ Medium consistency'
    ELSE '🌱 Building habits'
  END as consistency_level
FROM user_stats
ORDER BY active_days DESC;


-- Query 6: Gap Analysis (Days Without Activity)
-- Identifies patterns of inactivity to understand streak breaks
-- ============================================================================
WITH daily_activity AS (
  SELECT 
    fp.id as profile_id,
    fp.name,
    DATE(ct.created_at) as activity_date
  FROM public.family_profiles fp
  JOIN choretracker.chore_transactions ct 
    ON fp.id = ct.profile_id
  WHERE ct.transaction_type = 'chore_completed'
    AND ct.points_change > 0
    AND fp.role = 'child'
  GROUP BY fp.id, fp.name, DATE(ct.created_at)
),
gaps AS (
  SELECT 
    profile_id,
    name,
    activity_date,
    LAG(activity_date) OVER (PARTITION BY profile_id ORDER BY activity_date) as prev_date,
    activity_date - LAG(activity_date) OVER (PARTITION BY profile_id ORDER BY activity_date) as gap_days
  FROM daily_activity
)
SELECT 
  name,
  COUNT(*) as total_gaps,
  ROUND(AVG(gap_days), 1) as avg_gap_days,
  MAX(gap_days) as longest_gap,
  COUNT(CASE WHEN gap_days = 1 THEN 1 END) as consecutive_days,
  COUNT(CASE WHEN gap_days > 1 THEN 1 END) as streak_breaks
FROM gaps
WHERE gap_days IS NOT NULL
GROUP BY name
ORDER BY consecutive_days DESC;


-- Query 7: Weekly Pattern Analysis (All Families)
-- Shows which days of week are most active
-- ============================================================================
SELECT 
  fp.name,
  TO_CHAR(ct.created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM ct.created_at) as day_num,
  COUNT(*) as completions
FROM public.family_profiles fp
JOIN choretracker.chore_transactions ct 
  ON fp.id = ct.profile_id
WHERE ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
  AND fp.role = 'child'
  AND ct.created_at >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY fp.name, TO_CHAR(ct.created_at, 'Day'), EXTRACT(DOW FROM ct.created_at)
ORDER BY fp.name, day_num;


-- Query 7b: Weekly Pattern Analysis (Single Family)
-- Shows which days of week are most active for a specific family
-- ============================================================================
SELECT 
  fp.name,
  TO_CHAR(ct.created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM ct.created_at) as day_num,
  COUNT(*) as completions,
  SUM(ct.points_change) as total_points
FROM public.family_profiles fp
JOIN choretracker.chore_transactions ct 
  ON fp.id = ct.profile_id
WHERE fp.family_id = '445717ba-0841-4b68-994f-eef77bcf4f87'
  AND ct.transaction_type = 'chore_completed'
  AND ct.points_change > 0
  AND fp.role = 'child'
  AND ct.created_at >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY fp.name, TO_CHAR(ct.created_at, 'Day'), EXTRACT(DOW FROM ct.created_at)
ORDER BY fp.name, day_num;


-- Query 8: Streak Potential (If Implemented Today)
-- Shows what streaks would look like with current data
-- ============================================================================
WITH daily_activity AS (
  SELECT 
    fp.id as profile_id,
    fp.name,
    DATE(ct.created_at) as activity_date,
    COUNT(*) as chores_that_day
  FROM public.family_profiles fp
  JOIN choretracker.chore_transactions ct 
    ON fp.id = ct.profile_id
  WHERE ct.transaction_type = 'chore_completed'
    AND ct.points_change > 0
    AND fp.role = 'child'
  GROUP BY fp.id, fp.name, DATE(ct.created_at)
)
SELECT 
  name,
  COUNT(*) as days_with_activity,
  MIN(activity_date) as first_day,
  MAX(activity_date) as most_recent_day,
  CURRENT_DATE - MAX(activity_date) as days_since_last_activity,
  CASE 
    WHEN MAX(activity_date) = CURRENT_DATE THEN '✅ Would have streak today'
    WHEN MAX(activity_date) = CURRENT_DATE - 1 THEN '⚡ Can continue streak today'
    WHEN MAX(activity_date) < CURRENT_DATE - 1 THEN '❌ Would need to restart'
  END as streak_status
FROM daily_activity
GROUP BY name
ORDER BY most_recent_day DESC;
