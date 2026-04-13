-- Unified profile search: partial match on username/display_name, exact match on email
create or replace function public.search_profiles(p_query text)
returns setof public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select p.*
  from public.profiles p
  left join auth.users u on u.id = p.id
  where
    p.username ilike '%' || lower(trim(p_query)) || '%'
    or lower(coalesce(p.display_name, '')) ilike '%' || lower(trim(p_query)) || '%'
    or lower(coalesce(u.email, '')) = lower(trim(p_query))
  order by
    -- Exact username match first, then display_name match, then partial
    case
      when lower(p.username) = lower(trim(p_query)) then 0
      when lower(coalesce(p.display_name, '')) = lower(trim(p_query)) then 1
      else 2
    end
  limit 10;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;
