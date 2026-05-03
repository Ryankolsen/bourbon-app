-- Fix apply_bourbon_suggestion to cast new_value (text) to the actual column
-- type before the UPDATE. Without this, columns like bourbon_type (enum),
-- integer, and numeric reject the text parameter in EXECUTE...USING.
CREATE OR REPLACE FUNCTION public.apply_bourbon_suggestion(p_suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion public.bourbon_edit_suggestions;
  v_col_type   text;
BEGIN
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

  -- Resolve the column's Postgres type name so we can cast text → target type.
  -- format_type returns e.g. 'integer', 'numeric', 'bourbon_type', 'text'.
  SELECT pg_catalog.format_type(atttypid, atttypmod) INTO v_col_type
    FROM pg_attribute
   WHERE attrelid = 'public.bourbons'::regclass
     AND attname   = v_suggestion.field_name
     AND attnum    > 0
     AND NOT attisdropped;

  IF v_col_type IS NULL THEN
    RAISE EXCEPTION 'Unknown column % on bourbons', v_suggestion.field_name;
  END IF;

  -- Cast $1 (text) explicitly to the column's type before assignment.
  EXECUTE format(
    'UPDATE public.bourbons SET %I = $1::%s, updated_at = now() WHERE id = $2',
    v_suggestion.field_name,
    v_col_type
  ) USING v_suggestion.new_value, v_suggestion.bourbon_id;

  UPDATE public.bourbon_edit_suggestions
     SET status      = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = p_suggestion_id;
END;
$$;
