-- Fix Security Advisor error: bourbon_rating_stats was created as SECURITY DEFINER
-- (Supabase default for views created by the postgres role). Recreate it with
-- security_invoker = true so RLS policies on tastings apply to the querying user.
create or replace view public.bourbon_rating_stats
  with (security_invoker = true)
as
select
  bourbon_id,
  round(avg(rating)::numeric, 1)                          as avg_rating,
  count(*) filter (where rating is not null)::integer     as rating_count,
  count(*)::integer                                       as tasting_count
from public.tastings
group by bourbon_id;
