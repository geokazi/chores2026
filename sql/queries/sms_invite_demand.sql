-- SMS Invite Demand Tracking
-- Query users who attempted to use SMS invites (blocked pending A2P 10DLC)
-- Use this to follow up when SMS is enabled or to gauge registration priority
--
-- Related docs:
--   - docs/milestones/20260127_family_member_invites.md
--   - docs/planned/20260123_sms_10dlc_compliance.md

-- All attempts with user contact info (for follow-up)
SELECT
  fa.data->>'actor_name' as name,
  au.email,
  au.phone,
  f.name as family_name,
  fa.created_at as attempted_at
FROM choretracker.family_activity fa
JOIN public.family_profiles fp ON fp.id = (fa.data->>'actor_id')::uuid
JOIN auth.users au ON au.id = fp.user_id
JOIN public.families f ON f.id = fa.family_id
WHERE fa.data->'meta'->>'demand_feature' = 'sms_invite'
ORDER BY fa.created_at DESC;

-- Unique users who requested SMS (deduplicated)
SELECT DISTINCT ON (au.email)
  fa.data->>'actor_name' as name,
  au.email,
  au.phone,
  MAX(fa.created_at) as last_attempt
FROM choretracker.family_activity fa
JOIN public.family_profiles fp ON fp.id = (fa.data->>'actor_id')::uuid
JOIN auth.users au ON au.id = fp.user_id
WHERE fa.data->'meta'->>'demand_feature' = 'sms_invite'
GROUP BY au.email, au.phone, fa.data->>'actor_name'
ORDER BY au.email, last_attempt DESC;

-- Summary stats
SELECT
  COUNT(*) as total_attempts,
  COUNT(DISTINCT fa.family_id) as unique_families,
  COUNT(DISTINCT fp.user_id) as unique_users
FROM choretracker.family_activity fa
JOIN public.family_profiles fp ON fp.id = (fa.data->>'actor_id')::uuid
WHERE fa.data->'meta'->>'demand_feature' = 'sms_invite';
