-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements System: Schema Foundation
--
-- Delivers:
--   • achievement_unlocked added to xp_event_type enum
--   • actor_id made nullable on social_notifications (achievement notifications
--     are self-generated, no actor)
--   • achievements table: definition store for all 29 achievements, seeded
--   • user_achievements table: earned achievements per user
--   • RLS policies for both new tables
--   • check_and_award_achievement(p_user_id, p_achievement_key) security-definer
--     function: idempotent award flow
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend xp_event_type enum
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.xp_event_type add value if not exists 'achievement_unlocked';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update social_notifications:
--    a) Make actor_id nullable — achievement notifications have no actor
--    b) Add metadata jsonb column — stores type-specific payload
--       (e.g. achievement title for achievement_unlocked type)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.social_notifications
  alter column actor_id drop not null;

alter table public.social_notifications
  add column if not exists metadata jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. achievements table — definition store
-- ─────────────────────────────────────────────────────────────────────────────

create table public.achievements (
  id                uuid    primary key default gen_random_uuid(),
  key               text    not null unique,
  category          text    not null check (category in ('tasting', 'collection', 'social', 'dojo', 'explorer')),
  tier              text    check (tier in ('new_make', 'bonded', 'single_barrel')),
  title             text    not null,
  description       text    not null,
  xp_award          integer not null check (xp_award > 0),
  trigger_type      text    not null,
  trigger_threshold integer
);

alter table public.achievements enable row level security;

-- Any authenticated user can read achievement definitions
create policy "Authenticated users can read achievements"
  on public.achievements for select
  using (auth.role() = 'authenticated');

-- No direct client mutations; definitions are managed via migrations
create policy "No direct client insert to achievements"
  on public.achievements for insert
  with check (false);

create policy "No direct client update to achievements"
  on public.achievements for update
  using (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed all 29 achievement definitions
-- ─────────────────────────────────────────────────────────────────────────────

-- Tasting category
insert into public.achievements (key, category, tier, title, description, xp_award, trigger_type, trigger_threshold) values
  ('first_impressions',           'tasting', null,            'First Impressions',              'Log your very first tasting.',                             50,  'tasting_count', 1),
  ('freshman_sipper',             'tasting', 'new_make',      'Freshman Sipper',                'Log 1 tasting.',                                           25,  'tasting_count', 1),
  ('seasoned_palate',             'tasting', 'bonded',        'Seasoned Palate',                'Log 10 tastings.',                                         75,  'tasting_count', 10),
  ('tasting_savant',              'tasting', 'single_barrel', 'Tasting Savant',                 'Log 50 tastings.',                                        150,  'tasting_count', 50),
  ('notes_to_self',               'tasting', 'new_make',      'Notes to Self',                  'Write tasting notes on 1 tasting.',                       25,  'notes_count', 1),
  ('wax_poetic',                  'tasting', 'bonded',        'Wax Poetic',                     'Write tasting notes on 20 tastings.',                     75,  'notes_count', 20),
  ('pretentious_in_the_best_way', 'tasting', 'single_barrel', 'Pretentious in the Best Way',   'Write tasting notes on 75 tastings.',                    150,  'notes_count', 75);

-- Collection category
insert into public.achievements (key, category, tier, title, description, xp_award, trigger_type, trigger_threshold) values
  ('one_and_done_nope',                   'collection', 'new_make',      'One and Done? Nope',              'Add 1 bottle to your collection.',               25,  'collection_count', 1),
  ('cabinet_goals',                       'collection', 'bonded',        'Cabinet Goals',                   'Add 10 bottles to your collection.',             75,  'collection_count', 10),
  ('send_help',                           'collection', 'single_barrel', 'Send Help',                       'Add 50 bottles to your collection.',            150,  'collection_count', 50),
  ('the_dreamer',                         'collection', 'new_make',      'The Dreamer',                     'Add 1 bottle to your wishlist.',                 15,  'wishlist_count', 1),
  ('wishful_thinking',                    'collection', 'bonded',        'Wishful Thinking',                'Add 10 bottles to your wishlist.',               50,  'wishlist_count', 10),
  ('champagne_taste_bourbon_budget',      'collection', 'single_barrel', 'Champagne Taste, Bourbon Budget', 'Add 50 bottles to your wishlist.',             100,  'wishlist_count', 50),
  ('hoarder_we_mean_collector',           'collection', null,            'Hoarder (We Mean Collector)',     'Have 25 bottles in your collection simultaneously.', 100, 'collection_size', 25);

-- Social category
insert into public.achievements (key, category, tier, title, description, xp_award, trigger_type, trigger_threshold) values
  ('made_a_friend',                    'social', 'new_make',      'Made a Friend',              'Follow 1 person.',                            15,  'following_count', 1),
  ('social_butterfly',                 'social', 'bonded',        'Social Butterfly',           'Follow 10 people.',                           50,  'following_count', 10),
  ('the_mayor',                        'social', 'single_barrel', 'The Mayor',                  'Follow 50 people.',                          100,  'following_count', 50),
  ('fan_club',                         'social', 'new_make',      'Fan Club',                   'Gain 1 follower.',                            25,  'follower_count', 1),
  ('rising_star',                      'social', 'bonded',        'Rising Star',                'Gain 25 followers.',                          75,  'follower_count', 25),
  ('basically_famous',                 'social', 'single_barrel', 'Basically Famous',           'Gain 100 followers.',                        200,  'follower_count', 100),
  ('chatty_cathy',                     'social', 'new_make',      'Chatty Cathy',               'Post 1 comment.',                             15,  'comment_count', 1),
  ('the_commentator',                  'social', 'bonded',        'The Commentator',            'Post 25 comments.',                           50,  'comment_count', 25),
  ('never_shuts_up',                   'social', 'single_barrel', 'Never Shuts Up',             'Post 100 comments.',                         100,  'comment_count', 100),
  ('appreciated',                      'social', 'new_make',      'Appreciated',                'Receive 1 like.',                             15,  'likes_received', 1),
  ('crowd_pleaser',                    'social', 'bonded',        'Crowd Pleaser',              'Receive 50 likes.',                           75,  'likes_received', 50),
  ('youre_kind_of_a_big_deal',         'social', 'single_barrel', 'You''re Kind of a Big Deal', 'Receive 250 likes.',                        200,  'likes_received', 250),
  ('squad_goals',                      'social', null,            'Squad Goals',                'Join your first group.',                      50,  'group_joined', 1),
  ('group_therapist',                  'social', null,            'Group Therapist',            'Create a group.',                             75,  'group_created', 1);

-- Dojo category
insert into public.achievements (key, category, tier, title, description, xp_award, trigger_type, trigger_threshold) values
  ('showed_up',              'dojo', 'new_make',      'Showed Up',                   'Maintain a 1-day streak.',                         10,  'streak_days', 1),
  ('creature_of_habit',      'dojo', 'bonded',        'Creature of Habit',           'Maintain a 7-day streak.',                         50,  'streak_days', 7),
  ('disturbingly_consistent','dojo', 'single_barrel', 'Disturbingly Consistent',     'Maintain a 30-day streak.',                       150,  'streak_days', 30),
  ('white_belt_energy',      'dojo', null,            'White Belt Energy',           'Reach belt 2 (Corn Whiskey).',                     50,  'belt_level', 2),
  ('getting_serious',        'dojo', null,            'Getting Serious',             'Reach belt 5 (Single Barrel).',                   100,  'belt_level', 5),
  ('senpai_status',          'dojo', null,            'Senpai Status',               'Reach belt 7 (Barrel Proof).',                    200,  'belt_level', 7),
  ('the_legend',             'dojo', null,            'The Legend',                  'Reach belt 10 (Pappy).',                          500,  'belt_level', 10),
  ('first_duel',             'dojo', null,            'First Duel',                  'Complete your first Dojo Duel.',                   50,  'dojo_duel_complete', 1),
  ('sweep_the_leg',          'dojo', null,            'Sweep the Leg',               'Win a Dojo Duel with a perfect sweep.',           150,  'dojo_duel_sweep', 1),
  ('sacred_pourer',          'dojo', null,            'Sacred Pourer',               'Complete your first Sacred Pour.',                 50,  'sacred_pour_complete', 1),
  ('untouchable',            'dojo', null,            'Untouchable',                 'Perfect Sacred Pour on first attempt.',           150,  'sacred_pour_perfect', 1);

-- Explorer category
insert into public.achievements (key, category, tier, title, description, xp_award, trigger_type, trigger_threshold) values
  ('branching_out',                'explorer', 'new_make',      'Branching Out',                'Try bourbons from 3 different distilleries.',    25,  'distillery_count', 3),
  ('passport_sipper',              'explorer', 'bonded',        'Passport Sipper',              'Try bourbons from 10 different distilleries.',   75,  'distillery_count', 10),
  ('gone_native',                  'explorer', 'single_barrel', 'Gone Native',                  'Try bourbons from 25 different distilleries.',  150,  'distillery_count', 25),
  ('rye_curious',                  'explorer', null,            'Rye Curious',                  'Log your first rye whiskey.',                    50,  'rye_tasting', 1),
  ('wheated_wonder',               'explorer', null,            'Wheated Wonder',               'Log your first wheated bourbon.',                50,  'wheated_tasting', 1),
  ('single_barrel_snob',           'explorer', null,            'Single Barrel Snob',           'Log 10 single barrel expressions.',             100,  'single_barrel_count', 10),
  ('old_money',                    'explorer', null,            'Old Money',                    'Log a bourbon aged 15+ years.',                 100,  'aged_15_plus', 1),
  ('barrel_proof_or_bust',         'explorer', null,            'Barrel Proof or Bust',         'Log a cask-strength bourbon.',                   75,  'cask_strength', 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. user_achievements table — earned achievements per user
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_achievements (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  achievement_id uuid        not null references public.achievements(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

-- Any authenticated user can read any user's earned achievements (needed for visitor profile)
create policy "Authenticated users can read any user_achievements"
  on public.user_achievements for select
  using (auth.role() = 'authenticated');

-- No direct client mutations; all writes go through check_and_award_achievement
create policy "No direct client insert to user_achievements"
  on public.user_achievements for insert
  with check (false);

create index user_achievements_user_id_idx on public.user_achievements (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. check_and_award_achievement(p_user_id, p_achievement_key) function
--
-- Idempotent: second call with same (user, key) returns awarded=false and
-- awards no XP. First call:
--   1. Inserts user_achievements row
--   2. Calls award_xp() with achievement_unlocked event type
--   3. Inserts a social_notifications row (no actor — self-generated)
--
-- Returns: (awarded boolean, xp_awarded int)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.check_and_award_achievement(
  p_user_id        uuid,
  p_achievement_key text
)
returns table (awarded boolean, xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement   record;
  v_already_earned boolean;
begin
  -- Fetch achievement definition
  select id, xp_award, title
    into v_achievement
    from public.achievements
   where key = p_achievement_key;

  if not found then
    raise exception 'Unknown achievement key: %', p_achievement_key;
  end if;

  -- Idempotency check
  select exists (
    select 1 from public.user_achievements
     where user_id = p_user_id
       and achievement_id = v_achievement.id
  ) into v_already_earned;

  if v_already_earned then
    return query select false, 0;
    return;
  end if;

  -- Insert earned record
  insert into public.user_achievements (user_id, achievement_id)
  values (p_user_id, v_achievement.id);

  -- Award XP
  perform public.award_xp(p_user_id, 'achievement_unlocked', v_achievement.xp_award, v_achievement.id);

  -- Insert self-generated notification (no actor_id); metadata carries the title
  insert into public.social_notifications (recipient_id, actor_id, type, metadata)
  values (p_user_id, null, 'achievement_unlocked', jsonb_build_object('title', v_achievement.title));

  return query select true, v_achievement.xp_award;
end;
$$;

-- Grant execute to authenticated users only
grant execute on function public.check_and_award_achievement(uuid, text) to authenticated;
revoke execute on function public.check_and_award_achievement(uuid, text) from anon;
