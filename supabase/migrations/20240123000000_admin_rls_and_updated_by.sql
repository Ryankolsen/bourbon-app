-- ─────────────────────────────────────────
-- Issue #85: DB Foundation — is_admin, updated_by, RLS policies, cascade audit
-- ─────────────────────────────────────────

-- 1. Add is_admin to profiles (default false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Add updated_by to bourbons (nullable FK to profiles)
ALTER TABLE public.bourbons
  ADD COLUMN IF NOT EXISTS updated_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- CASCADE DELETE AUDIT
-- All bourbon_id FKs already carry ON DELETE CASCADE from their original
-- migrations; no ALTER needed:
--   • user_collection.bourbon_id  (20240101000000_initial_schema.sql)
--   • user_wishlist.bourbon_id    (20240101000000_initial_schema.sql)
--   • tastings.bourbon_id         (20240101000000_initial_schema.sql)
--   • bourbon_comments.bourbon_id (20240104000000_bourbon_comments.sql)
-- ─────────────────────────────────────────

-- ─────────────────────────────────────────
-- HELPER: is_admin()
-- SECURITY DEFINER so it bypasses RLS when reading profiles.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────
-- HELPER: bourbon_user_update_allowed(id, new field values...)
-- Returns true if every currently-non-null editable field in the existing row
-- is unchanged in the proposed update.  SECURITY DEFINER so the inner SELECT
-- bypasses the caller's RLS on bourbons.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bourbon_user_update_allowed(
  p_id             uuid,
  p_name           text,
  p_distillery     text,
  p_mashbill       text,
  p_age_statement  integer,
  p_proof          numeric,
  p_type           text,
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
    (old_row.name         IS NULL OR p_name         = old_row.name)         AND
    (old_row.distillery   IS NULL OR p_distillery   = old_row.distillery)   AND
    (old_row.mashbill     IS NULL OR p_mashbill     = old_row.mashbill)     AND
    (old_row.age_statement IS NULL OR p_age_statement = old_row.age_statement) AND
    (old_row.proof        IS NULL OR p_proof        = old_row.proof)        AND
    (old_row.type         IS NULL OR p_type         = old_row.type)         AND
    (old_row.msrp         IS NULL OR p_msrp         = old_row.msrp)         AND
    (old_row.image_url    IS NULL OR p_image_url    = old_row.image_url)    AND
    (old_row.description  IS NULL OR p_description  = old_row.description)
  );
END;
$$;

-- ─────────────────────────────────────────
-- RLS POLICIES ON bourbons
-- ─────────────────────────────────────────

-- 3. Admin UPDATE policy: admins may update any field on any row
CREATE POLICY "Admins can update any bourbon"
  ON public.bourbons
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. User UPDATE policy: authenticated non-admins may only fill in NULL fields
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

-- 5. Admin DELETE policy: only admins may delete bourbon rows
CREATE POLICY "Admins can delete bourbons"
  ON public.bourbons
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
