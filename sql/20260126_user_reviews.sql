-- User Reviews Table
-- Created: January 26, 2026
-- Purpose: Store user reviews for landing page social proof
-- Schema: public (cross-app, not choretracker-specific)

-- =============================================================================
-- TABLE: user_reviews
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who submitted (private - never exposed in public queries)
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Review content (public)
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  display_name text NOT NULL,  -- "The Smith Family" or "Sarah M."

  -- Moderation
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,

  -- Flexible metadata
  -- Example: {
  --   "months_using": 3,
  --   "location": "California",
  --   "outcomes": ["less_nagging", "kid_motivation"],
  --   "feature_highlighted": "leaderboard"
  -- }
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One APPROVED review per family (allows drafts/revisions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_approved_family
ON public.user_reviews(family_id) WHERE is_approved = true;

-- Index for public queries (only fetch approved reviews)
CREATE INDEX IF NOT EXISTS idx_reviews_approved
ON public.user_reviews(is_approved) WHERE is_approved = true;

-- Index for featured reviews (landing page hero)
CREATE INDEX IF NOT EXISTS idx_reviews_featured
ON public.user_reviews(is_featured) WHERE is_featured = true;

-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

-- Get approved reviews with "verified family" computed at read-time
-- (Verified = family has completed 50+ chores)
-- SELECT
--   r.id, r.rating, r.review_text, r.display_name, r.metadata, r.created_at,
--   (SELECT COUNT(*) FROM choretracker.chore_assignments ca
--    WHERE ca.family_id = r.family_id AND ca.status = 'completed') >= 50 AS verified
-- FROM public.user_reviews r
-- WHERE r.is_approved = true
-- ORDER BY r.is_featured DESC, r.created_at DESC
-- LIMIT 10;

-- Simple query: Get approved reviews for public display (no family_id exposed)
-- SELECT id, rating, review_text, display_name, metadata, created_at
-- FROM public.user_reviews
-- WHERE is_approved = true
-- ORDER BY is_featured DESC, created_at DESC
-- LIMIT 10;

-- Get featured reviews for landing page
-- SELECT id, rating, review_text, display_name, metadata->>'months_using' as months
-- FROM public.user_reviews
-- WHERE is_approved = true AND is_featured = true
-- ORDER BY created_at DESC
-- LIMIT 3;

-- Admin: Get pending reviews for moderation
-- SELECT r.*, f.name as family_name
-- FROM public.user_reviews r
-- JOIN families f ON f.id = r.family_id
-- WHERE r.is_approved = false
-- ORDER BY r.created_at ASC;
