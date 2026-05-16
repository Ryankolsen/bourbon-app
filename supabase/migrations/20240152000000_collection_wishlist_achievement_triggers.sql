-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements: Collection & Wishlist Triggers
--
-- Fires after INSERT on user_collection and user_wishlist. Counts total rows
-- for the user and calls check_and_award_achievement() for each qualifying key.
-- All award calls are idempotent — safe to run even if already granted.
--
-- Note: tables are user_collection / user_wishlist (not user_collections /
-- wishlists). No soft-delete — simultaneous count equals total count.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Collection trigger
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
  -- Count all current rows for this user (INSERT already visible to trigger)
  select count(*)
    into v_collection_count
    from public.user_collection
   where user_id = new.user_id;

  -- ── Tier achievements ───────────────────────────────────────────────────────
  if v_collection_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'one_and_done_nope');
  end if;

  if v_collection_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'cabinet_goals');
  end if;

  if v_collection_count >= 50 then
    perform public.check_and_award_achievement(new.user_id, 'send_help');
  end if;

  -- ── Hoarder (We Mean Collector) — 25 simultaneous bottles ──────────────────
  if v_collection_count >= 25 then
    perform public.check_and_award_achievement(new.user_id, 'hoarder_we_mean_collector');
  end if;

  return new;
end;
$$;

create trigger collection_achievement_trigger
  after insert on public.user_collection
  for each row execute function public.after_collection_insert_achievements();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Wishlist trigger
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

  -- ── Tier achievements ───────────────────────────────────────────────────────
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
end;
$$;

create trigger wishlist_achievement_trigger
  after insert on public.user_wishlist
  for each row execute function public.after_wishlist_insert_achievements();
