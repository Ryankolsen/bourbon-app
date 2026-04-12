-- ─────────────────────────────────────────
-- BOURBON COMMENTS
-- ─────────────────────────────────────────
create table public.bourbon_comments (
  id         uuid default gen_random_uuid() primary key,
  bourbon_id uuid references public.bourbons(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  body       text not null check (char_length(body) > 0 and char_length(body) <= 1000),
  created_at timestamptz default now() not null
);

create index bourbon_comments_bourbon_id_idx on public.bourbon_comments(bourbon_id);
create index bourbon_comments_user_id_idx   on public.bourbon_comments(user_id);

alter table public.bourbon_comments enable row level security;

-- Anyone authenticated can read comments
create policy "Comments are viewable by authenticated users"
  on public.bourbon_comments for select
  using (auth.role() = 'authenticated');

-- Users can insert their own comments
create policy "Users can insert own comments"
  on public.bourbon_comments for insert
  with check (auth.uid() = user_id);

-- Users can delete their own comments
create policy "Users can delete own comments"
  on public.bourbon_comments for delete
  using (auth.uid() = user_id);
