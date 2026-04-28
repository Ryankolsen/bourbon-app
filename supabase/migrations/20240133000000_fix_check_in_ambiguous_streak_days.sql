-- Fix: qualify streak_days column references in check_in() to resolve ambiguity.
--
-- PostgreSQL raises "column reference streak_days is ambiguous" because the
-- function's RETURNS TABLE declares streak_days as an OUT parameter, which
-- clashes with user_xp.streak_days inside SELECT statements. Adding a table
-- alias (ux.*) makes all column references unambiguous.

create or replace function public.check_in()
returns table (xp_awarded int, streak_days int, promoted bool, new_belt int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_today          date := current_date;
  v_last_checkin   date;
  v_streak         integer;
  v_xp_to_award    integer;
  v_award_result   record;
  v_promoted       boolean := false;
  v_new_belt       integer := 1;
  v_total_xp_awarded integer := 0;
begin
  -- Ensure the user_xp row exists before any reads.
  insert into public.user_xp (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  -- Fetch current streak state (alias ux.* avoids ambiguity with OUT param streak_days)
  select ux.last_checkin_date, ux.streak_days
    into v_last_checkin, v_streak
    from public.user_xp ux
   where ux.user_id = v_user_id;

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

  -- Update streak state
  update public.user_xp
     set streak_days       = v_streak,
         last_checkin_date = v_today
   where user_id = v_user_id;

  return query select v_total_xp_awarded, v_streak, v_promoted, v_new_belt;
end;
$$;
