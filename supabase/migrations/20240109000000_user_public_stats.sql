-- ─────────────────────────────────────────
-- USER PUBLIC STATS (issue #10)
-- ─────────────────────────────────────────
-- Returns public-facing aggregate counts for a user's profile.
-- SECURITY DEFINER lets us count collection rows (which are otherwise
-- private to their owner) without exposing individual entries.

create or replace function public.get_user_public_stats(p_user_id uuid)
returns table (tasting_count bigint, collection_count bigint)
language sql
security definer
stable
as $$
  select
    (select count(*) from public.tastings    where user_id = p_user_id) as tasting_count,
    (select count(*) from public.user_collection where user_id = p_user_id) as collection_count;
$$;
