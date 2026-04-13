-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP VISIBILITY (issue #39)
-- Adds an is_public flag to groups so the app can distinguish public groups
-- (visible to all authenticated users) from private groups (members only).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.groups
  ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- ── Update groups SELECT policy to allow non-members to see public groups ─────
DROP POLICY IF EXISTS "Group members can view groups" ON public.groups;

CREATE POLICY "Group members can view groups"
  ON public.groups FOR SELECT
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR public.current_user_in_group(id)
  );
