-- Pending Invite Lookup Queries
-- For finding invites by token or email
-- Created: January 29, 2026

-- ============================================================================
-- FUNCTION: find_invite_by_email
-- ============================================================================
-- Purpose: Find pending invite by user's email address
-- Use case: /setup page shows banner when authenticated user has pending invite
--
-- This allows users who land on /setup (authenticated but no family profile)
-- to see if they have a pending invite without needing to find the email.

CREATE OR REPLACE FUNCTION find_invite_by_email(p_email text)
RETURNS TABLE(family_id uuid, family_name text, invite jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, inv
  FROM families f,
       jsonb_array_elements(
         COALESCE(f.settings->'apps'->'choregami'->'pending_invites', '[]')
       ) AS inv
  WHERE inv->>'channel' = 'email'
    AND LOWER(inv->>'contact') = LOWER(p_email)
    AND (inv->>'expires_at')::timestamptz > NOW()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Check if a specific email has a pending invite
SELECT * FROM find_invite_by_email('george.kariuki@gmail.com');

-- Returns:
-- family_id | family_name | invite (jsonb with token, inviter, etc.)


-- ============================================================================
-- MANUAL QUERY (without function)
-- ============================================================================
-- If you need to query directly without the function:

SELECT
  f.id as family_id,
  f.name as family_name,
  inv->>'token' as invite_token,
  inv->>'invited_by_name' as inviter_name,
  inv->>'expires_at' as expires_at
FROM families f,
     jsonb_array_elements(
       COALESCE(f.settings->'apps'->'choregami'->'pending_invites', '[]')
     ) AS inv
WHERE inv->>'channel' = 'email'
  AND LOWER(inv->>'contact') = LOWER('george.kariuki@gmail.com')
  AND (inv->>'expires_at')::timestamptz > NOW();


-- ============================================================================
-- LIST ALL PENDING INVITES (for debugging)
-- ============================================================================

SELECT
  f.name as family_name,
  inv->>'channel' as channel,
  inv->>'contact' as contact,
  inv->>'role' as role,
  inv->>'invited_by_name' as inviter,
  inv->>'expires_at' as expires_at
FROM families f,
     jsonb_array_elements(
       COALESCE(f.settings->'apps'->'choregami'->'pending_invites', '[]')
     ) AS inv
WHERE (inv->>'expires_at')::timestamptz > NOW()
ORDER BY inv->>'expires_at' DESC;
