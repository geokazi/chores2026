-- Referral & Redeem Feature Analytics
-- Query demand signals for referral sharing and gift code redemption
-- See: docs/analytics/20260130_analytics_tracking.md

-- ============================================================================
-- 1. Overview: All referral and redeem events
-- ============================================================================

SELECT
  data->'meta'->>'demand_feature' as feature,
  COUNT(*) as total_events,
  COUNT(DISTINCT family_id) as unique_families
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' LIKE 'referral_%'
   OR data->'meta'->>'demand_feature' LIKE 'redeem_%'
GROUP BY data->'meta'->>'demand_feature'
ORDER BY total_events DESC;

-- ============================================================================
-- 2. Referral Funnel Analysis
-- ============================================================================

-- View → Copy → Share → Share Complete conversion funnel
SELECT
  feature,
  count,
  ROUND(100.0 * count / FIRST_VALUE(count) OVER (ORDER BY step), 1) as pct_of_views
FROM (
  SELECT
    data->'meta'->>'demand_feature' as feature,
    COUNT(*) as count,
    CASE data->'meta'->>'demand_feature'
      WHEN 'referral_card_view' THEN 1
      WHEN 'referral_copy' THEN 2
      WHEN 'referral_share' THEN 3
      WHEN 'referral_share_complete' THEN 4
    END as step
  FROM choretracker.family_activity
  WHERE data->'meta'->>'demand_feature' LIKE 'referral_%'
  GROUP BY data->'meta'->>'demand_feature'
) sub
ORDER BY step;

-- ============================================================================
-- 3. Redeem Funnel Analysis
-- ============================================================================

-- Click → Attempt → Success/Failure
SELECT
  data->'meta'->>'demand_feature' as feature,
  COUNT(*) as count
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' LIKE 'redeem_%'
GROUP BY data->'meta'->>'demand_feature'
ORDER BY
  CASE data->'meta'->>'demand_feature'
    WHEN 'redeem_click' THEN 1
    WHEN 'redeem_attempt' THEN 2
    WHEN 'redeem_success' THEN 3
    WHEN 'redeem_failure' THEN 4
  END;

-- ============================================================================
-- 4. Daily Trends
-- ============================================================================

SELECT
  DATE(created_at) as date,
  data->'meta'->>'demand_feature' as feature,
  COUNT(*) as count
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' LIKE 'referral_%'
   OR data->'meta'->>'demand_feature' LIKE 'redeem_%'
GROUP BY DATE(created_at), data->'meta'->>'demand_feature'
ORDER BY date DESC, feature;

-- ============================================================================
-- 5. Top Referral Sharers (families who share the most)
-- ============================================================================

SELECT
  fa.family_id,
  f.name as family_name,
  COUNT(*) as share_actions
FROM choretracker.family_activity fa
JOIN public.families f ON f.id = fa.family_id
WHERE fa.data->'meta'->>'demand_feature' IN ('referral_copy', 'referral_share', 'referral_share_complete')
GROUP BY fa.family_id, f.name
ORDER BY share_actions DESC
LIMIT 20;

-- ============================================================================
-- 6. Redeem Success Rate
-- ============================================================================

SELECT
  COUNT(*) FILTER (WHERE data->'meta'->>'demand_feature' = 'redeem_success') as successes,
  COUNT(*) FILTER (WHERE data->'meta'->>'demand_feature' = 'redeem_failure') as failures,
  COUNT(*) FILTER (WHERE data->'meta'->>'demand_feature' = 'redeem_attempt') as attempts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE data->'meta'->>'demand_feature' = 'redeem_success') /
    NULLIF(COUNT(*) FILTER (WHERE data->'meta'->>'demand_feature' = 'redeem_attempt'), 0),
    1
  ) as success_rate_pct
FROM choretracker.family_activity
WHERE data->'meta'->>'demand_feature' LIKE 'redeem_%';
