-- ─────────────────────────────────────────────────────────────────────────────
-- tasting_likes
--
-- Records a user liking a tasting. Composite PK prevents duplicate likes.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.tasting_likes (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  tasting_id uuid        not null references public.tastings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tasting_id)
);

alter table public.tasting_likes enable row level security;

create policy "Authenticated users can view all tasting likes"
  on public.tasting_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can like tastings"
  on public.tasting_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike tastings"
  on public.tasting_likes for delete
  using (auth.uid() = user_id);

create index tasting_likes_tasting_id_idx on public.tasting_likes (tasting_id);
create index tasting_likes_user_id_idx    on public.tasting_likes (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- tasting_comments
--
-- Flat comment thread on a tasting.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.tasting_comments (
  id         uuid        primary key default gen_random_uuid(),
  tasting_id uuid        not null references public.tastings(id)  on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

alter table public.tasting_comments enable row level security;

create policy "Authenticated users can view all tasting comments"
  on public.tasting_comments for select
  using (auth.role() = 'authenticated');

create policy "Users can post tasting comments"
  on public.tasting_comments for insert
  with check (auth.uid() = user_id);

create index tasting_comments_tasting_id_idx on public.tasting_comments (tasting_id);
create index tasting_comments_user_id_idx    on public.tasting_comments (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- group_feed_items
--
-- A tasting shared into a group. RLS restricts visibility and insert to
-- group members only (checked via the group_members table).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.group_feed_items (
  id               uuid        primary key default gen_random_uuid(),
  group_id         uuid        not null references public.groups(id)   on delete cascade,
  tasting_id       uuid        not null references public.tastings(id)  on delete cascade,
  shared_by_user_id uuid       not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now()
);

alter table public.group_feed_items enable row level security;

-- Only group members can view feed items for their groups
create policy "Group members can view group feed items"
  on public.group_feed_items for select
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_feed_items.group_id
        and gm.user_id  = auth.uid()
        and gm.status   = 'accepted'
    )
  );

-- Only group members can share into a group
create policy "Group members can share to group feed"
  on public.group_feed_items for insert
  with check (
    auth.uid() = shared_by_user_id
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_feed_items.group_id
        and gm.user_id  = auth.uid()
        and gm.status   = 'accepted'
    )
  );

create index group_feed_items_group_id_idx   on public.group_feed_items (group_id);
create index group_feed_items_tasting_id_idx on public.group_feed_items (tasting_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- social_notifications
--
-- In-app notifications for social events (new_tasting, new_follower).
-- Rows are soft-dismissed via dismissed_at rather than deleted.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.social_notifications (
  id           uuid        primary key default gen_random_uuid(),
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  actor_id     uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null,
  tasting_id   uuid        references public.tastings(id) on delete cascade,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz
);

alter table public.social_notifications enable row level security;

-- Recipients can read their own notifications
create policy "Recipients can view their notifications"
  on public.social_notifications for select
  using (recipient_id = auth.uid());

-- Recipients can dismiss (update dismissed_at) their own notifications
create policy "Recipients can dismiss their notifications"
  on public.social_notifications for update
  using (recipient_id = auth.uid());

-- Only trigger functions (security definer) can insert; no direct client insert
create policy "No direct client insert"
  on public.social_notifications for insert
  with check (false);

create index social_notifications_recipient_id_idx
  on public.social_notifications (recipient_id)
  where dismissed_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: notify followers when a new tasting is posted
--
-- Fires AFTER INSERT on tastings.
-- For each follower of the tasting author, inserts a new_tasting notification.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.notify_followers_on_new_tasting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower record;
begin
  for v_follower in
    select follower_id
    from public.user_follows
    where following_id = new.user_id
  loop
    insert into public.social_notifications (recipient_id, actor_id, type, tasting_id)
    values (v_follower.follower_id, new.user_id, 'new_tasting', new.id);
  end loop;

  return new;
end;
$$;

create trigger tastings_notify_followers
  after insert on public.tastings
  for each row
  execute function public.notify_followers_on_new_tasting();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: notify a user when they gain a new follower
--
-- Fires AFTER INSERT on user_follows.
-- Inserts a new_follower notification for the followed user.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.notify_on_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'new_follower');

  return new;
end;
$$;

create trigger user_follows_notify_followed
  after insert on public.user_follows
  for each row
  execute function public.notify_on_new_follower();
