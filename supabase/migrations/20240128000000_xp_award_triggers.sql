-- ─────────────────────────────────────────────────────────────────────────────
-- Bourbon Dojo: XP Award Triggers
--
-- Wires every XP-earning action to the award_xp DB function via PostgreSQL
-- triggers. All logic is server-side; no client code changes are required.
--
-- Trigger → table mapping:
--   tastings             → tasting_complete (25 XP) + first_tasting_of_bourbon (15 XP)
--   user_collection      → bourbon_added_to_collection (10 XP)
--   user_wishlist        → bourbon_added_to_wishlist (5 XP)
--   group_feed_items     → tasting_shared_to_group (15 XP)
--   groups               → group_created (50 XP)
--   group_members        → group_joined (20 XP) on accepted transition
--   tasting_comments     → comment_posted (10 XP, 5/day cap) + comment_received (5 XP)
--   tasting_likes        → like_received (5 XP) to tasting owner
--   user_follows         → user_followed (5 XP) + follower_gained (10 XP)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. tastings → tasting_complete (25 XP) + first_tasting_of_bourbon (15 XP)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_tasting_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_count integer;
begin
  -- Award 25 XP for logging a tasting
  perform public.award_xp(new.user_id, 'tasting_complete', 25, new.id);

  -- Award 15 XP bonus if this is the user's first tasting of this bourbon
  select count(*) into v_prior_count
  from public.tastings
  where user_id = new.user_id
    and bourbon_id = new.bourbon_id
    and id <> new.id;

  if v_prior_count = 0 then
    perform public.award_xp(new.user_id, 'first_tasting_of_bourbon', 15, new.id);
  end if;

  return new;
end;
$$;

create trigger tastings_award_xp
  after insert on public.tastings
  for each row
  execute function public.xp_on_tasting_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. user_collection → bourbon_added_to_collection (10 XP)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_collection_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_xp(new.user_id, 'bourbon_added_to_collection', 10, new.id);
  return new;
end;
$$;

create trigger user_collection_award_xp
  after insert on public.user_collection
  for each row
  execute function public.xp_on_collection_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. user_wishlist → bourbon_added_to_wishlist (5 XP)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_wishlist_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_xp(new.user_id, 'bourbon_added_to_wishlist', 5, new.id);
  return new;
end;
$$;

create trigger user_wishlist_award_xp
  after insert on public.user_wishlist
  for each row
  execute function public.xp_on_wishlist_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. group_feed_items → tasting_shared_to_group (15 XP) to shared_by_user_id
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_group_feed_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_xp(new.shared_by_user_id, 'tasting_shared_to_group', 15, new.id);
  return new;
end;
$$;

create trigger group_feed_items_award_xp
  after insert on public.group_feed_items
  for each row
  execute function public.xp_on_group_feed_item_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. groups → group_created (50 XP) to created_by
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_group_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    perform public.award_xp(new.created_by, 'group_created', 50, new.id);
  end if;
  return new;
end;
$$;

create trigger groups_award_xp
  after insert on public.groups
  for each row
  execute function public.xp_on_group_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. group_members → group_joined (20 XP)
--    Fires on INSERT with status='accepted' OR UPDATE transitioning to 'accepted'
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_group_member_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (TG_OP = 'INSERT' or old.status <> 'accepted') then
    perform public.award_xp(new.user_id, 'group_joined', 20, new.group_id);
  end if;
  return new;
end;
$$;

create trigger group_members_award_xp_insert
  after insert on public.group_members
  for each row
  execute function public.xp_on_group_member_accepted();

create trigger group_members_award_xp_update
  after update on public.group_members
  for each row
  execute function public.xp_on_group_member_accepted();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. tasting_comments:
--    comment_posted (10 XP) to commenter — capped at 5 per calendar day
--    comment_received (5 XP) to tasting owner (skipped when commenting own tasting)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_tasting_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count  integer;
  v_tasting_owner uuid;
begin
  -- Count comment_posted events already awarded to this user today
  select count(*) into v_today_count
  from public.xp_events
  where user_id   = new.user_id
    and event_type = 'comment_posted'
    and created_at >= date_trunc('day', now() at time zone 'UTC');

  if v_today_count < 5 then
    perform public.award_xp(new.user_id, 'comment_posted', 10, new.id);
  end if;

  -- Award comment_received to the tasting owner, unless they commented on their own tasting
  select user_id into v_tasting_owner
  from public.tastings
  where id = new.tasting_id;

  if v_tasting_owner is not null and v_tasting_owner <> new.user_id then
    perform public.award_xp(v_tasting_owner, 'comment_received', 5, new.id);
  end if;

  return new;
end;
$$;

create trigger tasting_comments_award_xp
  after insert on public.tasting_comments
  for each row
  execute function public.xp_on_tasting_comment_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. tasting_likes → like_received (5 XP) to tasting owner
--    (not awarded to self-likes, which RLS prevents anyway)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_tasting_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tasting_owner uuid;
begin
  select user_id into v_tasting_owner
  from public.tastings
  where id = new.tasting_id;

  if v_tasting_owner is not null and v_tasting_owner <> new.user_id then
    perform public.award_xp(v_tasting_owner, 'like_received', 5, new.tasting_id);
  end if;

  return new;
end;
$$;

create trigger tasting_likes_award_xp
  after insert on public.tasting_likes
  for each row
  execute function public.xp_on_tasting_like_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. user_follows:
--    user_followed (5 XP) to the follower
--    follower_gained (10 XP) to the user being followed
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.xp_on_user_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_xp(new.follower_id,  'user_followed',   5,  new.following_id);
  perform public.award_xp(new.following_id, 'follower_gained', 10, new.follower_id);
  return new;
end;
$$;

create trigger user_follows_award_xp
  after insert on public.user_follows
  for each row
  execute function public.xp_on_user_follow_insert();
