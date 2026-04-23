-- ─────────────────────────────────────────────────────────────────────────────
-- Fix bourbon_user_update_allowed to accept bourbon_type instead of text for
-- p_type.  Migration 20240122 converted the bourbons.type column to the
-- bourbon_type enum, but 20240123 declared the parameter as text.  On some
-- Postgres versions the implicit enum→text cast is not used during function
-- resolution, causing the UPDATE policy to fail at creation time.
--
-- Remote: 20240123 is already fixed, so this is a clean idempotent no-op there.
-- Local:  replaces the text-typed function and its dependent policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the policy that references the function (must come first)
DROP POLICY IF EXISTS "Users can only fill null bourbon fields" ON public.bourbons;

-- Drop either signature that may exist
DROP FUNCTION IF EXISTS public.bourbon_user_update_allowed(uuid, text, text, text, integer, numeric, text,         numeric, text, text);
DROP FUNCTION IF EXISTS public.bourbon_user_update_allowed(uuid, text, text, text, integer, numeric, bourbon_type, numeric, text, text);

-- Recreate with the correct bourbon_type parameter
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
    (old_row.name          IS NULL OR p_name          = old_row.name)          AND
    (old_row.distillery    IS NULL OR p_distillery    = old_row.distillery)    AND
    (old_row.mashbill      IS NULL OR p_mashbill      = old_row.mashbill)      AND
    (old_row.age_statement IS NULL OR p_age_statement = old_row.age_statement) AND
    (old_row.proof         IS NULL OR p_proof         = old_row.proof)         AND
    (old_row.type          IS NULL OR p_type          = old_row.type)          AND
    (old_row.msrp          IS NULL OR p_msrp          = old_row.msrp)          AND
    (old_row.image_url     IS NULL OR p_image_url     = old_row.image_url)     AND
    (old_row.description   IS NULL OR p_description   = old_row.description)
  );
END;
$$;

-- Recreate the policy
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
