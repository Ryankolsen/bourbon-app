-- ─────────────────────────────────────────────────────────────────────────────
-- Achievement trigger exception guards
--
-- All achievement trigger functions previously had no exception handling.
-- A failure inside check_and_award_achievement() would propagate up and roll
-- back the original user action (tasting, follow, collection add, etc.).
--
-- This migration rewrites every trigger function and the two core RPCs
-- (check_in, award_xp) to swallow achievement errors silently. The original
-- action always succeeds; achievement award failures are non-fatal.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. after_tasting_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tasting_count integer;
  v_notes_count   integer;
  v_has_notes     boolean;
begin
  select count(*)
    into v_tasting_count
    from public.tastings
   where user_id = new.user_id;

  if v_tasting_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'first_impressions');
    perform public.check_and_award_achievement(new.user_id, 'freshman_sipper');
  end if;

  if v_tasting_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'seasoned_palate');
  end if;

  if v_tasting_count >= 50 then
    perform public.check_and_award_achievement(new.user_id, 'tasting_savant');
  end if;

  v_has_notes := (
    (new.nose          is not null and new.nose          <> '') or
    (new.palate        is not null and new.palate        <> '') or
    (new.finish        is not null and new.finish        <> '') or
    (new.overall_notes is not null and new.overall_notes <> '')
  );

  if v_has_notes then
    select count(*)
      into v_notes_count
      from public.tastings
     where user_id = new.user_id
       and (
         (nose          is not null and nose          <> '') or
         (palate        is not null and palate        <> '') or
         (finish        is not null and finish        <> '') or
         (overall_notes is not null and overall_notes <> '')
       );

    if v_notes_count >= 1 then
      perform public.check_and_award_achievement(new.user_id, 'notes_to_self');
    end if;

    if v_notes_count >= 20 then
      perform public.check_and_award_achievement(new.user_id, 'wax_poetic');
    end if;

    if v_notes_count >= 75 then
      perform public.check_and_award_achievement(new.user_id, 'pretentious_in_the_best_way');
    end if;
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. after_tasting_insert_explorer_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_insert_explorer_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distillery          text;
  v_bourbon_type        bourbon_type;
  v_age_statement       integer;
  v_distillery_count    integer;
  v_single_barrel_count integer;
begin
  select b.distillery, b.type, b.age_statement
    into v_distillery, v_bourbon_type, v_age_statement
    from public.bourbons b
   where b.id = new.bourbon_id;

  select count(distinct b.distillery)
    into v_distillery_count
    from public.tastings t
    join public.bourbons b on b.id = t.bourbon_id
   where t.user_id = new.user_id
     and b.distillery is not null;

  if v_distillery_count >= 3 then
    perform public.check_and_award_achievement(new.user_id, 'branching_out');
  end if;

  if v_distillery_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'passport_sipper');
  end if;

  if v_distillery_count >= 25 then
    perform public.check_and_award_achievement(new.user_id, 'gone_native');
  end if;

  if v_bourbon_type = 'rye'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'rye_curious');
  end if;

  if v_bourbon_type = 'wheated'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'wheated_wonder');
  end if;

  if v_bourbon_type = 'single_barrel'::bourbon_type then
    select count(*)
      into v_single_barrel_count
      from public.tastings t
      join public.bourbons b on b.id = t.bourbon_id
     where t.user_id = new.user_id
       and b.type = 'single_barrel'::bourbon_type;

    if v_single_barrel_count >= 10 then
      perform public.check_and_award_achievement(new.user_id, 'single_barrel_snob');
    end if;
  end if;

  if v_age_statement is not null and v_age_statement >= 15 then
    perform public.check_and_award_achievement(new.user_id, 'old_money');
  end if;

  if v_bourbon_type = 'cask_strength'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'barrel_proof_or_bust');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. after_collection_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_collection_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection_count integer;
begin
  select count(*)
    into v_collection_count
    from public.user_collection
   where user_id = new.user_id;

  if v_collection_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'one_and_done_nope');
  end if;

  if v_collection_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'cabinet_goals');
  end if;

  if v_collection_count >= 50 then
    perform public.check_and_award_achievement(new.user_id, 'send_help');
  end if;

  if v_collection_count >= 25 then
    perform public.check_and_award_achievement(new.user_id, 'hoarder_we_mean_collector');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. after_wishlist_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_wishlist_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist_count integer;
begin
  select count(*)
    into v_wishlist_count
    from public.user_wishlist
   where user_id = new.user_id;

  if v_wishlist_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'the_dreamer');
  end if;

  if v_wishlist_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'wishful_thinking');
  end if;

  if v_wishlist_count >= 50 then
    perform public.check_and_award_achievement(new.user_id, 'champagne_taste_bourbon_budget');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. after_user_follows_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_user_follows_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_following_count integer;
  v_follower_count  integer;
begin
  select count(*)
    into v_following_count
    from public.user_follows
   where follower_id = new.follower_id;

  if v_following_count >= 1 then
    perform public.check_and_award_achievement(new.follower_id, 'made_a_friend');
  end if;

  if v_following_count >= 10 then
    perform public.check_and_award_achievement(new.follower_id, 'social_butterfly');
  end if;

  if v_following_count >= 50 then
    perform public.check_and_award_achievement(new.follower_id, 'the_mayor');
  end if;

  select count(*)
    into v_follower_count
    from public.user_follows
   where following_id = new.following_id;

  if v_follower_count >= 1 then
    perform public.check_and_award_achievement(new.following_id, 'fan_club');
  end if;

  if v_follower_count >= 25 then
    perform public.check_and_award_achievement(new.following_id, 'rising_star');
  end if;

  if v_follower_count >= 100 then
    perform public.check_and_award_achievement(new.following_id, 'basically_famous');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. after_tasting_comment_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_comment_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_count integer;
begin
  select count(*)
    into v_comment_count
    from public.tasting_comments
   where user_id = new.user_id;

  if v_comment_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'chatty_cathy');
  end if;

  if v_comment_count >= 25 then
    perform public.check_and_award_achievement(new.user_id, 'the_commentator');
  end if;

  if v_comment_count >= 100 then
    perform public.check_and_award_achievement(new.user_id, 'never_shuts_up');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. after_tasting_like_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_like_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tasting_owner  uuid;
  v_likes_received integer;
begin
  select user_id
    into v_tasting_owner
    from public.tastings
   where id = new.tasting_id;

  if v_tasting_owner is null or v_tasting_owner = new.user_id then
    return new;
  end if;

  select count(*)
    into v_likes_received
    from public.tasting_likes tl
    join public.tastings t on t.id = tl.tasting_id
   where t.user_id = v_tasting_owner;

  if v_likes_received >= 1 then
    perform public.check_and_award_achievement(v_tasting_owner, 'appreciated');
  end if;

  if v_likes_received >= 50 then
    perform public.check_and_award_achievement(v_tasting_owner, 'crowd_pleaser');
  end if;

  if v_likes_received >= 250 then
    perform public.check_and_award_achievement(v_tasting_owner, 'youre_kind_of_a_big_deal');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. after_group_insert_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_group_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    perform public.check_and_award_achievement(new.created_by, 'group_therapist');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. after_group_member_update_achievements
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_group_member_update_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'accepted' and new.status = 'accepted' then
    perform public.check_and_award_achievement(new.user_id, 'squad_goals');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. after_duel_ghost_run_insert_achievements
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
  if new.user_id is null then
    return new;
  end if;

  select count(*)
    into v_run_count
    from public.duel_ghost_runs
   where user_id = new.user_id;

  if v_run_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'first_duel');
  end if;

  v_is_sweep := (
    (new.round_results -> 'round1' ->> 'correct')::boolean = true and
    (new.round_results -> 'round2' ->> 'correct')::boolean = true and
    (new.round_results -> 'round3' ->> 'correct')::boolean = true
  );

  if v_is_sweep then
    perform public.check_and_award_achievement(new.user_id, 'sweep_the_leg');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. after_pour_or_faker_complete_achievements
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
  select count(*)
    into v_prior_count
    from public.xp_events
   where user_id    = new.user_id
     and event_type = 'pour_or_faker_complete'
     and id        <> new.id;

  if v_prior_count = 0 then
    perform public.check_and_award_achievement(new.user_id, 'sacred_pourer');
  end if;

  if new.xp_awarded >= 185 then
    perform public.check_and_award_achievement(new.user_id, 'untouchable');
  end if;

  return new;
exception when others then
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. check_in() — wrap achievement calls in their own exception block
--     so a failing achievement never breaks the check-in response.
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
  select last_checkin_date, streak_days
    into v_last_checkin, v_streak
    from public.user_xp
   where user_id = v_user_id;

  if not found then
    v_last_checkin := null;
    v_streak := 0;
  end if;

  if v_last_checkin = v_today then
    select ux.current_belt into v_new_belt
      from public.user_xp ux
     where user_id = v_user_id;

    return query select 0, v_streak, false, coalesce(v_new_belt, 1);
    return;
  end if;

  if v_last_checkin = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  v_xp_to_award := v_streak;

  select r.promoted, r.new_belt
    into v_promoted, v_new_belt
    from public.award_xp(v_user_id, 'daily_checkin', v_xp_to_award, null) r;

  v_total_xp_awarded := v_xp_to_award;

  if v_streak = 7 then
    select r.promoted, r.new_belt
      into v_promoted, v_new_belt
      from public.award_xp(v_user_id, 'streak_milestone_7', 20, null) r;
    v_total_xp_awarded := v_total_xp_awarded + 20;
  end if;

  if v_streak = 30 then
    select r.promoted, r.new_belt
      into v_promoted, v_new_belt
      from public.award_xp(v_user_id, 'streak_milestone_30', 75, null) r;
    v_total_xp_awarded := v_total_xp_awarded + 75;
  end if;

  update public.user_xp
     set streak_days       = v_streak,
         last_checkin_date = v_today
   where user_id = v_user_id;

  -- Achievement calls isolated: a failure here must not break check-in.
  begin
    perform public.check_and_award_achievement(v_user_id, 'showed_up');

    if v_streak >= 7 then
      perform public.check_and_award_achievement(v_user_id, 'creature_of_habit');
    end if;

    if v_streak >= 30 then
      perform public.check_and_award_achievement(v_user_id, 'disturbingly_consistent');
    end if;
  exception when others then
    null;
  end;

  return query select v_total_xp_awarded, v_streak, v_promoted, v_new_belt;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. award_xp() — wrap belt achievement calls in their own exception block
--     so a failing achievement never breaks XP award or belt promotion.
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

  v_thresholds integer[] := array[0, 200, 600, 1500, 3500, 8000, 16000, 30000, 50000, 80000];
  i            integer;
begin
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (p_user_id, p_xp_amount, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + excluded.total_xp;

  select ux.total_xp, ux.current_belt
    into v_new_xp, v_old_belt
    from public.user_xp ux
   where ux.user_id = p_user_id;

  v_new_belt := 1;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_new_xp >= v_thresholds[i] then
      v_new_belt := i;
    end if;
  end loop;

  v_promoted := v_new_belt > v_old_belt;

  update public.user_xp
     set current_belt = v_new_belt
   where user_id = p_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = p_user_id;

  -- Achievement calls isolated: a failure here must not break XP award.
  if v_promoted and p_event_type <> 'achievement_unlocked' then
    begin
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
    exception when others then
      null;
    end;
  end if;

  insert into public.xp_events (user_id, event_type, xp_awarded, reference_id, promoted, new_belt)
  values (p_user_id, p_event_type, p_xp_amount, p_reference_id, v_promoted, v_new_belt);

  return query select p_xp_amount, v_promoted, v_new_belt;
end;
$$;
