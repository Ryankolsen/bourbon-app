-- ─────────────────────────────────────────────────────────────────────────────
-- Achievement Sharing XP Infrastructure
--
-- Delivers:
--   • achievement_shared added to xp_event_type enum
--   • reference_key text column added to xp_events (for non-UUID keys like belt level)
--   • Partial unique index: one achievement_shared award per (user, reference_key)
--   • award_achievement_share_xp(key text) RPC — idempotent, security definer,
--     callable by authenticated role only
--
-- XP awarded: 100 XP per belt (once-per-belt cap enforced by unique index)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend xp_event_type enum
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.xp_event_type add value if not exists 'achievement_shared';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add reference_key column to xp_events
--    Nullable text — stores non-UUID reference strings like belt levels ("1"–"10")
--    or composite keys like "first_tasting". No FK; append-only audit use only.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.xp_events
  add column if not exists reference_key text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Partial unique index — once-per-belt XP cap
--    Enforces that each user can earn achievement_shared XP at most once per
--    reference_key (e.g., one award per belt level).
-- ─────────────────────────────────────────────────────────────────────────────

create unique index if not exists xp_events_achievement_shared_user_key_uniq
  on public.xp_events (user_id, event_type, reference_key)
  where event_type = 'achievement_shared';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. award_achievement_share_xp(key text) RPC
--
-- Idempotent: calling twice with the same key returns already_claimed = true
-- on the second call without awarding duplicate XP.
--
-- The race condition (two concurrent calls) is handled by ON CONFLICT DO NOTHING
-- on the partial unique index — only one insert wins; the other sees 0 rows
-- affected and returns already_claimed = true.
--
-- Returns: (xp_awarded int, already_claimed bool)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.award_achievement_share_xp(key text)
returns table (xp_awarded int, already_claimed bool)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid    := auth.uid();
  v_rows        integer;
  v_old_belt    integer;
  v_new_xp      integer;
  v_new_belt    integer;
  -- Belt thresholds must match lib/belt-config.ts BELTS[].minXp
  v_thresholds  integer[] := array[0, 200, 600, 1500, 3500, 8000, 16000, 30000, 50000, 80000];
  i             integer;
begin
  -- Must be authenticated
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Attempt idempotent insert; partial unique index prevents duplicates
  insert into public.xp_events (user_id, event_type, xp_awarded, reference_key)
  values (v_user_id, 'achievement_shared', 100, key)
  on conflict (user_id, event_type, reference_key)
    where event_type = 'achievement_shared'
  do nothing;

  get diagnostics v_rows = row_count;

  -- If nothing was inserted, XP was already awarded for this key
  if v_rows = 0 then
    return query select 0, true;
    return;
  end if;

  -- Update user_xp total
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (v_user_id, 100, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + 100;

  -- Compute new belt from updated total
  select ux.total_xp, ux.current_belt
    into v_new_xp, v_old_belt
    from public.user_xp ux
   where ux.user_id = v_user_id;

  v_new_belt := 1;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_new_xp >= v_thresholds[i] then
      v_new_belt := i;
    end if;
  end loop;

  -- Sync belt to user_xp and profiles
  update public.user_xp
     set current_belt = v_new_belt
   where user_id = v_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = v_user_id;

  return query select 100, false;
end;
$$;

-- Grant execute to authenticated users; revoke from anon
grant execute on function public.award_achievement_share_xp(text) to authenticated;
revoke execute on function public.award_achievement_share_xp(text) from anon;
