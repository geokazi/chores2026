-- Family Member Invite Functions
-- JSONB array operations for pending_invites storage
-- Created: January 27, 2026

-- Append invite to pending_invites array
CREATE OR REPLACE FUNCTION append_pending_invite(p_family_id uuid, p_invite jsonb)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'),
        '{apps}',
        COALESCE(settings->'apps', '{}')
      ),
      '{apps,choregami}',
      COALESCE(settings->'apps'->'choregami', '{}')
    ),
    '{apps,choregami,pending_invites}',
    COALESCE(settings->'apps'->'choregami'->'pending_invites', '[]') || p_invite
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;

-- Remove invite by token
CREATE OR REPLACE FUNCTION remove_pending_invite(p_family_id uuid, p_token text)
RETURNS void AS $$
BEGIN
  UPDATE families
  SET settings = jsonb_set(
    settings,
    '{apps,choregami,pending_invites}',
    (
      SELECT COALESCE(jsonb_agg(invite), '[]')
      FROM jsonb_array_elements(
        COALESCE(settings->'apps'->'choregami'->'pending_invites', '[]')
      ) AS invite
      WHERE invite->>'token' != p_token
    )
  )
  WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;

-- Count pending invites for a family (for rate limiting)
CREATE OR REPLACE FUNCTION count_pending_invites(p_family_id uuid)
RETURNS integer AS $$
DECLARE
  invite_count integer;
BEGIN
  SELECT jsonb_array_length(
    COALESCE(settings->'apps'->'choregami'->'pending_invites', '[]')
  )
  INTO invite_count
  FROM families
  WHERE id = p_family_id;

  RETURN COALESCE(invite_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Find invite by token - O(1) database operation
-- Returns family_id, family_name, and invite data in single query
CREATE OR REPLACE FUNCTION find_invite_by_token(p_token text)
RETURNS TABLE(family_id uuid, family_name text, invite jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, inv
  FROM families f,
       jsonb_array_elements(
         COALESCE(f.settings->'apps'->'choregami'->'pending_invites', '[]')
       ) AS inv
  WHERE inv->>'token' = p_token
    AND (inv->>'expires_at')::timestamptz > NOW()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Find invite by email (for /setup page to show pending invite banner)
-- Used when user is authenticated but has no family profile
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
