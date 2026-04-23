-- ─────────────────────────────────────────────────────────────────────────────
-- Bourbon Dojo: Daily Check-in Streak Function
--
-- check_in() is called by the client on each app open (via useCheckIn hook).
-- Idempotent: calling it multiple times on the same calendar day awards XP once.
--
-- Returns: { xp_awarded int, streak_days int, promoted bool, new_belt int }
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Fetch current streak state (if exists)
  select last_checkin_date, streak_days
    into v_last_checkin, v_streak
    from public.user_xp
   where user_id = v_user_id;

  -- No row yet — treat as brand new user with no prior check-in
  if not found then
    v_last_checkin := null;
    v_streak := 0;
  end if;

  -- Idempotent: same-day call → no-op
  if v_last_checkin = v_today then
    -- Return current state without awarding anything
    select ux.current_belt into v_new_belt
      from public.user_xp ux
     where user_id = v_user_id;

    return query select 0, v_streak, false, coalesce(v_new_belt, 1);
    return;
  end if;

  -- Determine new streak value
  if v_last_checkin = v_today - 1 then
    -- Consecutive day: extend streak
    v_streak := coalesce(v_streak, 0) + 1;
  else
    -- Missed at least one day (or first check-in): reset to 1
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

  -- Update streak state in user_xp
  -- award_xp already upserts the row; we just need to set streak fields
  update public.user_xp
     set streak_days      = v_streak,
         last_checkin_date = v_today
   where user_id = v_user_id;

  return query select v_total_xp_awarded, v_streak, v_promoted, v_new_belt;
end;
$$;
