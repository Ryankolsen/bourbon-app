-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements: Dojo Triggers
--
-- Wires dojo achievement checks into existing Dojo functions and adds new
-- triggers for duel and Pour-or-Faker completion events.
--
-- 1. Rewrites check_in() — streak achievement checks after streak update
-- 2. Rewrites award_xp() — belt achievement checks after promotion, with
--    recursion guard (skips when called from achievement_unlocked context)
-- 3. Adds trigger on duel_ghost_runs INSERT — first_duel + sweep_the_leg
-- 4. Adds trigger on xp_events INSERT (pour_or_faker_complete) — sacred_pourer
--    + untouchable (approximated: xp_awarded ≥ 185 means 20+ correct answers)
--
-- Note: sacred_pourer and untouchable were designed for the Sacred Pour game
-- which was renamed to Pour or Faker. The original "perfect first attempt"
-- concept does not have a direct DB-level equivalent in the current schema.
-- untouchable is awarded when the player earns ≥ 185 XP in a single run
-- (reaching all three XP milestones, requiring 20+ correct answers).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rewrite check_in() with streak achievement checks
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_award_result     record;
  v_promoted         boolean := false;
  v_new_belt         integer := 1;
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
     set streak_days       = v_streak,
         last_checkin_date = v_today
   where user_id = v_user_id;

  -- Streak achievements (idempotent)
  -- showed_up fires on every check-in but awards only once
  perform public.check_and_award_achievement(v_user_id, 'showed_up');

  if v_streak >= 7 then
    perform public.check_and_award_achievement(v_user_id, 'creature_of_habit');
  end if;

  if v_streak >= 30 then
    perform public.check_and_award_achievement(v_user_id, 'disturbingly_consistent');
  end if;

  return query select v_total_xp_awarded, v_streak, v_promoted, v_new_belt;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rewrite award_xp() with belt achievement checks
--
-- Key changes from the previous version (20240130):
--   a) UPDATE user_xp SET current_belt is moved BEFORE the achievement calls.
--      This ensures that any inner award_xp() call (from check_and_award_achievement)
--      reads the correct, already-promoted current_belt — preventing the inner
--      call from seeing a stale v_old_belt and emitting a spurious promoted=true.
--   b) Belt achievement checks run after the UPDATE but before INSERT xp_events,
--      guarded by p_event_type <> 'achievement_unlocked' to stop the recursion:
--        award_xp → check_and_award_achievement → award_xp(achievement_unlocked)
--                                                       → guard fires → no further check
--   c) The xp_events INSERT stays last so the Realtime payload carries the
--      correct promoted + new_belt values (same invariant as migration 20240130).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.award_xp(
  p_user_id      uuid,
  p_event_type   public.xp_event_type,
  p_xp_amount    integer,
  p_reference_id uuid default null
)
returns table (xp_awarded int, promoted bool, new_belt int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_belt   integer;
  v_new_xp     integer;
  v_new_belt   integer;
  v_promoted   boolean;

  -- Belt thresholds must match lib/belt-config.ts BELTS array
  v_thresholds integer[] := array[0, 200, 600, 1500, 3500, 8000, 16000, 30000, 50000, 80000];
  i            integer;
begin
  -- 1. Upsert user_xp and capture old belt + new total in one shot
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (p_user_id, p_xp_amount, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + excluded.total_xp;

  select ux.total_xp, ux.current_belt
    into v_new_xp, v_old_belt
    from public.user_xp ux
   where ux.user_id = p_user_id;

  -- 2. Compute new belt
  v_new_belt := 1;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_new_xp >= v_thresholds[i] then
      v_new_belt := i;
    end if;
  end loop;

  v_promoted := v_new_belt > v_old_belt;

  -- 3. Sync belt back to user_xp and profiles BEFORE achievement calls.
  --    Any inner award_xp() call from check_and_award_achievement will read
  --    current_belt = v_new_belt, so v_promoted in the inner call will be false
  --    (the belt was already synced), preventing a double promoted=true event.
  update public.user_xp
     set current_belt = v_new_belt
   where user_id = p_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = p_user_id;

  -- 4. Belt achievement checks — only on promotion, never from achievement_unlocked.
  --    The achievement_unlocked guard terminates the call chain:
  --      external event → award_xp → check_and_award → award_xp(achievement_unlocked) → stops
  --    Uses >= + v_old_belt < N to handle any edge-case XP jumps that skip a belt tier.
  if v_promoted and p_event_type <> 'achievement_unlocked' then
    if v_new_belt >= 2 and v_old_belt < 2 then
      perform public.check_and_award_achievement(p_user_id, 'white_belt_energy');
    end if;
    if v_new_belt >= 5 and v_old_belt < 5 then
      perform public.check_and_award_achievement(p_user_id, 'getting_serious');
    end if;
    if v_new_belt >= 7 and v_old_belt < 7 then
      perform public.check_and_award_achievement(p_user_id, 'senpai_status');
    end if;
    if v_new_belt >= 10 and v_old_belt < 10 then
      perform public.check_and_award_achievement(p_user_id, 'the_legend');
    end if;
  end if;

  -- 5. INSERT xp_events last — Realtime broadcasts this payload to the client.
  --    promoted + new_belt are correct before the INSERT fires.
  insert into public.xp_events (user_id, event_type, xp_awarded, reference_id, promoted, new_belt)
  values (p_user_id, p_event_type, p_xp_amount, p_reference_id, v_promoted, v_new_belt);

  return query select p_xp_amount, v_promoted, v_new_belt;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. duel_ghost_runs INSERT — first_duel + sweep_the_leg
--
-- Fires only for real user runs (user_id IS NOT NULL). Cold-start seed rows
-- inserted by the schema migration have user_id = null and are skipped.
--
-- first_duel: awarded when the user's total run count reaches 1.
-- sweep_the_leg: awarded when all three rounds report correct = true.
--
-- round_results JSONB shape (from ghost-opponent-service.ts saveGhostRun):
--   { round1: { correct: bool, time_ms: int }, round2: ..., round3: ... }
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_duel_ghost_run_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_count integer;
  v_is_sweep  boolean;
begin
  -- Skip cold-start seed rows
  if new.user_id is null then
    return new;
  end if;

  -- Total completed runs for this user (including the just-inserted row)
  select count(*)
    into v_run_count
    from public.duel_ghost_runs
   where user_id = new.user_id;

  -- First Duel: one-time on first real run
  if v_run_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'first_duel');
  end if;

  -- Sweep the Leg: all three rounds correct
  v_is_sweep := (
    (new.round_results -> 'round1' ->> 'correct')::boolean = true and
    (new.round_results -> 'round2' ->> 'correct')::boolean = true and
    (new.round_results -> 'round3' ->> 'correct')::boolean = true
  );

  if v_is_sweep then
    perform public.check_and_award_achievement(new.user_id, 'sweep_the_leg');
  end if;

  return new;
end;
$$;

create trigger duel_ghost_run_achievement_trigger
  after insert on public.duel_ghost_runs
  for each row execute function public.after_duel_ghost_run_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. xp_events INSERT (pour_or_faker_complete) — sacred_pourer + untouchable
--
-- Sacred Pour was renamed to Pour or Faker (migration 20240147–20240148).
-- The sacred_pourer and untouchable achievements are wired here to the
-- pour_or_faker_complete XP event:
--
--   sacred_pourer: first-ever pour_or_faker_complete event for the user.
--   untouchable: single-run XP ≥ 185, which requires reaching all three XP
--     milestone bonuses (streaks 5, 10, 20) — i.e. 20+ correct answers in
--     a row at training difficulty (5 XP/guess + 85 bonus = 185 XP minimum).
--
-- No recursion risk: the WHEN clause filters to pour_or_faker_complete only;
-- the inner achievement_unlocked xp_events INSERT won't re-trigger this fn.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_pour_or_faker_complete_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_count integer;
begin
  -- Count prior pour_or_faker_complete events for this user (excluding this row)
  select count(*)
    into v_prior_count
    from public.xp_events
   where user_id   = new.user_id
     and event_type = 'pour_or_faker_complete'
     and id        <> new.id;

  -- Sacred Pourer: first ever Pour or Faker completion
  if v_prior_count = 0 then
    perform public.check_and_award_achievement(new.user_id, 'sacred_pourer');
  end if;

  -- Untouchable: high-XP run indicates a long correct-answer streak
  if new.xp_awarded >= 185 then
    perform public.check_and_award_achievement(new.user_id, 'untouchable');
  end if;

  return new;
end;
$$;

create trigger pour_or_faker_achievement_trigger
  after insert on public.xp_events
  for each row
  when (new.event_type = 'pour_or_faker_complete')
  execute function public.after_pour_or_faker_complete_achievements();
