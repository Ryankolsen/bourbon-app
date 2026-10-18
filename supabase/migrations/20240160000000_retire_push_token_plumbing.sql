-- Retire push-notification plumbing (#228).
-- The privacy policy states the app collects no push tokens and sends no
-- pushes. No app build ever registered a token (prod had 0 rows), so the
-- admin-notify trigger and the notify-admins-on-suggestion Edge Function were
-- dead code. Dropping them affects no deployed bundle.

DROP TRIGGER IF EXISTS notify_admins_after_suggestion_insert
  ON public.bourbon_edit_suggestions;

DROP FUNCTION IF EXISTS public.trigger_notify_admins_on_suggestion();

DROP TABLE IF EXISTS public.user_push_tokens;
