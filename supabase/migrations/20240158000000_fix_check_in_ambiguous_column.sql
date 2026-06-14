-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: check_in() threw "column reference \"streak_days\" is ambiguous" on EVERY
-- call. The RETURNS TABLE OUT-parameter `streak_days` collided with the
-- `user_xp.streak_days` column in the unqualified SELECT (default
-- variable_conflict = error). The client swallowed the error, so daily check-in
-- XP and the DailyBonusScreen never worked in any environment.
--
-- This rewrite qualifies all column references with the `ux` table alias.
--
-- Per db-migrate cardinal rule, this RPC rewrite is gated behind the
-- `daily_bonus_live` feature flag (seeded false). While the flag is off, check_in
-- is a clean no-op (returns 0, no error, no row mutation) so existing bundles are
-- unaffected by the push. Flip the flag to activate.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.feature_flags (name, enabled)
values ('daily_bonus_live', false)
on conflict (name) do nothing;

create or replace function public.check_in()
returns table (xp_awarded int, streak_days int, promoted bool, new_belt int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id          uuid := auth.uid();
  v_today            date := current_date;
  v_last_checkin     date;
  v_streak           integer;
  v_xp_to_award      integer;
  v_promoted         boolean := false;
  v_new_belt         integer := 1;
  v_total_xp_awarded integer := 0;
  v_flag_enabled     boolean := false;
begin
  -- Feature gate: while off, behave as a clean no-op (no award, no mutation,
  -- no error) so live bundles are unaffected until the flag is flipped.
  select enabled into v_flag_enabled
    from public.feature_flags
   where name = 'daily_bonus_live';

  if not coalesce(v_flag_enabled, false) then
    return query select 0, 0, false, 1;
    return;
  end if;

  -- Fetch current streak state (if exists). Columns are qualified with `ux` to
  -- disambiguate from the RETURNS TABLE OUT-parameter `streak_days`.
  select ux.last_checkin_date, ux.streak_days
    into v_last_checkin, v_streak
    from public.user_xp ux
   where ux.user_id = v_user_id;

  -- No row yet — treat as brand new user with no prior check-in
  if not found then
    v_last_checkin := null;
    v_streak := 0;
  end if;

  -- Idempotent: same-day call → no-op
  if v_last_checkin = v_today then
    select ux.current_belt into v_new_belt
      from public.user_xp ux
     where ux.user_id = v_user_id;

    return query select 0, v_streak, false, coalesce(v_new_belt, 1);
    return;
  end if;

  -- Determine new streak value
  if v_last_checkin = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  -- Base XP = streak_days (day 1 = 1 XP, day 7 = 7 XP, etc.)
  v_xp_to_award := v_streak;

  -- Award daily check-in XP
  select r.promoted, r.new_belt
    into v_promoted, v_new_belt
    from public.award_xp(v_user_id, 'daily_checkin', v_xp_to_award, null) r;

  v_total_xp_awarded := v_xp_to_award;

  -- 7-day milestone bonus
  if v_streak = 7 then
    select r.promoted, r.new_belt
      into v_promoted, v_new_belt
      from public.award_xp(v_user_id, 'streak_milestone_7', 20, null) r;
    v_total_xp_awarded := v_total_xp_awarded + 20;
  end if;

  -- 30-day milestone bonus
  if v_streak = 30 then
    select r.promoted, r.new_belt
      into v_promoted, v_new_belt
      from public.award_xp(v_user_id, 'streak_milestone_30', 75, null) r;
    v_total_xp_awarded := v_total_xp_awarded + 75;
  end if;

  -- Update streak state in user_xp (award_xp already upserted the row)
  update public.user_xp
     set streak_days       = v_streak,
         last_checkin_date = v_today
   where user_id = v_user_id;

  return query select v_total_xp_awarded, v_streak, v_promoted, v_new_belt;
end;
$$;
