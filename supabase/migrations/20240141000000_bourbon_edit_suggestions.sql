-- ─────────────────────────────────────────
-- Issue #175: bourbon_edit_suggestions schema, RLS, and apply RPC
-- ─────────────────────────────────────────
-- This is the data foundation for the Community Bourbon Editing two-tier
-- write model. Tier 2 submissions (changes to non-null fields) land here
-- as pending suggestions that an admin reviews before applying.

-- ─────────────────────────────────────────
-- TABLE: bourbon_edit_suggestions
-- ─────────────────────────────────────────
CREATE TABLE public.bourbon_edit_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bourbon_id    uuid NOT NULL REFERENCES public.bourbons(id) ON DELETE CASCADE,
  submitted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submission_id uuid NOT NULL,  -- groups all field changes from one user action
  field_name    text NOT NULL,
  old_value     text,
  new_value     text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note   text,           -- stored for future use, not displayed in UI
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX bourbon_edit_suggestions_bourbon_id_idx
  ON public.bourbon_edit_suggestions (bourbon_id);

CREATE INDEX bourbon_edit_suggestions_submitted_by_idx
  ON public.bourbon_edit_suggestions (submitted_by);

CREATE INDEX bourbon_edit_suggestions_status_idx
  ON public.bourbon_edit_suggestions (status);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE public.bourbon_edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT their own suggestions
CREATE POLICY "Users can insert their own suggestions"
  ON public.bourbon_edit_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Users can SELECT their own suggestions
CREATE POLICY "Users can view their own suggestions"
  ON public.bourbon_edit_suggestions
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Admins can SELECT all suggestions
CREATE POLICY "Admins can view all suggestions"
  ON public.bourbon_edit_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can UPDATE review fields (status, reviewed_by, review_note, reviewed_at)
CREATE POLICY "Admins can update suggestion review fields"
  ON public.bourbon_edit_suggestions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────
-- RPC: apply_bourbon_suggestion
-- ─────────────────────────────────────────
-- SECURITY DEFINER so it can bypass user-level RLS on the bourbons table.
-- Fetches the pending suggestion, writes the new value to the named field on
-- bourbons, then stamps the suggestion as approved.
-- Raises an exception if the suggestion does not exist or is not pending.
CREATE OR REPLACE FUNCTION public.apply_bourbon_suggestion(p_suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion public.bourbon_edit_suggestions;
BEGIN
  -- Lock the row so concurrent calls cannot double-apply
  SELECT * INTO v_suggestion
    FROM public.bourbon_edit_suggestions
   WHERE id = p_suggestion_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion % not found', p_suggestion_id;
  END IF;

  IF v_suggestion.status <> 'pending' THEN
    RAISE EXCEPTION 'Suggestion % is not pending (current status: %)',
      p_suggestion_id, v_suggestion.status;
  END IF;

  -- Apply the field value to the bourbon row using dynamic SQL.
  -- field_name is admin-controlled data from our own table, not user input,
  -- so format() with %I (identifier quoting) is safe here.
  EXECUTE format(
    'UPDATE public.bourbons SET %I = $1, updated_at = now() WHERE id = $2',
    v_suggestion.field_name
  ) USING v_suggestion.new_value, v_suggestion.bourbon_id;

  -- Mark the suggestion as approved
  UPDATE public.bourbon_edit_suggestions
     SET status      = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = p_suggestion_id;
END;
$$;
