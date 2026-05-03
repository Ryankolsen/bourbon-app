-- ─────────────────────────────────────────────────────────────────────────────
-- Issue #176: Update bourbon_user_update_allowed to treat 0 as NULL for
-- proof, age_statement, and msrp.
--
-- Motivation: the Community Editing two-tier write model allows a user to fill
-- in a field that is blank.  A value of 0 on these three numeric fields is
-- considered "blank" (un-filled), so users must be able to overwrite it
-- directly (Tier 1) without going through the Tier 2 suggestion review flow.
--
-- After the zeros → NULL migration (#174) runs there should be no 0s left, but
-- this change ensures any stale zeros (or accidental zero writes) do not
-- permanently lock a field for community editing.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the policy that calls the function first
DROP POLICY IF EXISTS "Users can only fill null bourbon fields" ON public.bourbons;

-- Drop all known signatures
DROP FUNCTION IF EXISTS public.bourbon_user_update_allowed(uuid, text, text, text, integer, numeric, text,         numeric, text, text);
DROP FUNCTION IF EXISTS public.bourbon_user_update_allowed(uuid, text, text, text, integer, numeric, bourbon_type, numeric, text, text);

-- Recreate: numeric fields (proof, age_statement, msrp) treat 0 as blank
CREATE OR REPLACE FUNCTION public.bourbon_user_update_allowed(
  p_id             uuid,
  p_name           text,
  p_distillery     text,
  p_mashbill       text,
  p_age_statement  integer,
  p_proof          numeric,
  p_type           bourbon_type,
  p_msrp           numeric,
  p_image_url      text,
  p_description    text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.bourbons;
BEGIN
  SELECT * INTO old_row FROM public.bourbons WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN (
    -- String fields: only null is considered blank
    (old_row.name          IS NULL OR p_name          = old_row.name)          AND
    (old_row.distillery    IS NULL OR p_distillery    = old_row.distillery)    AND
    (old_row.mashbill      IS NULL OR p_mashbill      = old_row.mashbill)      AND
    (old_row.type          IS NULL OR p_type          = old_row.type)          AND
    (old_row.image_url     IS NULL OR p_image_url     = old_row.image_url)     AND
    (old_row.description   IS NULL OR p_description   = old_row.description)  AND
    -- Numeric fields: null OR 0 is considered blank
    (old_row.age_statement IS NULL OR old_row.age_statement = 0 OR p_age_statement = old_row.age_statement) AND
    (old_row.proof         IS NULL OR old_row.proof         = 0 OR p_proof         = old_row.proof)         AND
    (old_row.msrp          IS NULL OR old_row.msrp          = 0 OR p_msrp          = old_row.msrp)
  );
END;
$$;

-- Recreate the RLS policy
CREATE POLICY "Users can only fill null bourbon fields"
  ON public.bourbons
  FOR UPDATE
  TO authenticated
  USING (NOT public.is_admin())
  WITH CHECK (
    NOT public.is_admin() AND
    public.bourbon_user_update_allowed(
      id,
      name,
      distillery,
      mashbill,
      age_statement,
      proof,
      type,
      msrp,
      image_url,
      description
    )
  );
