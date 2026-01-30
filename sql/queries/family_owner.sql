-- Family Owner Queries
-- Owner is stored in families.settings.owner_user_id (JSONB)
-- Set during family creation; backfilled for existing families

--------------------------------------------------------------------------------
-- BACKFILL: Set owner_user_id for existing families (run once)
--------------------------------------------------------------------------------
-- Sets the oldest parent (by created_at) as owner for each family
-- Only updates families that have a parent with user_id set

UPDATE families f
SET settings = jsonb_set(
  COALESCE(settings, '{}'),
  '{owner_user_id}',
  to_jsonb(sub.user_id::text)
)
FROM (
  SELECT DISTINCT ON (family_id) family_id, user_id
  FROM family_profiles
  WHERE role = 'parent' AND user_id IS NOT NULL
  ORDER BY family_id, created_at
) sub
WHERE f.id = sub.family_id;

--------------------------------------------------------------------------------
-- CHECK: Verify owner_user_id is set for all families with parents
--------------------------------------------------------------------------------

SELECT
  f.id,
  f.name,
  f.settings->>'owner_user_id' as owner_user_id,
  (SELECT COUNT(*) FROM family_profiles fp
   WHERE fp.family_id = f.id AND fp.role = 'parent' AND fp.user_id IS NOT NULL) as parent_count
FROM families f
WHERE f.settings->>'owner_user_id' IS NULL
  AND EXISTS (
    SELECT 1 FROM family_profiles fp
    WHERE fp.family_id = f.id AND fp.role = 'parent' AND fp.user_id IS NOT NULL
  );

--------------------------------------------------------------------------------
-- QUERY: Get family owner profile
--------------------------------------------------------------------------------

SELECT fp.id, fp.name, fp.role, au.email
FROM family_profiles fp
JOIN auth.users au ON au.id = fp.user_id
JOIN families f ON f.id = fp.family_id
WHERE f.id = 'FAMILY_UUID_HERE'
  AND fp.user_id = (f.settings->>'owner_user_id')::uuid;

--------------------------------------------------------------------------------
-- QUERY: Check if a user is the family owner
--------------------------------------------------------------------------------

SELECT
  (f.settings->>'owner_user_id')::uuid = 'USER_UUID_HERE' as is_owner
FROM families f
WHERE f.id = 'FAMILY_UUID_HERE';

--------------------------------------------------------------------------------
-- QUERY: List all families with their owners
--------------------------------------------------------------------------------

SELECT
  f.id as family_id,
  f.name as family_name,
  f.settings->>'owner_user_id' as owner_user_id,
  fp.name as owner_name,
  au.email as owner_email
FROM families f
LEFT JOIN family_profiles fp ON fp.user_id = (f.settings->>'owner_user_id')::uuid
  AND fp.family_id = f.id
LEFT JOIN auth.users au ON au.id = fp.user_id
ORDER BY f.created_at DESC;
