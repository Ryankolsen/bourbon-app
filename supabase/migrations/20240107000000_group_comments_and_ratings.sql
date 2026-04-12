-- ─────────────────────────────────────────
-- GROUP COMMENTS & RATINGS (issue #15)
-- ─────────────────────────────────────────

-- Add visibility and group_id columns to bourbon_comments
ALTER TABLE public.bourbon_comments
  ADD COLUMN visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'group')),
  ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

-- Enforce: group-visibility comments must reference a group
ALTER TABLE public.bourbon_comments
  ADD CONSTRAINT group_comment_requires_group_id
  CHECK (visibility = 'public' OR group_id IS NOT NULL);

-- ─────────────────────────────────────────
-- RLS: bourbon_comments — visibility-aware
-- ─────────────────────────────────────────

-- Drop old blanket SELECT policy
DROP POLICY "Comments are viewable by authenticated users" ON public.bourbon_comments;

-- Public comments visible to all authenticated users
CREATE POLICY "Public comments viewable by authenticated users"
  ON public.bourbon_comments FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND visibility = 'public'
  );

-- Group comments visible only to accepted members of that group
CREATE POLICY "Group comments viewable by accepted members"
  ON public.bourbon_comments FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND visibility = 'group'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = bourbon_comments.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'accepted'
    )
  );

-- Drop old INSERT policy and split by visibility
DROP POLICY "Users can insert own comments" ON public.bourbon_comments;

CREATE POLICY "Users can insert own public comments"
  ON public.bourbon_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND visibility = 'public'
  );

CREATE POLICY "Members can insert group comments"
  ON public.bourbon_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND visibility = 'group'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = bourbon_comments.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'accepted'
    )
  );

-- Index for group-filtered comment queries
CREATE INDEX bourbon_comments_group_id_idx
  ON public.bourbon_comments (group_id)
  WHERE group_id IS NOT NULL;

-- ─────────────────────────────────────────
-- GROUP AVERAGE RATING FUNCTION
-- ─────────────────────────────────────────

-- Returns avg rating and count for a bourbon restricted to accepted members
-- of a given group.  Uses SECURITY DEFINER so callers can't bypass RLS on
-- tastings while still getting aggregated (non-personal) results.
CREATE OR REPLACE FUNCTION public.get_group_avg_rating(
  p_group_id  uuid,
  p_bourbon_id uuid
)
RETURNS TABLE(avg_rating numeric, rating_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(t.rating)::numeric, 1) AS avg_rating,
    COUNT(t.rating)                  AS rating_count
  FROM tastings t
  INNER JOIN group_members gm
    ON  gm.user_id  = t.user_id
    AND gm.group_id = p_group_id
    AND gm.status   = 'accepted'
  WHERE t.bourbon_id = p_bourbon_id
    AND t.rating IS NOT NULL;
$$;
