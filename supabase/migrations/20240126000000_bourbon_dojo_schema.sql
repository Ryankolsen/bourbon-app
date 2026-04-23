-- ─────────────────────────────────────────────────────────────────────────────
-- Bourbon Dojo: XP & Belt Gamification — DB Foundation
--
-- Delivers:
--   • xp_event_type enum
--   • user_xp table (one row per user)
--   • xp_events table (append-only audit log)
--   • profiles.current_belt column (denormalised for cheap feed/comment queries)
--   • RLS policies for both new tables
--   • award_xp(p_user_id, p_event_type, p_xp_amount, p_reference_id) function
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. xp_event_type enum
-- ─────────────────────────────────────────────────────────────────────────────

create type public.xp_event_type as enum (
  'tasting_complete',
  'bourbon_rated',
  'first_tasting_of_bourbon',
  'bourbon_added_to_collection',
  'bourbon_added_to_wishlist',
  'tasting_shared_to_group',
  'comment_posted',
  'comment_received',
  'like_received',
  'user_followed',
  'follower_gained',
  'group_created',
  'group_joined',
  'daily_checkin',
  'streak_milestone_7',
  'streak_milestone_30'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. user_xp table — one row per user, tracks accumulated state
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_xp (
  user_id          uuid        primary key references public.profiles(id) on delete cascade,
  total_xp         integer     not null default 0,
  current_belt     integer     not null default 1 check (current_belt between 1 and 10),
  streak_days      integer     not null default 0,
  last_checkin_date date
);

alter table public.user_xp enable row level security;

-- Users can read their own row
create policy "Users can read own user_xp"
  on public.user_xp for select
  using (auth.uid() = user_id);

-- All authenticated users can read others' XP (for profile display)
create policy "Authenticated users can read any user_xp"
  on public.user_xp for select
  using (auth.role() = 'authenticated');

-- No direct client writes — all mutations go through award_xp (security definer)
create policy "No direct client insert to user_xp"
  on public.user_xp for insert
  with check (false);

create policy "No direct client update to user_xp"
  on public.user_xp for update
  using (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. xp_events table — append-only audit log of every XP award
-- ─────────────────────────────────────────────────────────────────────────────

create table public.xp_events (
  id           uuid                   primary key default gen_random_uuid(),
  user_id      uuid                   not null references public.profiles(id) on delete cascade,
  event_type   public.xp_event_type   not null,
  xp_awarded   integer                not null,
  reference_id uuid,
  created_at   timestamptz            not null default now()
);

alter table public.xp_events enable row level security;

-- Users can read their own event history
create policy "Users can read own xp_events"
  on public.xp_events for select
  using (auth.uid() = user_id);

-- No direct client writes
create policy "No direct client insert to xp_events"
  on public.xp_events for insert
  with check (false);

create index xp_events_user_id_idx   on public.xp_events (user_id);
create index xp_events_created_at_idx on public.xp_events (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add current_belt to profiles (denormalised for cheap joins)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists current_belt integer not null default 1
    check (current_belt between 1 and 10);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. award_xp function
--
-- Called by all XP-earning triggers. Inserts into xp_events, upserts user_xp,
-- syncs profiles.current_belt, and returns promotion info.
--
-- Returns: (xp_awarded int, promoted bool, new_belt int)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.award_xp(
  p_user_id    uuid,
  p_event_type public.xp_event_type,
  p_xp_amount  integer,
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
  -- 1. Append event log
  insert into public.xp_events (user_id, event_type, xp_awarded, reference_id)
  values (p_user_id, p_event_type, p_xp_amount, p_reference_id);

  -- 2. Upsert user_xp; capture old belt before update
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (p_user_id, p_xp_amount, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + excluded.total_xp;

  -- 3. Compute new belt from updated total_xp
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

  -- 4. Sync belt back to user_xp and profiles
  update public.user_xp
     set current_belt = v_new_belt
   where user_id = p_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = p_user_id;

  -- 5. Return result
  return query select p_xp_amount, v_promoted, v_new_belt;
end;
$$;
