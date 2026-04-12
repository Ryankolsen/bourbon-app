-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: find_profile_by_email (issue #14 — invite by email)
-- ─────────────────────────────────────────────────────────────────────────────
-- Allows a group owner to look up another user's public profile by email
-- address.  Email lives in auth.users (not in public.profiles), so we need
-- SECURITY DEFINER to cross the schema boundary safely.
--
-- Returns a single profiles row (or nothing) so the caller can then
-- send an invite by the resolved user_id.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.find_profile_by_email(p_email text)
returns setof public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select p.*
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

-- Only authenticated users can call this function
revoke all on function public.find_profile_by_email(text) from public;
grant execute on function public.find_profile_by_email(text) to authenticated;
