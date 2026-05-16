-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements: Social Triggers
--
-- Fires on:
--   • user_follows INSERT  — following-count for follower, follower-count for target
--   • tasting_comments INSERT — comment-count for author
--   • tasting_likes INSERT    — likes-received for tasting owner
--   • groups INSERT           — group_therapist for creator (one-time)
--   • group_members UPDATE    — squad_goals when status transitions to 'accepted'
--
-- All calls go through check_and_award_achievement() — idempotent.
-- "comments" in the issue spec maps to the tasting_comments table (the XP
-- trigger on this table is the established precedent from migration 20240128).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_follows — following-count (actor) + follower-count (target)
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
  -- ── Following count for the user who just followed ──────────────────────────
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

  -- ── Follower count for the user who was just followed ───────────────────────
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
end;
$$;

create trigger user_follows_achievement_trigger
  after insert on public.user_follows
  for each row execute function public.after_user_follows_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. tasting_comments — comment-count for author
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
end;
$$;

create trigger tasting_comment_achievement_trigger
  after insert on public.tasting_comments
  for each row execute function public.after_tasting_comment_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. tasting_likes — likes-received for tasting owner
--
-- new.user_id is the liker; the achievement goes to the tasting owner.
-- Self-likes (tasting owner likes their own tasting) are skipped — RLS
-- currently allows them and the count would be inflated.
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
  -- Resolve the tasting owner
  select user_id
    into v_tasting_owner
    from public.tastings
   where id = new.tasting_id;

  -- Skip if tasting no longer exists or it's a self-like
  if v_tasting_owner is null or v_tasting_owner = new.user_id then
    return new;
  end if;

  -- Count all likes received across all tastings by this owner
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
end;
$$;

create trigger tasting_like_achievement_trigger
  after insert on public.tasting_likes
  for each row execute function public.after_tasting_like_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. groups — group_therapist for creator (one-time)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_group_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- created_by can be null (on delete set null) but a newly created group
  -- always has a creator.
  if new.created_by is not null then
    perform public.check_and_award_achievement(new.created_by, 'group_therapist');
  end if;

  return new;
end;
$$;

create trigger group_insert_achievement_trigger
  after insert on public.groups
  for each row execute function public.after_group_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. group_members — squad_goals when status transitions to 'accepted'
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_group_member_update_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire when the row transitions into 'accepted'
  if old.status <> 'accepted' and new.status = 'accepted' then
    perform public.check_and_award_achievement(new.user_id, 'squad_goals');
  end if;

  return new;
end;
$$;

create trigger group_member_update_achievement_trigger
  after update on public.group_members
  for each row execute function public.after_group_member_update_achievements();
