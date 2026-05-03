-- Fix trigger to skip pg_net call when supabase.functions_url is not set.
-- In local dev the setting is absent, so current_setting returns NULL, and
-- NULL || '/notify-admins-on-suggestion' = NULL, which violates the NOT NULL
-- constraint on net.http_request_queue.url.
CREATE OR REPLACE FUNCTION public.trigger_notify_admins_on_suggestion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_url text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  v_functions_url := current_setting('supabase.functions_url', true);
  IF v_functions_url IS NULL OR v_functions_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/notify-admins-on-suggestion',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer '
                   || current_setting('supabase.service_role_key', true)
               ),
    body    := jsonb_build_object(
                 'id',           NEW.id,
                 'bourbon_id',   NEW.bourbon_id,
                 'submitted_by', NEW.submitted_by,
                 'field_name',   NEW.field_name
               )
  );

  RETURN NEW;
END;
$$;
