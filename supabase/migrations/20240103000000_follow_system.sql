-- ─────────────────────────────────────────
-- USER FOLLOWS
-- ─────────────────────────────────────────
create table public.user_follows (
  follower_id  uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

alter table public.user_follows enable row level security;

-- Anyone authenticated can view follows (needed for profile pages and counts)
create policy "Follows are viewable by authenticated users"
  on public.user_follows for select
  using (auth.role() = 'authenticated');

-- Users can only follow/unfollow as themselves
create policy "Users manage own follows"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

create policy "Users manage own unfollows"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- Indexes for efficient follower/following list queries
create index user_follows_follower_id_idx on public.user_follows (follower_id);
create index user_follows_following_id_idx on public.user_follows (following_id);
