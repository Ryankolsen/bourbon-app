-- ─────────────────────────────────────────────────────────────────────────────
-- Issue #179: Postgres AFTER INSERT trigger on bourbon_edit_suggestions that
-- fires the notify-admins-on-suggestion Edge Function via pg_net whenever a
-- new pending suggestion is inserted.
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger function: invokes the Edge Function asynchronously via pg_net.
-- pg_net is available in all Supabase projects and allows non-blocking HTTP
-- calls from within trigger functions.
CREATE OR REPLACE FUNCTION public.trigger_notify_admins_on_suggestion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire for new pending suggestions (INSERT always produces status='pending'
  -- per the column default, but guard explicitly in case a future migration
  -- changes the default or direct inserts use a different status).
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := current_setting('supabase.functions_url', true)
               || '/notify-admins-on-suggestion',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer '
                   || current_setting('supabase.service_role_key', true)
               ),
    body    := jsonb_build_object(
                 'id',          NEW.id,
                 'bourbon_id',  NEW.bourbon_id,
                 'submitted_by', NEW.submitted_by,
                 'field_name',  NEW.field_name
               )
  );

  RETURN NEW;
END;
$$;

-- Attach the trigger to bourbon_edit_suggestions
CREATE TRIGGER notify_admins_after_suggestion_insert
  AFTER INSERT ON public.bourbon_edit_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_admins_on_suggestion();
